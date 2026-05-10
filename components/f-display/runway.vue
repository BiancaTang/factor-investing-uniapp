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
			<text class="track-start">◆</text>
			<text class="track-end">◆</text>

			<!-- 玩家棋子 -->
			<view
				v-for="player in sortedPlayers"
				:key="player.uid"
				class="player-piece"
				:style="getPieceStyle(player)"
			>
				<view class="piece-avatar" :style="{ borderColor: getFactionColor(player.charFaction) }">
					<image v-if="player.avatar" :src="player.avatar" class="piece-img" />
					<text v-else class="piece-symbol">◆</text>
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

const sortedPlayers = computed(() =>
	[...props.players].sort((a, b) => Number(b.nav) - Number(a.nav))
)

function getPieceStyle(player) {
	const max = Math.max(props.maxNav, ...props.players.map(p => Number(p.nav)))
	const min = Math.min(0.5, ...props.players.map(p => Number(p.nav)))
	const range = max - min || 1
	const pos = ((Number(player.nav) - min) / range) * 90 + 5

	const rank = sortedPlayers.value.findIndex(p => p.uid === player.uid)
	const laneOffset = (rank % 3) * 28

	return {
		left: pos + '%',
		top: (10 + laneOffset) + 'px',
		zIndex: 10 + rank
	}
}

function getFactionColor(faction) {
	return FACTION_COLORS[faction] || '#333'
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
	background: linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.03) 100%);
	border-radius: 1px;
	border: 1px solid rgba(255,255,255,0.04);
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
	background: rgba(255,255,255,0.03);
}

.mark-num {
	position: absolute;
	bottom: 2px;
	left: 50%;
	transform: translateX(-50%);
	font-size: 9px;
	color: #333;
}

.track-start {
	position: absolute;
	left: 8px;
	top: 50%;
	transform: translateY(-50%);
	font-size: 12px;
	color: #333;
}

.track-end {
	position: absolute;
	right: 8px;
	top: 50%;
	transform: translateY(-50%);
	font-size: 12px;
	color: #333;
}

.player-piece {
	position: absolute;
	transition: left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
	display: flex;
	align-items: center;
	gap: 6px;
}

.piece-avatar {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	border: 1px solid;
	overflow: hidden;
	background: #0a0a0a;
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

.piece-symbol {
	font-size: 12px;
	color: #333;
}

.piece-info {
	display: flex;
	flex-direction: column;
}

.piece-name {
	font-size: 10px;
	color: #666;
	white-space: nowrap;
	letter-spacing: 1px;
}

.piece-nav {
	font-size: 11px;
	font-weight: 400;
	color: #c9a84c;
}

.nav-up {
	color: #6a8a6a;
}

.nav-down {
	color: #8a6a6a;
}
</style>