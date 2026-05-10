<template>
	<view class="runway">
		<view class="runway-track">
			<!-- 跑道刻度 -->
			<view class="track-marks">
				<view v-for="n in 11" :key="n" class="mark" :style="{ left: ((n - 1) * 10) + '%' }">
					<text class="mark-num">{{ n - 1 }}</text>
				</view>
			</view>

			<!-- 起点/终点标识 -->
			<view class="track-start">🏁</view>
			<view class="track-end">🏆</view>

			<!-- 玩家棋子 -->
			<view
				v-for="player in sortedPlayers"
				:key="player.uid"
				class="player-piece"
				:style="getPieceStyle(player)"
			>
				<view class="piece-avatar" :style="{ borderColor: getFactionColor(player.charFaction) }">
					<image v-if="player.avatar" :src="player.avatar" class="piece-img" />
					<text v-else class="piece-emoji">{{ getFactionEmoji(player.charFaction) }}</text>
				</view>
				<view class="piece-info">
					<text class="piece-name">{{ player.nickName }}</text>
					<text class="piece-nav" :class="{ 'nav-up': player.navChange > 0, 'nav-down': player.navChange < 0 }">
						{{ player.nav }}
					</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	players: { type: Array, default: () => [] },
	maxNav: { type: Number, default: 2 }
})

const FACTION_COLORS = {
	value: '#4a6fa5',
	growth: '#43a047',
	momentum: '#fbc02d',
	stable: '#90a4ae',
	aggressive: '#e53935'
}

const FACTION_EMOJIS = {
	value: '🏰',
	growth: '🚀',
	momentum: '⚡',
	stable: '🛡️',
	aggressive: '🔥'
}

const sortedPlayers = computed(() =>
	[...props.players].sort((a, b) => Number(b.nav) - Number(a.nav))
)

function getPieceStyle(player) {
	// 将净值映射到跑道位置 (0% ~ 100%)
	const max = Math.max(props.maxNav, ...props.players.map(p => Number(p.nav)))
	const min = Math.min(0.5, ...props.players.map(p => Number(p.nav)))
	const range = max - min || 1
	const pos = ((Number(player.nav) - min) / range) * 90 + 5 // 5%~95%

	// 根据排名计算垂直偏移，避免重叠
	const rank = sortedPlayers.value.findIndex(p => p.uid === player.uid)
	const laneOffset = (rank % 3) * 28 // 3条跑道线

	return {
		left: pos + '%',
		top: (10 + laneOffset) + 'px',
		zIndex: 10 + rank
	}
}

function getFactionColor(faction) {
	return FACTION_COLORS[faction] || '#888'
}

function getFactionEmoji(faction) {
	return FACTION_EMOJIS[faction] || '🎲'
}
</script>

<style scoped>
.runway {
	width: 100%;
	padding: 12px 0;
}

.runway-track {
	position: relative;
	height: 120px;
	background: linear-gradient(180deg, #1a1a1a 0%, #111 100%);
	border-radius: 8px;
	border: 1px solid #333;
	overflow: visible;
}

.track-marks {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	height: 100%;
	pointer-events: none;
}

.mark {
	position: absolute;
	top: 0;
	width: 1px;
	height: 100%;
	background: #333;
}

.mark-num {
	position: absolute;
	bottom: 2px;
	left: 50%;
	transform: translateX(-50%);
	font-size: 10px;
	color: #555;
}

.track-start {
	position: absolute;
	left: 8px;
	top: 50%;
	transform: translateY(-50%);
	font-size: 20px;
}

.track-end {
	position: absolute;
	right: 8px;
	top: 50%;
	transform: translateY(-50%);
	font-size: 20px;
}

.player-piece {
	position: absolute;
	transition: left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
	display: flex;
	align-items: center;
	gap: 6px;
}

.piece-avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	border: 2px solid;
	overflow: hidden;
	background: #222;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.piece-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.piece-emoji {
	font-size: 16px;
}

.piece-info {
	display: flex;
	flex-direction: column;
}

.piece-name {
	font-size: 11px;
	color: #ccc;
	white-space: nowrap;
}

.piece-nav {
	font-size: 12px;
	font-weight: bold;
	color: #d4af37;
}

.nav-up {
	color: #4caf50;
}

.nav-down {
	color: #f44336;
}
</style>
