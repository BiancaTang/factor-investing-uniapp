<template>
	<view class="lobby-screen">
		<view class="lobby-header">
			<text class="lobby-title">因子博弈沙盘</text>
			<text class="lobby-subtitle">FACTOR INVESTING BATTLE</text>
		</view>

		<view class="lobby-center">
			<FactorRing :exposure="demoExposure" :current-round="0" :size="ringSize" />
		</view>

		<view class="lobby-bottom">
			<view class="lobby-status">
				<text class="status-text">{{ roomName || '—' }}</text>
				<text class="status-players">{{ readyCount }} / {{ maxPlayers }}</text>
			</view>

			<view v-if="readyPlayers.length" class="lobby-players">
				<view v-for="player in readyPlayers" :key="player.uid" class="ready-chip">
					<image v-if="player.avatar" :src="player.avatar" class="chip-avatar" />
					<text v-else class="chip-dot">◆</text>
					<text class="chip-name">{{ player.nickName }}</text>
				</view>
			</view>

			<view class="lobby-quote">
				<text class="quote-text">等待管理员开启第一轮</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import FactorRing from '@/components/f-display/factor-ring.vue'

const props = defineProps({
	roomName: { type: String, default: '' },
	players: { type: Array, default: () => [] },
	maxPlayers: { type: Number, default: 20 }
})

const readyPlayers = computed(() => props.players.slice(0, 8))
const readyCount = computed(() => props.players.length)

const demoExposure = computed(() => ({
	fac_size: 0.5,
	fac_beta: -0.3,
	fac_momentum: 0.8,
	fac_non_linear_size: 0.2,
	fac_book_to_price: -0.5,
	fac_earnings_yield: 0.3,
	fac_growth: 1.2,
	fac_leverage: -0.2,
	fac_liquidity: 0.4,
	fac_residual_volatility: -0.6
}))

const ringSize = ref(380)

function updateRingSize() {
	const w = typeof window !== 'undefined' ? window.innerWidth : 1200
	const h = typeof window !== 'undefined' ? window.innerHeight : 800
	const cap = Math.min(w - 48, h - 220, 520)
	ringSize.value = Math.max(280, Math.floor(cap))
}

onMounted(() => {
	updateRingSize()
	window.addEventListener('resize', updateRingSize)
})

onUnmounted(() => {
	if (typeof window !== 'undefined') {
		window.removeEventListener('resize', updateRingSize)
	}
})
</script>

<style scoped>
.lobby-screen {
	width: 100%;
	height: 100%;
	min-height: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 24px 32px 88px;
	box-sizing: border-box;
	overflow: auto;
}

.lobby-header {
	flex-shrink: 0;
	text-align: center;
	margin-bottom: 16px;
}

.lobby-title {
	font-size: clamp(22px, 3.2vw, 34px);
	font-weight: 300;
	color: #c9a84c;
	display: block;
	letter-spacing: clamp(4px, 0.8vw, 10px);
}

.lobby-subtitle {
	font-size: 11px;
	color: #6a6358;
	display: block;
	margin-top: 10px;
	letter-spacing: 3px;
}

.lobby-center {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 0;
	width: 100%;
	padding: 8px 0;
}

.lobby-bottom {
	flex-shrink: 0;
	width: 100%;
	max-width: 720px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	margin-top: 8px;
}

.lobby-status {
	text-align: center;
}

.status-text {
	font-size: 13px;
	color: #7a7268;
	display: block;
	letter-spacing: 2px;
}

.status-players {
	font-size: 18px;
	font-weight: 400;
	color: #a89b88;
	display: block;
	margin-top: 6px;
	letter-spacing: 2px;
}

.lobby-players {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
	width: 100%;
}

.ready-chip {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 14px;
	background: rgba(201, 168, 76, 0.08);
	border: 1px solid rgba(201, 168, 76, 0.18);
	border-radius: 4px;
}

.chip-avatar {
	width: 22px;
	height: 22px;
	border-radius: 50%;
}

.chip-dot {
	font-size: 11px;
	color: #c9a84c;
}

.chip-name {
	font-size: 12px;
	color: #9a9085;
	letter-spacing: 1px;
}

.lobby-quote {
	text-align: center;
	padding-bottom: 4px;
}

.quote-text {
	font-size: 12px;
	color: #7a7268;
	letter-spacing: 4px;
}
</style>
