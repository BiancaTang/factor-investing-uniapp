<template>
	<view class="display-page">
		<!-- 粒子特效层 -->
		<canvas ref="particleCanvas" class="particle-layer" :style="canvasStyle" />

		<!-- 主内容区 -->
		<view class="display-content">
			<f-skill-broadcast-banner
				v-if="skillBroadcastLogDisplay.length"
				class="display-skill-strip"
				:log="skillBroadcastLogDisplay"
				variant="display"
			/>
			<view class="display-stage">
				<!-- Act 0: 候场大厅 -->
				<LobbyScreen
					v-if="state.currentPhase === 'lobby'"
					:room-name="state.roomName"
					:players="state.players"
					:max-players="state.maxPlayers"
				/>

				<!-- Act 1: 决策倒计时 -->
				<DecisionScreen
					v-else-if="state.currentPhase === 'decision'"
					:round-index="state.currentRoundIndex"
					:time-left="state.timeLeft"
					:players="state.players"
					:group-exposure="state.groupExposure"
					:submitted-count="state.submittedCount"
					:total-players="state.totalPlayers"
					:market-snapshot="state.roundMarketSnapshot"
					:market-open-round="state.roundMarketEventRound"
				/>

				<!-- Act 2: 事件降临 -->
				<EventScreen
					v-else-if="state.currentPhase === 'event'"
					:event="state.currentEvent"
				/>

				<!-- Act 3: 结算演出 -->
				<SettlementScreen
					v-else-if="state.currentPhase === 'settlement'"
					:round-index="state.currentRoundIndex"
					:players="state.players"
					:skill-log="state.skillLog"
				/>

				<!-- Act 4: 回合复盘 -->
				<ReviewScreen
					v-else-if="state.currentPhase === 'review'"
					:round-index="state.currentRoundIndex"
					:group-exposure="state.groupExposure"
					:event="state.currentEvent"
					:skill-log="state.skillLog"
					:round-history="state.roundHistory"
					:players="state.players"
				/>

				<!-- Act 5: 终局盛典 -->
				<FinaleScreen
					v-else-if="state.currentPhase === 'finale'"
					:players="state.players"
					:round-history="state.roundHistory"
				/>
			</view>

			<!-- 仅在本轮结束后（候场/终局）显示入口；决策中不占屏 -->
			<view v-if="showChartDock" class="display-chart-dock">
				<view class="dock-row">
					<text class="dock-label">回合复盘</text>
					<view class="dock-actions">
						<button type="button" class="dock-btn" @click="openChartLightbox('nav')">
							净值对比
						</button>
						<button type="button" class="dock-btn" @click="openChartLightbox('factor')">
							因子累积收益
						</button>
					</view>
				</view>
				<text class="dock-hint">管理员已结束本轮后可用 · 点击展开大图</text>
			</view>
		</view>

		<!-- 全屏查看单张图，便于投屏分析 -->
		<view
			v-if="lightboxChart"
			class="chart-lightbox"
			@click="closeChartLightbox"
		>
			<view class="chart-lightbox-panel" @click.stop>
				<view class="chart-lightbox-head">
					<text class="chart-lightbox-title">{{ lightboxTitle }}</text>
					<button type="button" class="chart-lightbox-close" @click="closeChartLightbox">关闭</button>
				</view>
				<view class="chart-lightbox-body">
					<FGameCharts
						v-if="lightboxChart === 'nav'"
						key="lb-nav"
						:history="[]"
						:nav-chart-data="compareNavChartData"
						nav-chart-title="玩家净值对比（已提交玩家）"
						only-nav
						:if-banker="!!state.ifBanker"
						:f-group-count="displayGroupCount"
						:room-admin-uid="state.roomAdminUid || ''"
						:simulation-players="simulationPlayersForCharts"
						:attribution-player-id="displayAttributionPlayerId"
						:round-event-factor-multipliers-by-round="displayRoundEventFactorMultipliersByRound"
						:chart-inner-height-px="lightboxChartInnerPx"
					/>
					<FGameCharts
						v-else-if="lightboxChart === 'factor'"
						key="lb-fc"
						:history="[]"
						display-mode="factorOnly"
						:if-banker="!!state.ifBanker"
						:f-group-count="displayGroupCount"
						:room-admin-uid="state.roomAdminUid || ''"
						:simulation-players="simulationPlayersForCharts"
						:attribution-player-id="displayAttributionPlayerId"
						:round-event-factor-multipliers-by-round="displayRoundEventFactorMultipliersByRound"
						:chart-inner-height-px="lightboxChartInnerPx"
					/>
				</view>
			</view>
		</view>

		<!-- 底部状态栏 -->
		<view class="display-footer">
			<text class="footer-room">房间 {{ state.roomId }}</text>
			<text class="footer-round">R{{ state.currentRoundIndex }}/{{ state.maxRounds }}</text>
			<text class="footer-phase">{{ phaseLabel }}</text>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ParticleSystem } from '@/utils/f_displayEngine.js'
import { f_buildJointNavCompareChartData } from '@/utils/f_factorEngine.js'
import { f_roundEventFactorMultipliersByRoundFromRoomMap } from '@/utils/f_roundRandomEventMultipliers.js'
import FGameCharts from '@/components/f-game-charts/f-game-charts.vue'
import FSkillBroadcastBanner from '@/components/f-skill-broadcast-banner/f-skill-broadcast-banner.vue'

import LobbyScreen from './lobby.vue'
import DecisionScreen from './decision.vue'
import EventScreen from './event.vue'
import SettlementScreen from './settlement.vue'
import ReviewScreen from './review.vue'
import FinaleScreen from './finale.vue'

/** 4 位房间号，来自路由参数 roomId / code（与 f_room.f_room_code 一致） */
const roomCode = ref('')

onLoad((options) => {
	const q = options && (options.roomId || options.code || options.room)
	roomCode.value = String(q || '')
		.replace(/\D/g, '')
		.slice(0, 4)
	if (!/^\d{4}$/.test(roomCode.value)) {
		uni.showToast({ title: '请使用 ?roomId=四位房间号 打开大屏', icon: 'none', duration: 2800 })
	}
	tryStartPolling()
})

// 大屏状态
const state = ref({
	roomId: '',
	roomName: '',
	maxPlayers: 20,
	currentPhase: 'lobby',
	currentRoundIndex: 0,
	maxRounds: 8,
	timeLeft: 0,
	players: [],
	submittedCount: 0,
	totalPlayers: 0,
	groupExposure: {},
	currentEvent: null,
	skillLog: [],
	roundHistory: [],
	ifBanker: false,
	fGroupCount: 20,
	roomAdminUid: '',
	simulationPlayers: [],
	chartsReviewUnlocked: false,
	joinLocked: false,
	playingStarted: false,
	randomEventsByRound: {},
	timestamp: 0,
	roundMarketSnapshot: null,
	roundMarketEventRound: 0,
	skillBroadcastSeq: 0,
	skillBroadcast: null,
	skillBroadcastLog: []
})

/** 弹层内图表高度（px），随窗口变化 */
const lightboxChartInnerPx = ref(420)

const lightboxChart = ref(null)

function openChartLightbox(kind) {
	lightboxChart.value = kind === 'factor' ? 'factor' : 'nav'
}

function closeChartLightbox() {
	lightboxChart.value = null
}

const lightboxTitle = computed(() =>
	lightboxChart.value === 'factor' ? '因子收益率曲线（累积）' : '玩家净值对比（已提交玩家）'
)

const simulationPlayersForCharts = computed(() => {
	const raw = state.value.simulationPlayers
	if (!Array.isArray(raw)) return []
	return raw.map((p) => ({
		player_id: p.player_id != null ? String(p.player_id) : '',
		label: p.label != null ? String(p.label) : '',
		history: Array.isArray(p.history) ? p.history : []
	}))
})

const playersWithChartHistory = computed(() =>
	simulationPlayersForCharts.value.filter((p) => p.history && p.history.length > 0)
)

/** 管理员已结束本轮（openRound=0）且库中有历史轮次；决策中不展示 */
const showChartDock = computed(
	() => !!state.value.chartsReviewUnlocked && playersWithChartHistory.value.length > 0
)

watch(
	() => state.value.chartsReviewUnlocked,
	(v) => {
		if (!v) closeChartLightbox()
	}
)

const displayGroupCount = computed(() => {
	const g = state.value.fGroupCount
	const n = typeof g === 'number' ? g : parseInt(g, 10)
	return Number.isFinite(n) && n >= 1 ? n : 20
})

const displayAttributionPlayerId = computed(() => {
	const list = playersWithChartHistory.value
	if (!list.length) return ''
	return String(list[0].player_id || '')
})

const displayRoundEventFactorMultipliersByRound = computed(() =>
	f_roundEventFactorMultipliersByRoundFromRoomMap(state.value.randomEventsByRound || {})
)

const compareNavChartData = computed(() => {
	const list = playersWithChartHistory.value
	if (list.length < 2) return null
	return f_buildJointNavCompareChartData(
		list.map((p) => ({
			player_id: p.player_id,
			history: p.history,
			label: p.label || p.player_id
		})),
		{
			if_banker: !!state.value.ifBanker,
			f_group_count: displayGroupCount.value,
			f_admin_uid: state.value.roomAdminUid || '',
			roundEventFactorMultipliersByRound: displayRoundEventFactorMultipliersByRound.value
		}
	)
})

const phaseLabel = computed(() => ({
	lobby: '候场中',
	decision: '决策中',
	event: '事件降临',
	settlement: '结算中',
	review: '复盘',
	finale: '终局盛典'
}[state.value.currentPhase] || '等待'))

const skillBroadcastLogDisplay = computed(() => {
	const raw = state.value.skillBroadcastLog
	if (Array.isArray(raw) && raw.length) return raw
	const b = state.value.skillBroadcast
	if (b && Array.isArray(b.lines) && b.lines.length) return [b]
	return []
})

// 粒子系统
const particleCanvas = ref(null)
const particleSystem = ref(null)
const canvasStyle = ref({})

// 轮询控制
let pollTimer = null
let isAnimating = false
/** 首轮拉取不弹技能 toast（避免进屏即刷历史播报） */
let displaySkillBroadcastPrimed = false
/** 上一轮询的「已锁定加入」，用于上升沿检测后跳转选角展示页 */
let prevJoinLockedPoll = false
/** 上一轮询是否已开始博弈（用于从选角展示回到主大屏候场） */
let prevPlayingStartedPoll = false

function f_redirectDisplayToMainLobby() {
	const rc = roomCode.value
	if (!/^\d{4}$/.test(rc)) return
	try {
		const pages = getCurrentPages()
		const cur = pages.length ? pages[pages.length - 1] : null
		const route = cur && cur.route ? String(cur.route) : ''
		if (route.includes('role-showcase') || route.includes('role-select')) {
			uni.redirectTo({ url: '/pages/f_display/index?roomId=' + encodeURIComponent(rc) })
		}
	} catch (_) {
		uni.redirectTo({ url: '/pages/f_display/index?roomId=' + encodeURIComponent(rc) })
	}
}

const POLL_INTERVAL = {
	lobby: 3000,
	decision: 1000,
	event: 5000,    // 动画期间长轮询
	settlement: 5000,
	review: 3000,
	finale: 5000
}

// 数据获取
async function fetchDisplayState() {
	if (isAnimating) return // 动画期间跳过
	if (!/^\d{4}$/.test(roomCode.value)) {
		return
	}

	try {
		const res = await uniCloud.callFunction({
			name: 'f_sync_display_state',
			data: { f_room_code: roomCode.value }
		})

		if (res.result?.code !== 0) {
			console.warn('大屏同步失败:', res.result?.message)
			return
		}

		const newData = res.result.data
		const oldPhase = state.value.currentPhase
		const oldPlayers = state.value.players
		const prevSkillSeq = state.value.skillBroadcastSeq || 0

		const joinLocked = !!newData.joinLocked
		const playingStarted = !!newData.playingStarted
		if (joinLocked && !playingStarted && !prevJoinLockedPoll) {
			const rc = roomCode.value
			if (/^\d{4}$/.test(rc)) {
				uni.navigateTo({
					url: '/pages/f_display/role-showcase?code=' + encodeURIComponent(rc)
				})
			}
		}
		prevJoinLockedPoll = joinLocked

		if (playingStarted && !prevPlayingStartedPoll) {
			f_redirectDisplayToMainLobby()
		}
		prevPlayingStartedPoll = playingStarted

		// 检测阶段变化
		if (newData.currentPhase !== oldPhase) {
			handlePhaseChange(newData.currentPhase, oldPhase)
		}

		// 检测玩家排名/净值变化（结算阶段）
		if (newData.currentPhase === 'settlement') {
			detectPlayerChanges(oldPlayers, newData.players)
		}

		const newSkillSeq = parseInt(newData.skillBroadcastSeq, 10) || 0
		if (
			displaySkillBroadcastPrimed &&
			Number.isFinite(newSkillSeq) &&
			newSkillSeq > prevSkillSeq &&
			newData.skillBroadcast &&
			Array.isArray(newData.skillBroadcast.lines)
		) {
			for (const line of newData.skillBroadcast.lines) {
				showSkillDanmaku({ f_skill_name: line, f_char_name: '技能播报' })
			}
		}
		displaySkillBroadcastPrimed = true

		state.value = newData
	} catch (err) {
		console.error('大屏轮询异常:', err)
	}
}

// 阶段切换处理
function handlePhaseChange(newPhase, oldPhase) {
	isAnimating = true

	// 不同阶段的入场动画
	switch (newPhase) {
		case 'event':
			// 事件降临：金色闪光
			particleSystem.value?.burst(
				window.innerWidth / 2,
				window.innerHeight / 2,
				'#d4af37',
				80
			)
			break
		case 'settlement':
			// 结算：各玩家位置粒子
			setTimeout(() => isAnimating = false, 2000)
			return // settlement 有自己的动画时序
		case 'finale':
			// 终局：粒子雨
			startFinaleParticles()
			break
	}

	setTimeout(() => isAnimating = false, 1500)
}

// 检测玩家变化（用于结算动画）
function detectPlayerChanges(oldPlayers, newPlayers) {
	newPlayers.forEach(np => {
		const op = oldPlayers.find(p => p.uid === np.uid)
		if (!op) return

		const navChange = Number(np.nav) - Number(op.nav)
		if (Math.abs(navChange) > 0.001) {
			// 根据排名位置计算粒子发射点（简化：屏幕中央）
			const color = navChange > 0 ? '#4caf50' : '#f44336'
			particleSystem.value?.burst(
				window.innerWidth / 2 + (Math.random() - 0.5) * 200,
				window.innerHeight / 2 + (Math.random() - 0.5) * 100,
				color,
				navChange > 0 ? 40 : 25
			)
		}
	})
}

// 技能播报（与 f_room.f_skill_broadcast 同步）
function showSkillDanmaku(skill) {
	const msg = skill.f_skill_name || '技能'
	const short = msg.length > 36 ? msg.slice(0, 36) + '…' : msg
	uni.showToast({ title: short, icon: 'none', duration: 3600 })
	if (typeof window !== 'undefined' && particleSystem.value) {
		particleSystem.value.burst(window.innerWidth / 2, window.innerHeight * 0.12, '#d4af37', 32)
	}
}

// 终局粒子雨
function startFinaleParticles() {
	const colors = ['#d4af37', '#4caf50', '#2196f3', '#e91e63', '#ff9800']
	let count = 0
	const interval = setInterval(() => {
		const x = Math.random() * window.innerWidth
		particleSystem.value?.burst(x, -20, colors[count % colors.length], 20)
		count++
		if (count > 30) clearInterval(interval)
	}, 200)
}

// 启动轮询
let pollStarted = false
function tryStartPolling() {
	if (pollStarted) return
	if (!/^\d{4}$/.test(roomCode.value)) return
	pollStarted = true
	startPolling()
}

function startPolling() {
	fetchDisplayState() // 立即执行一次
	const interval = () => POLL_INTERVAL[state.value.currentPhase] || 3000

	function tick() {
		fetchDisplayState()
		pollTimer = setTimeout(tick, interval())
	}
	pollTimer = setTimeout(tick, interval())
}

function stopPolling() {
	if (pollTimer) {
		clearTimeout(pollTimer)
		pollTimer = null
	}
}

let chartResizeHandler = null

// 初始化
onMounted(() => {
	// 初始化粒子系统
	if (particleCanvas.value) {
		particleSystem.value = new ParticleSystem(particleCanvas.value)
		particleSystem.value.start()
	}

	// 全屏适配（H5）
	if (typeof window !== 'undefined') {
		canvasStyle.value = {
			width: window.innerWidth + 'px',
			height: window.innerHeight + 'px'
		}
		chartResizeHandler = () => {
			const h = window.innerHeight
			lightboxChartInnerPx.value = Math.min(720, Math.max(360, Math.floor(h * 0.58)))
		}
		chartResizeHandler()
		window.addEventListener('resize', chartResizeHandler)
	}

	tryStartPolling()
})

onUnmounted(() => {
	if (typeof window !== 'undefined' && chartResizeHandler) {
		window.removeEventListener('resize', chartResizeHandler)
		chartResizeHandler = null
	}
	stopPolling()
	particleSystem.value?.stop()
})
</script>

<style scoped>
/* === 高维神权 · 黑金主调 === */
.display-page {
	width: 100vw;
	height: 100vh;
	background: #050505;
	color: #e8e4dc;
	overflow: hidden;
	position: relative;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif;
}

.particle-layer {
	position: fixed;
	top: 0;
	left: 0;
	pointer-events: none;
	z-index: 100;
}

.display-content {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: calc(100% - 48px);
	position: relative;
	z-index: 10;
	overflow-x: hidden;
	overflow-y: auto;
}

.display-skill-strip {
	flex-shrink: 0;
	width: calc(100% - 32px);
	max-width: 960px;
	margin: 10px auto 0;
	z-index: 20;
}

.display-stage {
	flex: 1;
	min-height: 0;
	position: relative;
}

.display-chart-dock {
	flex-shrink: 0;
	padding: 8px 20px 10px;
	border-top: 1px solid rgba(201, 168, 76, 0.22);
	background: rgba(8, 7, 4, 0.88);
}

.dock-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	flex-wrap: wrap;
}

.dock-label {
	font-size: 12px;
	letter-spacing: 0.28em;
	color: rgba(201, 168, 76, 0.75);
	white-space: nowrap;
}

.dock-actions {
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
}

.dock-btn {
	margin: 0;
	padding: 8px 18px;
	font-size: 13px;
	color: #f0e6c8;
	background: rgba(32, 28, 18, 0.95);
	border: 1px solid rgba(201, 168, 76, 0.42);
	border-radius: 999px;
	cursor: pointer;
	letter-spacing: 0.06em;
	transition: background 0.15s ease, border-color 0.15s ease;
}

.dock-btn:hover {
	background: rgba(48, 42, 26, 0.98);
	border-color: rgba(212, 175, 55, 0.65);
}

.dock-hint {
	display: block;
	margin-top: 6px;
	font-size: 11px;
	color: rgba(160, 150, 130, 0.75);
	letter-spacing: 0.04em;
}

.chart-lightbox {
	position: fixed;
	inset: 0;
	z-index: 220;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px 20px 56px;
	background: rgba(0, 0, 0, 0.78);
	backdrop-filter: blur(6px);
}

.chart-lightbox-panel {
	width: min(1120px, 96vw);
	max-height: calc(100vh - 80px);
	display: flex;
	flex-direction: column;
	border-radius: 14px;
	border: 1px solid rgba(201, 168, 76, 0.35);
	background: linear-gradient(165deg, #12100a 0%, #070605 100%);
	box-shadow: 0 24px 80px rgba(0, 0, 0, 0.65);
	overflow: hidden;
}

.chart-lightbox-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 16px;
	border-bottom: 1px solid rgba(201, 168, 76, 0.18);
}

.chart-lightbox-title {
	font-size: 15px;
	font-weight: 500;
	color: #e8d9a8;
	letter-spacing: 0.04em;
}

.chart-lightbox-close {
	margin: 0;
	padding: 6px 14px;
	font-size: 12px;
	color: #c9a84c;
	background: transparent;
	border: 1px solid rgba(201, 168, 76, 0.35);
	border-radius: 8px;
	cursor: pointer;
}

.chart-lightbox-close:hover {
	border-color: rgba(201, 168, 76, 0.55);
	color: #e8d9a8;
}

.chart-lightbox-body {
	padding: 12px 14px 16px;
	overflow: auto;
	min-height: 0;
}

.chart-lightbox-body :deep(.charts) {
	margin-top: 0;
}

.chart-lightbox-body :deep(.block) {
	margin-bottom: 0;
}

.chart-lightbox-body :deep(.sub) {
	font-size: 14px;
	color: #dcc58a;
	margin-bottom: 8px;
}

.display-footer {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 48px;
	background: rgba(5, 5, 5, 0.85);
	border-top: 1px solid rgba(201, 168, 76, 0.15);
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 32px;
	z-index: 50;
	backdrop-filter: blur(4px);
}

.footer-room {
	font-size: 12px;
	color: #555;
	letter-spacing: 2px;
}

.footer-round {
	font-size: 14px;
	font-weight: 500;
	color: #c9a84c;
	letter-spacing: 2px;
}

.footer-phase {
	font-size: 12px;
	color: #666;
	letter-spacing: 2px;
}
</style>