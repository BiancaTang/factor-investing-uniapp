<template>
	<view class="runway">
		<view class="runway-track" :style="{ height: trackLayout.height + 'px' }">
			<view class="track-play-area">
				<!-- 跑道刻度（NAV 1 在左侧起点） -->
				<view class="track-marks">
					<view v-for="mark in trackMarks" :key="mark.label" class="mark" :style="{ left: mark.left }">
						<text class="mark-num">{{ mark.label }}</text>
					</view>
				</view>

				<!-- 起点/终点标识 -->
				<text class="track-start" :style="{ left: trackEdgeLeft }">◆</text>
				<text class="track-end" :style="{ left: trackEdgeRight }">◆</text>
			</view>
			<view
				v-for="(player, rank) in sortedPlayers"
				:key="player.uid"
				class="player-lane"
				:style="getLaneStyle(rank)"
			>
				<view class="lane-identity">
					<view class="piece-avatar" :style="{ borderColor: getFactionColor(player.charFaction) }">
						<image v-if="player.avatar" :src="player.avatar" class="piece-img" mode="aspectFill" />
						<text v-else class="piece-symbol">{{ (player.nickName || '?').slice(0, 1) }}</text>
					</view>
					<view class="piece-info">
						<text class="piece-name">{{ player.nickName }}</text>
						<text class="piece-nav" :class="{ 'nav-up': player.navChange > 0, 'nav-down': player.navChange < 0 }">
							{{ player.nav }}
						</text>
					</view>
				</view>
				<view class="lane-marker" :style="{ left: getMarkerLeft(player) }">
					<view class="marker-dot" />
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

const START_NAV = 1
const IDENTITY_WIDTH = 168
const LEFT_PCT = 8
const RIGHT_PCT = 92
const LANE_HEIGHT = 40
const TRACK_PAD_Y = 12
const TRACK_MIN_HEIGHT = 72

const sortedPlayers = computed(() =>
	[...props.players].sort((a, b) => Number(b.nav) - Number(a.nav))
)

const trackLayout = computed(() => {
	const count = Math.max(1, sortedPlayers.value.length)
	const height = Math.max(TRACK_MIN_HEIGHT, TRACK_PAD_Y * 2 + count * LANE_HEIGHT)
	return { height, count }
})

function resolveNavRange() {
	const navs = props.players.map(p => Number(p.nav)).filter(n => Number.isFinite(n))
	const dataMax = navs.length ? Math.max(...navs) : START_NAV
	const maxNav = Math.max(START_NAV + 0.001, props.maxNav, dataMax)
	return { maxNav, range: maxNav - START_NAV }
}

function trackPosCss(ratioOnTrack) {
	const pos = LEFT_PCT + ratioOnTrack * (RIGHT_PCT - LEFT_PCT)
	return `calc(${IDENTITY_WIDTH}px + (100% - ${IDENTITY_WIDTH}px) * ${pos / 100})`
}

const trackEdgeLeft = trackPosCss(0)
const trackEdgeRight = trackPosCss(1)

const trackMarks = computed(() => {
	const { range } = resolveNavRange()
	const count = 5
	return Array.from({ length: count }, (_, i) => {
		const ratio = count === 1 ? 0 : i / (count - 1)
		const left = trackPosCss(ratio)
		const navVal = START_NAV + ratio * range
		const label = range < 0.5 ? navVal.toFixed(2) : navVal.toFixed(1)
		return { left, label }
	})
})

function getMarkerLeft(player) {
	const { range } = resolveNavRange()
	const nav = Number(player.nav)
	const ratio = Math.max(0, Math.min(1, (nav - START_NAV) / range))
	return trackPosCss(ratio)
}

function getLaneStyle(rank) {
	return {
		top: TRACK_PAD_Y + rank * LANE_HEIGHT + 'px',
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
	max-width: 100%;
	padding: 12px 0;
	box-sizing: border-box;
	overflow: hidden;
}

.runway-track {
	position: relative;
	min-height: 72px;
	background: linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.03) 100%);
	border-radius: 1px;
	border: 1px solid rgba(255,255,255,0.04);
	overflow: visible;
	transition: height 0.35s ease;
}

.track-play-area {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	pointer-events: none;
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

.track-start,
.track-end {
	position: absolute;
	top: 50%;
	transform: translate(-50%, -50%);
	font-size: 12px;
	color: #333;
}

.player-lane {
	position: absolute;
	left: 0;
	right: 0;
	height: 40px;
	pointer-events: none;
}

.lane-identity {
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 168px;
	padding-left: 8px;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	gap: 6px;
	z-index: 2;
}

.lane-marker {
	position: absolute;
	top: 50%;
	transform: translate(-50%, -50%);
	transition: left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.marker-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: rgba(201, 168, 76, 0.85);
	box-shadow: 0 0 6px rgba(201, 168, 76, 0.35);
}

.piece-avatar {
	width: 32px;
	height: 32px;
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
	min-width: 0;
	flex: 1;
}

.piece-name {
	font-size: 10px;
	color: #666;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	letter-spacing: 1px;
	max-width: 112px;
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