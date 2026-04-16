<template>
	<view class="page">
		<view class="head">
			<text class="room">房间 {{ roomCode || '-' }}</text>
			<text class="meta">共 {{ totalRounds }} 轮 · 开放轮次 {{ openRoundLabel }} · 剩余 {{ roundCountdownLabel }}</text>
			<text v-if="roomInfo && roomInfo.f_banker_intervene" class="banker">Banker 介入：开</text>
		</view>

		<view v-if="loading" class="loading">加载中…</view>

		<view v-else-if="phase === 'complete'" class="card">
			<text class="done-title">已完成全部 {{ totalRounds }} 轮</text>
			<f-game-charts
				:key="'c-' + chartRefreshKey"
				:history="history"
				:nav-chart-data="compareNavChartData"
				nav-chart-title="玩家净值对比（已提交玩家）"
				:if-banker="roomIfBanker"
				:f-group-count="roomGroupCount"
				:room-admin-uid="roomInfo?.f_admin_uid || ''"
				:simulation-players="simulationPlayersForChart"
				:attribution-player-id="currentUserUid"
			/>
			<button class="btn ghost" @click="backHome">返回首页</button>
		</view>

		<view v-else-if="phase === 'waiting'" class="card">
			<text class="section-title">等待管理员开始第 {{ nextRoundIndex }} 轮</text>
			<text class="wait-tip">管理员在「房间观测」中开启本轮后，点击下方刷新即可继续。</text>
			<view v-if="history.length" class="wait-charts">
				<f-game-charts
					:key="'w-' + chartRefreshKey"
					:history="history"
					:nav-chart-data="compareNavChartData"
					nav-chart-title="玩家净值对比（已提交玩家）"
					:if-banker="roomIfBanker"
					:f-group-count="roomGroupCount"
					:room-admin-uid="roomInfo?.f_admin_uid || ''"
					:simulation-players="simulationPlayersForChart"
					:attribution-player-id="currentUserUid"
				/>
			</view>
			<button class="btn primary" :loading="refreshing" @click="refreshStatus">刷新状态</button>
		</view>

		<view v-else-if="phase === 'input'" class="card">
			<text class="section-title">第 {{ nextRoundIndex }} / {{ totalRounds }} 轮 · 设置五个因子（-5～5）</text>
			<view v-for="d in F_FACTOR_DEFS" :key="d.key" class="fac">
				<view class="fac-top">
					<text class="fac-label">{{ d.label }}</text>
					<text class="fac-num">{{ factors[d.key] }}</text>
				</view>
				<slider
					:min="-5"
					:max="5"
					:step="1"
					:value="factors[d.key]"
					activeColor="#d4af37"
					backgroundColor="#2a2415"
					block-size="20"
					show-value
					@change="(e) => onSlider(d.key, e)"
				/>
			</view>
			<button class="btn primary" :disabled="submitting" :loading="submitting" @click="submitRound">
				确认本轮
			</button>
		</view>

		<view v-else-if="phase === 'review'" class="card">
			<text class="section-title">第 {{ lastCompletedRound }} 轮结果</text>
			<f-game-charts
				:key="'r-' + chartRefreshKey"
				:history="history"
				:nav-chart-data="compareNavChartData"
				nav-chart-title="玩家净值对比（已提交玩家）"
				:if-banker="roomIfBanker"
				:f-group-count="roomGroupCount"
				:room-admin-uid="roomInfo?.f_admin_uid || ''"
				:simulation-players="simulationPlayersForChart"
				:attribution-player-id="currentUserUid"
			/>
			<button
				v-if="canContinue && nextRoundOpen"
				class="btn primary"
				@click="goNextRound"
			>
				下一轮
			</button>
			<button
				v-if="canContinue && !nextRoundOpen"
				class="btn secondary"
				:loading="refreshing"
				@click="refreshStatus"
			>
				刷新状态（等待管理员开启下一轮）
			</button>
			<button v-if="!canContinue" class="btn primary" @click="setComplete">完成游戏</button>
		</view>
	</view>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FGameCharts from '../../components/f-game-charts/f-game-charts.vue'
import { F_FACTOR_DEFS } from '../../utils/f_gameLogic.js'
import { f_getStoredUser } from '../../utils/f_userStorage.js'
import {
	f_getRoomInCloud,
	f_submitGameRoundInCloud,
	f_listGameRoundsInCloud,
	f_getRoomMemberStatusInCloud
} from '../../utils/f_gameApi.js'
import { f_buildJointNavCompareChartData, f_simulatePythonFactorGame } from '../../utils/f_factorEngine.js'

const roomCode = ref('')
const totalRounds = ref(1)
const roomInfo = ref(null)
const loading = ref(true)
const submitting = ref(false)
const refreshing = ref(false)
/** input | review | waiting | complete */
const phase = ref('input')
const history = ref([])
/** 全员提交进度（与房间观测同源），用于多人净值曲线 */
const roomSnapshot = ref(null)
/** 刷新数据后递增，小程序端强制重绘图表 */
const chartRefreshKey = ref(0)
const tick = ref(Date.now())
let timer = null

const factors = reactive({
	fac_size: 0,
	fac_momentum: 0,
	fac_book_to_price: 0,
	fac_growth: 0,
	fac_residual_volatility: 0
})

const roomGroupCount = computed(() => {
	const g = roomInfo.value && roomInfo.value.f_group_count
	const n = parseInt(g, 10)
	return Number.isFinite(n) && n >= 1 ? n : 20
})

const roomIfBanker = computed(() => !!(roomInfo.value && roomInfo.value.f_banker_intervene))

const currentUserUid = computed(() => {
	const u = f_getStoredUser()
	return u && u.f_uid ? String(u.f_uid) : ''
})

const simulationPlayersForChart = computed(() => {
	const ps = roomSnapshot.value && roomSnapshot.value.f_players
	if (!ps || !ps.length) return []
	return ps.map((p) => ({
		player_id: p.f_player_uid,
		history: p.f_history || [],
		label: p.f_nick_name || p.f_player_uid
	}))
})

const playersWithHistory = computed(() => {
	const ps = roomSnapshot.value && roomSnapshot.value.f_players
	if (!ps) return []
	return ps.filter((p) => p.f_history && p.f_history.length > 0)
})

/** 与管理员「房间观测」中多人净值对比一致；仅 1 名有提交时为 null，净值图退化为本人曲线 */
const compareNavChartData = computed(() => {
	const list = playersWithHistory.value
	if (list.length < 2) return null
	return f_buildJointNavCompareChartData(
		list.map((p) => ({
			player_id: p.f_player_uid,
			history: p.f_history,
			label: p.f_nick_name || p.f_player_uid
		})),
		{
			if_banker: roomIfBanker.value,
			f_group_count: roomGroupCount.value,
			f_admin_uid: roomInfo.value?.f_admin_uid || ''
		}
	)
})

const nextRoundIndex = computed(() => history.value.length + 1)

const lastCompletedRound = computed(() => {
	if (!history.value.length) return 0
	const sorted = [...history.value].sort((a, b) => b.f_round_index - a.f_round_index)
	return sorted[0].f_round_index
})

const canContinue = computed(() => history.value.length < totalRounds.value)

const openRoundLabel = computed(() => {
	const o = roomInfo.value && roomInfo.value.f_open_round_index
	const n = typeof o === 'number' ? o : parseInt(o, 10)
	if (Number.isFinite(n) && n > 0) return `第 ${n} 轮`
	return '未开启'
})

const roundCountdownLabel = computed(() => {
	const d = roomInfo.value
	if (!d) return '--:--'
	const open = d.f_open_round_index ? parseInt(d.f_open_round_index, 10) : 0
	if (!Number.isFinite(open) || open <= 0) return '--:--'
	const dur = parseInt(d.f_round_duration_sec, 10)
	const durationSec = Number.isFinite(dur) && dur > 0 ? dur : 300
	const st =
		typeof d.f_round_started_at === 'number' ? d.f_round_started_at : parseInt(d.f_round_started_at, 10)
	if (!Number.isFinite(st) || st <= 0) return '05:00'
	const leftMs = st + durationSec * 1000 - tick.value
	const left = Math.max(0, Math.floor(leftMs / 1000))
	const mm = String(Math.floor(left / 60)).padStart(2, '0')
	const ss = String(left % 60).padStart(2, '0')
	return `${mm}:${ss}`
})

const roundExpired = computed(() => {
	const d = roomInfo.value
	if (!d) return false
	const open = d.f_open_round_index ? parseInt(d.f_open_round_index, 10) : 0
	if (!Number.isFinite(open) || open <= 0) return false
	const dur = parseInt(d.f_round_duration_sec, 10)
	const durationSec = Number.isFinite(dur) && dur > 0 ? dur : 300
	const st =
		typeof d.f_round_started_at === 'number' ? d.f_round_started_at : parseInt(d.f_round_started_at, 10)
	if (!Number.isFinite(st) || st <= 0) return false
	return tick.value > st + durationSec * 1000
})

/** 管理员已开启「下一轮」编号，与玩家将要打的 nextRoundIndex 一致时可进入输入 */
const nextRoundOpen = computed(() => {
	const open = roomInfo.value?.f_open_round_index
	const o = typeof open === 'number' ? open : parseInt(open, 10)
	const nextR = nextRoundIndex.value
	if (!Number.isFinite(o) || o <= 0) return false
	return o === nextR && nextR <= totalRounds.value
})

watch(
	roundExpired,
	async (ex) => {
		if (!ex) return
		// 超时后：自动刷新一次，让页面进入 waiting / review 状态
		if (phase.value === 'input') {
			uni.showToast({ title: '本轮已结束', icon: 'none' })
		}
		await refreshStatus()
	},
	{ immediate: false }
)

function resetFactors() {
	F_FACTOR_DEFS.forEach((d) => {
		factors[d.key] = 0
	})
}

function onSlider(key, e) {
	let v = e.detail.value
	if (typeof v === 'string') v = parseInt(v, 10)
	if (!Number.isFinite(v)) v = 0
	v = Math.max(-5, Math.min(5, Math.round(v)))
	factors[key] = v
}

function applyPhaseAfterLoad(preserveReview) {
	const h = history.value.length
	const total = totalRounds.value
	const openRaw = roomInfo.value?.f_open_round_index
	let open = typeof openRaw === 'number' ? openRaw : parseInt(openRaw, 10)
	if (!Number.isFinite(open) || open < 0) open = 0
	const nextR = h + 1

	if (h >= total) {
		phase.value = 'complete'
		return
	}
	if (preserveReview && phase.value === 'review') {
		if (open === nextR && nextR <= total) {
			phase.value = 'input'
			resetFactors()
		}
		return
	}
	if (open === nextR) {
		phase.value = 'input'
		resetFactors()
	} else {
		phase.value = 'waiting'
	}
}

async function loadAll(rc, opts = {}) {
	const preserveReview = opts.preserveReview === true
	const quiet = opts.quiet === true
	if (!quiet) loading.value = true
	try {
		const gr = await f_getRoomInCloud({ f_room_code: rc })
		const gb = gr.result || {}
		if (gb.f_code !== 0) {
			uni.showToast({ title: gb.f_message || '房间无效', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 600)
			return
		}
		const d = gb.f_data
		roomInfo.value = d
		totalRounds.value = Math.max(1, parseInt(d.f_round_count, 10) || 1)

		const u = f_getStoredUser()
		if (!u || !u.f_uid) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			return
		}

		const lr = await f_listGameRoundsInCloud({
			f_room_code: rc,
			f_player_uid: u.f_uid
		})
		const lb = lr.result || {}
		history.value = lb.f_code === 0 && lb.f_data ? lb.f_data.f_list || [] : []

		await fetchRoomSnapshot(rc)

		applyPhaseAfterLoad(preserveReview)
	} finally {
		if (!quiet) loading.value = false
	}
}

async function fetchRoomSnapshot(rc) {
	const u = f_getStoredUser()
	if (!u || !u.f_uid || !/^\d{4}$/.test(rc)) {
		roomSnapshot.value = null
		return
	}
	try {
		const ms = await f_getRoomMemberStatusInCloud({
			f_room_code: rc,
			f_player_uid: u.f_uid
		})
		const mb = ms.result || {}
		roomSnapshot.value = mb.f_code === 0 && mb.f_data ? mb.f_data : null
	} catch (e) {
		console.error(e)
		roomSnapshot.value = null
	}
}

async function refreshStatus() {
	const rc = roomCode.value
	if (!/^\d{4}$/.test(rc)) return
	refreshing.value = true
	try {
		await loadAll(rc, {
			preserveReview: phase.value === 'review' || phase.value === 'waiting',
			quiet: true
		})
		chartRefreshKey.value++
	} finally {
		refreshing.value = false
	}
}

onLoad((options) => {
	const rc = (options && options.code) || f_getStoredUser()?.f_current_room_code || ''
	roomCode.value = rc
	if (!/^\d{4}$/.test(rc)) {
		uni.showToast({ title: '请先加入房间', icon: 'none' })
		setTimeout(() => uni.navigateBack(), 800)
		return
	}
	loadAll(rc)
	timer = setInterval(() => {
		tick.value = Date.now()
	}, 1000)
})

onUnmounted(() => {
	if (timer) clearInterval(timer)
	timer = null
})

async function submitRound() {
	const u = f_getStoredUser()
	if (!u || !u.f_uid) return
	const cr = nextRoundIndex.value
	if (cr > totalRounds.value) return
	submitting.value = true
	try {
		const payload = {
			f_room_code: roomCode.value,
			f_player_uid: u.f_uid,
			f_round_index: cr,
			fac_size: factors.fac_size,
			fac_momentum: factors.fac_momentum,
			fac_book_to_price: factors.fac_book_to_price,
			fac_growth: factors.fac_growth,
			fac_residual_volatility: factors.fac_residual_volatility
		}
		const metric = buildRoundMetricsForSubmit(payload)
		if (metric) {
			payload.f_nav = metric.f_nav
			payload.f_total_return = metric.f_total_return
			payload.f_size_return = metric.f_size_return
			payload.f_momentum_return = metric.f_momentum_return
			payload.f_book_to_price_return = metric.f_book_to_price_return
			payload.f_growth_return = metric.f_growth_return
			payload.f_residual_volatility_return = metric.f_residual_volatility_return
		}
		const res = await f_submitGameRoundInCloud(payload)
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '提交失败', icon: 'none', duration: 3000 })
			if (body.f_code === 403) {
				await refreshStatus()
			}
			return
		}
		history.value = [
			...history.value.filter((r) => r.f_round_index !== cr),
			{ f_round_index: cr, ...payload }
		].sort((a, b) => a.f_round_index - b.f_round_index)
		phase.value = 'review'
		await fetchRoomSnapshot(roomCode.value)
		chartRefreshKey.value++
	} catch (err) {
		console.error(err)
		uni.showToast({ title: '请检查云函数 f_submit_game_round', icon: 'none' })
	} finally {
		submitting.value = false
	}
}

function buildRoundMetricsForSubmit(payload) {
	const uid = payload && payload.f_player_uid ? String(payload.f_player_uid) : ''
	const round = parseInt(payload && payload.f_round_index, 10)
	if (!uid || !Number.isFinite(round)) return null

	const ps = (roomSnapshot.value && roomSnapshot.value.f_players) || []
	let list = ps.map((p) => ({
		player_id: String(p.f_player_uid || ''),
		history: Array.isArray(p.f_history) ? [...p.f_history] : []
	}))
	if (!list.some((p) => p.player_id === uid)) {
		list.push({ player_id: uid, history: [] })
	}
	list = list
		.filter((p) => p.player_id)
		.map((p) => ({
			player_id: p.player_id,
			history: [
				...p.history.filter((h) => parseInt(h.f_round_index, 10) !== round),
				p.player_id === uid
					? {
							f_round_index: round,
							fac_size: payload.fac_size,
							fac_momentum: payload.fac_momentum,
							fac_book_to_price: payload.fac_book_to_price,
							fac_growth: payload.fac_growth,
							fac_residual_volatility: payload.fac_residual_volatility
						}
					: null
			]
				.filter(Boolean)
				.sort((a, b) => parseInt(a.f_round_index, 10) - parseInt(b.f_round_index, 10))
		}))

	const sim = f_simulatePythonFactorGame(list, {
		if_banker: roomIfBanker.value,
		f_group_count: roomGroupCount.value,
		f_admin_uid: roomInfo.value?.f_admin_uid || ''
	})
	const rows = sim.attributionRowsByPlayerId.get(uid) || []
	const hit = rows.find((r) => parseInt(r.round, 10) === round)
	if (!hit) return null
	return {
		f_nav: Number(hit.nav),
		f_total_return: Number(hit.total_return),
		f_size_return: Number(hit.size_return),
		f_momentum_return: Number(hit.momentum_return),
		f_book_to_price_return: Number(hit.book_to_price_return),
		f_growth_return: Number(hit.growth_return),
		f_residual_volatility_return: Number(hit.residual_volatility_return)
	}
}

async function goNextRound() {
	const rc = roomCode.value
	if (!/^\d{4}$/.test(rc)) return
	refreshing.value = true
	try {
		await loadAll(rc, { preserveReview: false, quiet: true })
		chartRefreshKey.value++
	} finally {
		refreshing.value = false
	}
}

function setComplete() {
	phase.value = 'complete'
}

function backHome() {
	uni.navigateBack()
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 24rpx;
	padding-bottom: 48rpx;
	background: #0b0b0d;
	box-sizing: border-box;
}

.head {
	margin-bottom: 20rpx;
}

.room {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	color: #f5e6b3;
}

.meta {
	display: block;
	font-size: 26rpx;
	color: #bfa56a;
	margin-top: 8rpx;
}

.banker {
	display: block;
	font-size: 24rpx;
	color: #d4af37;
	margin-top: 6rpx;
}

.loading {
	text-align: center;
	padding: 80rpx;
	color: #bfa56a;
}

.card {
	background: #161616;
	border: 1rpx solid #5b4a20;
	border-radius: 20rpx;
	padding: 28rpx 24rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #f5e6b3;
	display: block;
	margin-bottom: 24rpx;
}

.wait-tip {
	font-size: 26rpx;
	color: #bfa56a;
	line-height: 1.5;
	display: block;
	margin-bottom: 24rpx;
}

.wait-charts {
	margin-bottom: 24rpx;
}

.done-title {
	font-size: 32rpx;
	font-weight: 600;
	text-align: center;
	display: block;
	margin-bottom: 24rpx;
}

.fac {
	margin-bottom: 28rpx;
}

.fac-top {
	display: flex;
	justify-content: space-between;
	margin-bottom: 8rpx;
}

.fac-label {
	font-size: 26rpx;
	color: #dcc58a;
}

.fac-num {
	font-size: 26rpx;
	font-weight: 600;
	color: #f5e6b3;
}

.btn {
	margin-top: 16rpx;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 999rpx;
	font-size: 30rpx;
}

.btn::after {
	border: none;
}

.btn.primary {
	background: linear-gradient(135deg, #d4af37, #8f6b1e);
	color: #111;
}

.btn.secondary {
	background: #2a2415;
	color: #f5e6b3;
	border: 1rpx solid #6d5825;
}

.btn.ghost {
	background: #2a2415;
	color: #f5e6b3;
	border: 1rpx solid #6d5825;
	margin-top: 24rpx;
}
</style>
