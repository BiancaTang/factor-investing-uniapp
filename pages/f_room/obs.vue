<template>
	<view class="page">
		<view class="card">
			<text class="h1">房间观测</text>
			<text class="tip">统一开始 / 结束每一轮；下方刷新可查看各玩家已提交的最大轮次。</text>
			<view class="row">
				<text class="label">房间号</text>
				<input
					class="field"
					type="number"
					maxlength="4"
					:value="roomCode"
					placeholder="4 位数字"
					@input="onRoomCode"
				/>
			</view>
			<view v-if="status" class="status">
				<text class="st">总轮次：{{ totalRoundsLabel }}</text>
				<text class="st">当前开放轮次：{{ openLabel }}</text>
				<text v-if="status.f_open_round_index" class="st">本轮剩余时间：{{ roundCountdownLabel }}</text>
				<text class="st">加入：{{ joinLockLabel }} · 玩家席 {{ playerSeatLabel }} · Banker：{{ status.f_banker_intervene ? '开' : '关' }}</text>
				<text v-if="!status.f_game_ended" class="st">博弈：{{ status.f_playing_started ? '已开始（角色已锁定）' : '未开始（可选角）' }}</text>
				<text v-if="status.f_game_ended" class="st">游戏状态：已结束</text>
			</view>
			<view v-if="status && !status.f_game_ended" class="ctrl join-ctrl">
				<button
					class="btn"
					:disabled="acting || status.f_join_locked"
					:loading="acting && lastAction === 'lock_join'"
					@click="onLockJoin"
				>
					锁定加入
				</button>
				<button
					class="btn ghost"
					:disabled="acting || !status.f_join_locked"
					:loading="acting && lastAction === 'unlock_join'"
					@click="onUnlockJoin"
				>
					解锁加入
				</button>
				<button
					class="btn primary"
					:disabled="acting || !status.f_join_locked || status.f_playing_started"
					:loading="acting && lastAction === 'start_play'"
					@click="onStartPlayingPhase"
				>
					开始博弈
				</button>
			</view>
			<view class="ctrl">
				<button
					class="btn primary"
					:disabled="acting || !canStart"
					:loading="acting && lastAction === 'start'"
					@click="onStartRound"
				>
					开始第 {{ nextRoundToStart }} 轮
				</button>
				<button
					class="btn danger"
					:disabled="acting || !status || status.f_open_round_index === 0"
					:loading="acting && lastAction === 'end'"
					@click="onEndRound"
				>
					结束本轮
				</button>
				<button
					v-if="status && status.f_open_round_index === 0 && !status.f_game_ended"
					class="btn danger"
					:disabled="acting"
					:loading="acting && lastAction === 'finish_game'"
					@click="onFinishGame"
				>
					结束游戏
				</button>
			</view>
			<view v-if="status && status.f_players && status.f_players.length" class="list">
				<text class="list-title">玩家进度（已提交最高轮次）</text>
				<view v-for="(p, i) in status.f_players" :key="i" class="li">
					<text class="ph">{{ p.f_nick_name }}</text>
					<text class="pr">第 {{ p.f_max_round_index }} 轮</text>
				</view>
			</view>
			<view v-else-if="status" class="empty">暂无成员或未加入房间</view>

			<view v-if="status && status.f_game_ended && rankingList.length" class="ranking">
				<text class="list-title">最终净值排名</text>
				<view v-for="r in rankingList" :key="r.f_player_uid" class="li">
					<text class="ph">#{{ r.rank }} {{ r.f_nick_name }}</text>
					<text class="pr">净值 {{ r.f_nav_text }}</text>
				</view>
			</view>

			<view v-if="compareChartData" class="charts-wrap">
				<f-game-charts
					:chart-data="compareChartData"
					:only-nav="true"
					nav-chart-title="玩家净值对比（已提交玩家）"
				/>
			</view>
			<view v-for="p in playersWithHistory" :key="p.f_player_uid" class="player-charts">
				<text class="player-h">{{ p.f_nick_name }}</text>
				<f-game-charts
					:history="p.f_history"
					:if-banker="roomIfBanker"
					:f-group-count="roomGroupCount"
					:room-admin-uid="status?.f_admin_uid || ''"
					:simulation-players="simulationPlayersForObs"
					:attribution-player-id="p.f_player_uid"
				/>
			</view>
		</view>
		<view class="footer">
			<button class="btn ghost wide" :loading="loading" @click="refresh">刷新</button>
		</view>
	</view>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FGameCharts from '../../components/f-game-charts/f-game-charts.vue'
import { f_buildJointNavCompareChartData, f_simulatePythonFactorGame } from '../../utils/f_factorEngine.js'
import { f_getStoredUser } from '../../utils/f_userStorage.js'
import { f_isAdmin } from '../../utils/f_role.js'
import {
	f_controlRoomRoundInCloud,
	f_getRoomPlayerStatusInCloud,
	f_setRoomJoinLockInCloud,
	f_startPlayingPhaseInCloud
} from '../../utils/f_roomAdminApi.js'

const roomCode = ref('')
const status = ref(null)
const loading = ref(false)
const acting = ref(false)
const lastAction = ref('')
const tick = ref(Date.now())
let timer = null
let autoEnding = false

onLoad((q) => {
	const u = f_getStoredUser()
	if (!u || !f_isAdmin(u)) {
		uni.showToast({ title: '仅管理员', icon: 'none' })
		setTimeout(() => uni.navigateBack(), 600)
		return
	}
	if (q && q.code) roomCode.value = String(q.code)
	else if (u.f_current_room_code) roomCode.value = u.f_current_room_code
	nextTick(() => {
		const rc = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
		if (/^\d{4}$/.test(rc)) refresh()
	})
	timer = setInterval(() => {
		tick.value = Date.now()
	}, 1000)
})

onUnmounted(() => {
	if (timer) clearInterval(timer)
	timer = null
})

const totalRoundsLabel = computed(() => {
	if (!status.value) return '-'
	const n = parseInt(status.value.f_round_count, 10)
	return Number.isFinite(n) && n > 0 ? String(n) : '无限'
})

const openLabel = computed(() => {
	if (!status.value) return '-'
	const o = status.value.f_open_round_index
	return o && o > 0 ? `第 ${o} 轮` : '未开启（玩家不可提交）'
})

const roundCountdownLabel = computed(() => {
	if (!status.value) return '-'
	const open = status.value.f_open_round_index || 0
	if (!open) return '-'
	const dur = parseInt(status.value.f_round_duration_sec, 10)
	const durationSec = Number.isFinite(dur) && dur > 0 ? dur : 300
	const st = typeof status.value.f_round_started_at === 'number' ? status.value.f_round_started_at : parseInt(status.value.f_round_started_at, 10)
	if (!Number.isFinite(st) || st <= 0) return `${durationSec}s`
	const leftMs = st + durationSec * 1000 - tick.value
	const left = Math.max(0, Math.floor(leftMs / 1000))
	const mm = String(Math.floor(left / 60)).padStart(2, '0')
	const ss = String(left % 60).padStart(2, '0')
	return `${mm}:${ss}`
})

const roundExpired = computed(() => {
	if (!status.value) return false
	const open = status.value.f_open_round_index || 0
	if (!open) return false
	const dur = parseInt(status.value.f_round_duration_sec, 10)
	const durationSec = Number.isFinite(dur) && dur > 0 ? dur : 300
	const st = typeof status.value.f_round_started_at === 'number' ? status.value.f_round_started_at : parseInt(status.value.f_round_started_at, 10)
	if (!Number.isFinite(st) || st <= 0) return false
	return tick.value > st + durationSec * 1000
})

watch(
	roundExpired,
	async (ex) => {
		if (!ex) return
		if (autoEnding) return
		if (!status.value || !status.value.f_open_round_index) return
		autoEnding = true
		try {
			await onEndRound()
		} finally {
			autoEnding = false
		}
	},
	{ immediate: false }
)

const canStart = computed(() => {
	if (!status.value) return false
	if (status.value.f_game_ended) return false
	if (status.value.f_open_round_index !== 0) return false
	if (status.value.f_playing_started === true) return true
	if (status.value.f_join_locked !== true) return true
	return false
})

const nextRoundToStart = computed(() => {
	const list = (status.value && status.value.f_players) || []
	let maxRi = 0
	for (const p of list) {
		const ri = parseInt(p.f_max_round_index, 10)
		if (Number.isFinite(ri) && ri > maxRi) maxRi = ri
	}
	return maxRi + 1
})

const roomGroupCount = computed(() => {
	const g = status.value && status.value.f_group_count
	const n = parseInt(g, 10)
	return Number.isFinite(n) && n >= 1 ? n : 20
})

const joinLockLabel = computed(() => {
	if (!status.value) return '-'
	return status.value.f_join_locked ? '已锁定' : '开放'
})

const playerSeatLabel = computed(() => {
	if (!status.value) return '-'
	const u = status.value.f_player_seat_used
	const m = status.value.f_player_seat_max
	if (typeof u === 'number' && typeof m === 'number') return `${u}/${m}`
	return '-'
})

const roomIfBanker = computed(() => !!(status.value && status.value.f_banker_intervene))

const playersWithHistory = computed(() => {
	const ps = status.value && status.value.f_players
	if (!ps) return []
	return ps.filter((p) => p.f_history && p.f_history.length > 0)
})

function f_roleMapFromObsPlayers() {
	const ps = (status.value && status.value.f_players) || []
	const m = {}
	for (const p of ps) {
		const rid = parseInt(p.f_role_id, 10)
		if (!p.f_player_uid || !Number.isFinite(rid) || rid < 1 || rid > 10) continue
		m[String(p.f_player_uid)] = rid
	}
	return m
}

const compareChartData = computed(() => {
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
			f_admin_uid: status.value?.f_admin_uid || '',
			roleIdByPlayerId: f_roleMapFromObsPlayers()
		}
	)
})

const simulationPlayersForObs = computed(() => {
	const list = playersWithHistory.value
	return list.map((p) => ({
		player_id: p.f_player_uid,
		history: p.f_history || [],
		label: p.f_nick_name || p.f_player_uid
	}))
})

const rankingList = computed(() => {
	const ps = (status.value && status.value.f_players) || []
	const ifBanker = !!(status.value && status.value.f_banker_intervene)
	const adminUid = status.value && status.value.f_admin_uid ? String(status.value.f_admin_uid) : ''
	const bankerNav0 = Math.max(1, Math.floor(roomGroupCount.value / 3))
	const sim = f_simulatePythonFactorGame(
		ps.map((p) => ({
			player_id: String(p.f_player_uid || ''),
			history: Array.isArray(p.f_history) ? p.f_history : []
		})),
		{
			if_banker: ifBanker,
			f_group_count: roomGroupCount.value,
			f_admin_uid: adminUid,
			roleIdByPlayerId: f_roleMapFromObsPlayers()
		}
	)
	const rows = ps.map((p) => {
		const uid = String(p.f_player_uid || '')
		const pts = sim.navByPlayerId.get(uid) || []
		const sortedPts = [...pts].sort((a, b) => a.round - b.round)
		const last = sortedPts.length ? sortedPts[sortedPts.length - 1] : null
		const nav = last ? Number(last.nav) : 0
		let navNorm = Number.isFinite(nav) ? nav : 0
		if (ifBanker && adminUid && uid === adminUid) {
			navNorm = bankerNav0 === 0 ? navNorm : navNorm / bankerNav0
		}
		return {
			f_player_uid: uid,
			f_nick_name: p.f_nick_name || p.f_player_uid,
			f_nav: navNorm,
			f_round_index: last ? Number(last.round) : 0
		}
	})
	rows.sort((a, b) => {
		if (b.f_nav !== a.f_nav) return b.f_nav - a.f_nav
		return b.f_round_index - a.f_round_index
	})
	let prevNav = null
	let prevRank = 0
	return rows.map((r, i) => {
		const rank = prevNav !== null && r.f_nav === prevNav ? prevRank : i + 1
		prevNav = r.f_nav
		prevRank = rank
		return {
			...r,
			rank,
			f_nav_text: r.f_nav.toFixed(4)
		}
	})
})

function onRoomCode(e) {
	roomCode.value = String(e.detail.value || '').replace(/\D/g, '').slice(0, 4)
}

async function refresh() {
	const u = f_getStoredUser()
	if (!u || !u.f_uid || !f_isAdmin(u)) return
	const rc = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
	if (!/^\d{4}$/.test(rc)) {
		uni.showToast({ title: '请输入 4 位房间号', icon: 'none' })
		return
	}
	loading.value = true
	try {
		const res = await f_getRoomPlayerStatusInCloud({
			f_admin_uid: u.f_uid,
			f_room_code: rc
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '加载失败', icon: 'none' })
			status.value = null
			return
		}
		status.value = body.f_data
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '请上传云函数 f_get_room_player_status', icon: 'none' })
	} finally {
		loading.value = false
	}
}

async function onStartPlayingPhase() {
	const u = f_getStoredUser()
	if (!u || !u.f_uid) return
	const rc = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
	if (!/^\d{4}$/.test(rc)) return
	acting.value = true
	lastAction.value = 'start_play'
	try {
		const res = await f_startPlayingPhaseInCloud({
			f_admin_uid: u.f_uid,
			f_room_code: rc
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '失败', icon: 'none' })
			return
		}
		uni.showToast({ title: '已开始博弈', icon: 'success' })
		await refresh()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '请上传云函数 f_start_playing_phase', icon: 'none' })
	} finally {
		acting.value = false
		lastAction.value = ''
	}
}

async function onLockJoin() {
	const u = f_getStoredUser()
	if (!u || !u.f_uid) return
	const rc = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
	if (!/^\d{4}$/.test(rc)) return
	acting.value = true
	lastAction.value = 'lock_join'
	try {
		const res = await f_setRoomJoinLockInCloud({
			f_admin_uid: u.f_uid,
			f_room_code: rc,
			f_join_locked: true
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '失败', icon: 'none' })
			return
		}
		uni.showToast({ title: '已锁定加入', icon: 'success' })
		await refresh()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '请上传云函数 f_set_room_join_lock', icon: 'none' })
	} finally {
		acting.value = false
		lastAction.value = ''
	}
}

async function onUnlockJoin() {
	const u = f_getStoredUser()
	if (!u || !u.f_uid) return
	const rc = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
	if (!/^\d{4}$/.test(rc)) return
	acting.value = true
	lastAction.value = 'unlock_join'
	try {
		const res = await f_setRoomJoinLockInCloud({
			f_admin_uid: u.f_uid,
			f_room_code: rc,
			f_join_locked: false
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '失败', icon: 'none' })
			return
		}
		uni.showToast({ title: '已开放加入', icon: 'success' })
		await refresh()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '请上传云函数 f_set_room_join_lock', icon: 'none' })
	} finally {
		acting.value = false
		lastAction.value = ''
	}
}

async function onStartRound() {
	const u = f_getStoredUser()
	if (!u || !u.f_uid) return
	const rc = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
	if (!/^\d{4}$/.test(rc)) {
		uni.showToast({ title: '请输入房间号', icon: 'none' })
		return
	}
	const ri = nextRoundToStart.value
	acting.value = true
	lastAction.value = 'start'
	try {
		const res = await f_controlRoomRoundInCloud({
			f_admin_uid: u.f_uid,
			f_room_code: rc,
			f_action: 'start',
			f_round_index: ri
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '失败', icon: 'none', duration: 3000 })
			return
		}
		uni.showToast({ title: '已开启', icon: 'success' })
		await refresh()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '请上传云函数 f_control_room_round', icon: 'none' })
	} finally {
		acting.value = false
		lastAction.value = ''
	}
}

async function onEndRound() {
	const u = f_getStoredUser()
	if (!u || !u.f_uid) return
	const rc = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
	if (!/^\d{4}$/.test(rc)) return
	acting.value = true
	lastAction.value = 'end'
	try {
		const res = await f_controlRoomRoundInCloud({
			f_admin_uid: u.f_uid,
			f_room_code: rc,
			f_action: 'end'
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '失败', icon: 'none' })
			return
		}
		uni.showToast({ title: '已结束本轮', icon: 'success' })
		await refresh()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '请上传云函数 f_control_room_round', icon: 'none' })
	} finally {
		acting.value = false
		lastAction.value = ''
	}
}

async function onFinishGame() {
	const u = f_getStoredUser()
	if (!u || !u.f_uid) return
	const rc = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
	if (!/^\d{4}$/.test(rc)) return
	acting.value = true
	lastAction.value = 'finish_game'
	try {
		const res = await f_controlRoomRoundInCloud({
			f_admin_uid: u.f_uid,
			f_room_code: rc,
			f_action: 'finish_game'
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '失败', icon: 'none' })
			return
		}
		uni.showToast({ title: '游戏已结束', icon: 'success' })
		await refresh()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '请上传云函数 f_control_room_round', icon: 'none' })
	} finally {
		acting.value = false
		lastAction.value = ''
	}
}
</script>

<style scoped>
.join-ctrl {
	margin-bottom: 16rpx;
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.charts-wrap {
	margin-top: 28rpx;
	padding-top: 24rpx;
	border-top: 1rpx solid #3f341a;
}

.player-charts {
	margin-top: 32rpx;
	padding-top: 24rpx;
	border-top: 1rpx solid #3f341a;
}

.player-h {
	font-size: 28rpx;
	font-weight: 600;
	color: #f5e6b3;
	display: block;
	margin-bottom: 12rpx;
}

.page {
	min-height: 100vh;
	padding: 24rpx;
	padding-bottom: 160rpx;
	background: #0b0b0d;
	box-sizing: border-box;
}
.card {
	background: #161616;
	border: 1rpx solid #5b4a20;
	border-radius: 20rpx;
	padding: 28rpx 24rpx;
}
.h1 {
	font-size: 34rpx;
	font-weight: 700;
	color: #f5e6b3;
	display: block;
	margin-bottom: 12rpx;
}
.tip {
	font-size: 24rpx;
	color: #bfa56a;
	display: block;
	margin-bottom: 24rpx;
	line-height: 1.5;
}
.row {
	display: flex;
	align-items: center;
	margin-bottom: 20rpx;
}
.label {
	width: 160rpx;
	font-size: 28rpx;
	color: #dcc58a;
}
.field {
	flex: 1;
	height: 72rpx;
	padding: 0 20rpx;
	background: #222;
	border: 1rpx solid #6d5825;
	border-radius: 12rpx;
	font-size: 28rpx;
}
.status {
	margin-bottom: 20rpx;
}
.st {
	display: block;
	font-size: 26rpx;
	color: #f5e6b3;
	margin-top: 8rpx;
}
.ctrl {
	margin-bottom: 24rpx;
}
.picker-inner {
	padding: 20rpx;
	background: #2a2415;
	color: #f5e6b3;
	border-radius: 12rpx;
	font-size: 28rpx;
	margin-bottom: 16rpx;
}
.btn {
	margin-top: 12rpx;
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
.btn.danger {
	background: #3b1f1a;
	color: #f0c2a8;
	border: 1rpx solid #7a3a2d;
}
.btn.ghost {
	background: #2a2415;
	color: #f5e6b3;
	border: 1rpx solid #6d5825;
}
.list-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #f5e6b3;
	display: block;
	margin-bottom: 12rpx;
}
.li {
	display: flex;
	justify-content: space-between;
	padding: 16rpx 0;
	border-bottom: 1rpx solid #3f341a;
	font-size: 26rpx;
}
.ph {
	color: #dcc58a;
}
.pr {
	color: #bfa56a;
}
.empty {
	font-size: 26rpx;
	color: #bfa56a;
}

.ranking {
	margin-top: 24rpx;
	padding-top: 18rpx;
	border-top: 1rpx solid #3f341a;
}
.footer {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
	background: linear-gradient(to top, #0b0b0d 90%, transparent);
}
.wide {
	width: 100%;
}
</style>
