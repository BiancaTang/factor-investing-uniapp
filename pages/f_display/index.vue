<template>
	<view class="display-page">
		<!-- 粒子特效层 -->
		<canvas ref="particleCanvas" class="particle-layer" :style="canvasStyle" />

		<!-- 主内容区 -->
		<view class="display-content">
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

		<!-- 底部状态栏 -->
		<view class="display-footer">
			<text class="footer-room">房间 {{ state.roomId }}</text>
			<text class="footer-round">R{{ state.currentRoundIndex }}/{{ state.maxRounds }}</text>
			<text class="footer-phase">{{ phaseLabel }}</text>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ParticleSystem } from '@/utils/f_displayEngine.js'

import LobbyScreen from './lobby.vue'
import DecisionScreen from './decision.vue'
import EventScreen from './event.vue'
import SettlementScreen from './settlement.vue'
import ReviewScreen from './review.vue'
import FinaleScreen from './finale.vue'

const props = defineProps({
	roomId: { type: String, required: true }
})

// 大屏状态
const state = ref({
	roomId: props.roomId,
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
	timestamp: 0
})

const phaseLabel = computed(() => ({
	lobby: '候场中',
	decision: '决策中',
	event: '事件降临',
	settlement: '结算中',
	review: '复盘',
	finale: '终局盛典'
}[state.value.currentPhase] || '等待'))

// 粒子系统
const particleCanvas = ref(null)
const particleSystem = ref(null)
const canvasStyle = ref({})

// 轮询控制
let pollTimer = null
let isAnimating = false

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

	try {
		const res = await uniCloud.callFunction({
			name: 'f_sync_display_state',
			data: { f_room_id: props.roomId }
		})

		if (res.result?.code !== 0) {
			console.warn('大屏同步失败:', res.result?.message)
			return
		}

		const newData = res.result.data
		const oldPhase = state.value.currentPhase
		const oldPlayers = state.value.players

		// 检测阶段变化
		if (newData.currentPhase !== oldPhase) {
			handlePhaseChange(newData.currentPhase, oldPhase)
		}

		// 检测玩家排名/净值变化（结算阶段）
		if (newData.currentPhase === 'settlement') {
			detectPlayerChanges(oldPlayers, newData.players)
		}

		// 检测技能触发
		if (newData.skillLog?.length > state.value.skillLog.length) {
			const newSkills = newData.skillLog.slice(state.value.skillLog.length)
			newSkills.forEach(skill => showSkillDanmaku(skill))
		}

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

// 技能弹幕（简化实现）
function showSkillDanmaku(skill) {
	// TODO: 接入 skill-danmaku 组件
	console.log('🎭 技能触发:', skill.f_skill_name, '-', skill.f_player_uid)
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

// 初始化
onMounted(() => {
	// 初始化粒子系统
	if (particleCanvas.value) {
		particleSystem.value = new ParticleSystem(particleCanvas.value)
		particleSystem.value.start()
	}

	// 全屏适配
	canvasStyle.value = {
		width: window.innerWidth + 'px',
		height: window.innerHeight + 'px'
	}

	// 启动数据轮询
	startPolling()
})

onUnmounted(() => {
	stopPolling()
	particleSystem.value?.stop()
})
</script>

<style scoped>
.display-page {
	width: 100vw;
	height: 100vh;
	background: #0a0a0a;
	color: #f0f0f0;
	overflow: hidden;
	position: relative;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.particle-layer {
	position: fixed;
	top: 0;
	left: 0;
	pointer-events: none;
	z-index: 100;
}

.display-content {
	width: 100%;
	height: calc(100% - 40px);
	position: relative;
	z-index: 10;
}

.display-footer {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 40px;
	background: rgba(0, 0, 0, 0.8);
	border-top: 1px solid #333;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 24px;
	z-index: 50;
}

.footer-room {
	font-size: 12px;
	color: #888;
}

.footer-round {
	font-size: 14px;
	font-weight: bold;
	color: #d4af37;
}

.footer-phase {
	font-size: 12px;
	color: #aaa;
}
</style>