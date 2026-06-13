<template>
	<view class="lobby-screen">
		<view class="lobby-header">
			<text class="lobby-title">影子博弈沙盘</text>
			<text class="lobby-datetime">{{ dateTimeLabel }}</text>
		</view>

		<view class="lobby-meta">
			<view class="meta-item">
				<text class="meta-label">房间号</text>
				<text class="meta-value">{{ roomId || '—' }}</text>
			</view>
			<view class="meta-item">
				<text class="meta-label">轮次</text>
				<text class="meta-value">{{ roundLabel }}</text>
			</view>
			<view class="meta-item">
				<text class="meta-label">状态</text>
				<text class="meta-value status-waiting">候场中</text>
			</view>
		</view>

		<view class="lobby-roster">
			<text class="roster-title">候场人员</text>
			<view v-if="players.length" class="roster-grid">
				<view v-for="player in players" :key="player.uid" class="roster-card">
					<view class="roster-avatar-wrap">
						<image
							v-if="player.avatar && !isAvatarBroken(player)"
							:src="player.avatar"
							class="roster-avatar"
							mode="aspectFill"
							referrerpolicy="no-referrer"
							@error="onAvatarError(player)"
						/>
						<text v-else class="roster-avatar-fallback">{{ avatarInitial(player) }}</text>
					</view>
					<text class="roster-name">{{ player.nickName || '玩家' }}</text>
				</view>
			</view>
			<view v-else class="roster-empty">
				<text>暂无成员</text>
			</view>
		</view>

		<f-factor-intro-fab />
	</view>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
	roomId: { type: String, default: '' },
	roundIndex: { type: Number, default: 0 },
	players: { type: Array, default: () => [] }
})

const brokenAvatarUids = ref(new Set())

const now = ref(Date.now())
let clockTimer = null

const dateTimeLabel = computed(() => {
	const d = new Date(now.value)
	const y = d.getFullYear()
	const mo = String(d.getMonth() + 1).padStart(2, '0')
	const da = String(d.getDate()).padStart(2, '0')
	const h = String(d.getHours()).padStart(2, '0')
	const mi = String(d.getMinutes()).padStart(2, '0')
	const s = String(d.getSeconds()).padStart(2, '0')
	return `${y}年${mo}月${da}日 ${h}:${mi}:${s}`
})

const roundLabel = computed(() => {
	const n = parseInt(props.roundIndex, 10)
	return Number.isFinite(n) && n > 0 ? String(n) : '—'
})

function avatarInitial(player) {
	const name = (player && player.nickName) || '?'
	return String(name).slice(0, 1)
}

function isAvatarBroken(player) {
	return brokenAvatarUids.value.has(String(player && player.uid))
}

function onAvatarError(player) {
	const uid = player && player.uid
	if (!uid) return
	brokenAvatarUids.value = new Set([...brokenAvatarUids.value, String(uid)])
}

onMounted(() => {
	clockTimer = setInterval(() => {
		now.value = Date.now()
	}, 1000)
})

onUnmounted(() => {
	if (clockTimer) clearInterval(clockTimer)
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
	padding: 40px 48px 40px;
	box-sizing: border-box;
	overflow: auto;
}

.lobby-header {
	flex-shrink: 0;
	text-align: center;
	margin-bottom: 36px;
}

.lobby-title {
	font-size: clamp(28px, 4vw, 42px);
	font-weight: 300;
	color: #c9a84c;
	display: block;
	letter-spacing: clamp(6px, 1vw, 14px);
}

.lobby-datetime {
	display: block;
	margin-top: 16px;
	font-size: clamp(14px, 1.6vw, 18px);
	color: #8a8275;
	letter-spacing: 2px;
	font-variant-numeric: tabular-nums;
}

.lobby-meta {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 32px 56px;
	margin-bottom: 40px;
	width: 100%;
	max-width: 900px;
}

.meta-item {
	text-align: center;
	min-width: 100px;
}

.meta-label {
	display: block;
	font-size: 11px;
	color: #5c564d;
	letter-spacing: 3px;
	margin-bottom: 8px;
}

.meta-value {
	display: block;
	font-size: clamp(20px, 2.4vw, 28px);
	color: #d4c4a0;
	letter-spacing: 2px;
	font-weight: 300;
}

.meta-value.status-waiting {
	color: #c9a84c;
}

.lobby-roster {
	flex: 1;
	width: 100%;
	max-width: 1100px;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.roster-title {
	font-size: 12px;
	color: #6a6358;
	letter-spacing: 4px;
	text-align: center;
	margin-bottom: 24px;
}

.roster-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 20px 24px;
	padding: 8px 0 24px;
}

.roster-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 96px;
}

.roster-avatar-wrap {
	width: 64px;
	height: 64px;
	border-radius: 50%;
	border: 1px solid rgba(201, 168, 76, 0.35);
	background: rgba(0, 0, 0, 0.35);
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 10px;
}

.roster-avatar {
	width: 100%;
	height: 100%;
}

.roster-avatar-fallback {
	font-size: 22px;
	color: #c9a84c;
}

.roster-name {
	font-size: 13px;
	color: #a89b88;
	text-align: center;
	line-height: 1.35;
	word-break: break-all;
	max-width: 100%;
}

.roster-empty {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
	color: #555;
	letter-spacing: 2px;
}
</style>
