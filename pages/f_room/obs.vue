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
			<FRoundMarketEvent
				v-if="obsRoundMarketBanner"
				class="obs-market-event"
				variant="compact"
				:snapshot="obsRoundMarketBanner.snapshot"
				:open-round="obsRoundMarketBanner.openRound"
			/>
			<f-skill-broadcast-banner
				v-if="skillBroadcastLogObs.length"
				:log="skillBroadcastLogObs"
				variant="display"
			/>
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
					<text class="ph">
						{{ p.f_nick_name }}
						<text v-if="p.f_role_name" class="ph-role"> · {{ p.f_role_name }}</text>
						<text v-else-if="p.f_role_id" class="ph-role muted"> · 角色{{ p.f_role_id }}</text>
						<text v-else class="ph-role muted"> · 未选角</text>
					</text>
					<text class="pr">第 {{ p.f_max_round_index }} 轮</text>
				</view>
			</view>
			<view v-else-if="status" class="empty">暂无成员或未加入房间</view>

			<view v-if="status && status.f_game_ended && rankingList.length" class="ranking">
				<text class="list-title">累积净值 · 最终排名</text>
				<text class="ranking-hint">与净值对比图曲线终值一致</text>
				<view v-for="r in rankingList" :key="r.f_player_uid" class="li">
					<text class="ph">#{{ r.rank }} {{ r.f_nick_name }}</text>
					<text class="pr">净值 {{ r.f_nav_text }}</text>
				</view>
			</view>

			<view v-if="compareChartData" class="charts-wrap">
				<f-game-charts
					v-bind="chartSimRoleOptsObs"
					:chart-data="compareChartData"
					:only-nav="true"
					nav-chart-title="玩家净值对比（已提交玩家）"
				/>
			</view>
			<view v-for="p in playersWithHistory" :key="p.f_player_uid" class="player-charts">
				<text class="player-h">{{ p.f_nick_name }}</text>
				<f-game-charts
					v-bind="chartSimRoleOptsObs"
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
		<f-factor-intro-fab />
	</view>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FGameCharts from '../../components/f-game-charts/f-game-charts.vue'
import FRoundMarketEvent from '../../components/f-round-market-event/f-round-market-event.vue'
import FSkillBroadcastBanner from '../../components/f-skill-broadcast-banner/f-skill-broadcast-banner.vue'
import {
	f_skillBroadcastLogFromRoomData,
	f_skillToastTitleFromEntry
} from '../../utils/f_skillBroadcastLog.js'
import {
	f_buildJointNavCompareChartData,
	f_lastSimNavByPlayerId,
	f_simulatePythonFactorGame
} from '../../utils/f_factorEngine.js'
import {
	f_roundEventFactorMultipliersByRoundFromRoomMap,
	f_normalizeRandomEventsByRound
} from '../../utils/f_roundRandomEventMultipliers.js'
import { f_getStoredUser } from '../../utils/f_userStorage.js'
import { f_isAdmin } from '../../utils/f_role.js'
import { F_TEST_ROLE_ID } from '../../utils/f_roleTestRole.js'
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
const lastSkillSeqSeenObs = ref(0)
const skillSeqBootstrappedObs = ref(false)

const skillBroadcastLogObs = computed(() => f_skillBroadcastLogFromRoomData(status.value))

function processSkillBroadcastPayloadObs(data) {
	if (!data) return
	const seq = parseInt(data.f_skill_broadcast_seq, 10)
	const log = f_skillBroadcastLogFromRoomData(data)
	const latest = log.length ? log[log.length - 1] : null

	if (!skillSeqBootstrappedObs.value) {
		lastSkillSeqSeenObs.value = Number.isFinite(seq) && seq >= 1 ? seq : 0
		skillSeqBootstrappedObs.value = true
		return
	}
	if (!Number.isFinite(seq) || seq < 1 || !latest) return
	if (seq <= lastSkillSeqSeenObs.value) return
	lastSkillSeqSeenObs.value = seq
	const toastTitle = f_skillToastTitleFromEntry(latest) || '技能播报'
	uni.showToast({ title: toastTitle, icon: 'none', duration: 2200 })
}
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

/** 双数开放轮：本轮随机事件（与玩家端 / 大屏同源） */
const obsRoundMarketBanner = computed(() => {
	const s = status.value
	if (!s) return null
	const open = parseInt(s.f_open_round_index, 10)
	if (!Number.isFinite(open) || open <= 0 || open % 2 !== 0) return null
	const byR = s.f_random_events_by_round && typeof s.f_random_events_by_round === 'object' ? s.f_random_events_by_round : null
	const snapFromMap = byR && byR[String(open)] ? byR[String(open)] : null
	const snap = snapFromMap || s.f_round_random_event_snapshot
	const evR = parseInt(s.f_round_random_event_round, 10)
	if (!snap || typeof snap !== 'object' || !snap.name) return null
	if (!snapFromMap && (!Number.isFinite(evR) || evR !== open)) return null
	return { snapshot: snap, openRound: open }
})

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
		if (!p.f_player_uid || !Number.isFinite(rid) || rid < 1 || rid > 11) continue
		m[String(p.f_player_uid)] = rid
	}
	return m
}

function f_role11ActiveRoundByPlayerIdFromObs() {
	const ps = (status.value && status.value.f_players) || []
	const o = {}
	for (const p of ps) {
		const rid = parseInt(p.f_role_id, 10)
		if (rid !== F_TEST_ROLE_ID || !p.f_player_uid) continue
		const r11 = parseInt(p.f_role11_active_round, 10)
		if (Number.isFinite(r11) && r11 >= 1) o[String(p.f_player_uid)] = r11
	}
	return o
}

function f_role1_10ActiveRoundByPlayerIdFromObs() {
	const ps = (status.value && status.value.f_players) || []
	const o = {}
	for (const p of ps) {
		const rid = parseInt(p.f_role_id, 10)
		if (!p.f_player_uid || !Number.isFinite(rid) || rid < 1 || rid > 10) continue
		const ar = parseInt(p.f_role_active_round, 10)
		if (Number.isFinite(ar) && ar >= 1) o[String(p.f_player_uid)] = ar
	}
	return o
}

function f_roleActiveVariantByPlayerIdFromObs() {
	const ps = (status.value && status.value.f_players) || []
	const o = {}
	for (const p of ps) {
		if (!p.f_player_uid) continue
		const v0 = p.f_role_active_variant != null ? String(p.f_role_active_variant).trim().toUpperCase() : ''
		o[String(p.f_player_uid)] = v0 === 'B' ? 'B' : 'A'
	}
	return o
}

const mergedObsRandomEventsByRound = computed(() => {
	const s = status.value || {}
	if (s.f_random_events_by_round && typeof s.f_random_events_by_round === 'object') {
		const keys = Object.keys(s.f_random_events_by_round)
		if (keys.length > 0) return s.f_random_events_by_round
	}
	return f_normalizeRandomEventsByRound(s)
})

const roundEventFactorMultipliersByRoundObs = computed(() =>
	f_roundEventFactorMultipliersByRoundFromRoomMap(mergedObsRandomEventsByRound.value)
)

const chartSimRoleOptsObs = computed(() => ({
	roleIdByPlayerId: f_roleMapFromObsPlayers(),
	role1_10ActiveRoundByPlayerId: f_role1_10ActiveRoundByPlayerIdFromObs(),
	roleActiveVariantByPlayerId: f_roleActiveVariantByPlayerIdFromObs(),
	role11ActiveRoundByPlayerId: f_role11ActiveRoundByPlayerIdFromObs(),
	roundEventFactorMultipliersByRound: roundEventFactorMultipliersByRoundObs.value
}))

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
			roleIdByPlayerId: f_roleMapFromObsPlayers(),
			role1_10ActiveRoundByPlayerId: f_role1_10ActiveRoundByPlayerIdFromObs(),
			roleActiveVariantByPlayerId: f_roleActiveVariantByPlayerIdFromObs(),
			role11ActiveRoundByPlayerId: f_role11ActiveRoundByPlayerIdFromObs(),
			roundEventFactorMultipliersByRound: roundEventFactorMultipliersByRoundObs.value
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
	const withHist = ps.filter((p) => Array.isArray(p.f_history) && p.f_history.length > 0)
	if (!withHist.length) return []
	const simOpts = {
		if_banker: !!(status.value && status.value.f_banker_intervene),
		f_group_count: roomGroupCount.value,
		f_admin_uid: status.value && status.value.f_admin_uid ? String(status.value.f_admin_uid) : '',
		roleIdByPlayerId: f_roleMapFromObsPlayers(),
		role1_10ActiveRoundByPlayerId: f_role1_10ActiveRoundByPlayerIdFromObs(),
		roleActiveVariantByPlayerId: f_roleActiveVariantByPlayerIdFromObs(),
		role11ActiveRoundByPlayerId: f_role11ActiveRoundByPlayerIdFromObs(),
		roundEventFactorMultipliersByRound: roundEventFactorMultipliersByRoundObs.value
	}
	const navMap = f_lastSimNavByPlayerId(
		withHist.map((p) => ({
			player_id: String(p.f_player_uid || ''),
			history: p.f_history
		})),
		simOpts
	)
	const rows = withHist.map((p) => {
		const uid = String(p.f_player_uid || '')
		const navNorm = navMap.get(uid)
		return {
			f_player_uid: uid,
			f_nick_name: p.f_nick_name || p.f_player_uid,
			f_nav: navNorm != null && Number.isFinite(navNorm) ? navNorm : 0,
			f_round_index: (p.f_history[p.f_history.length - 1] && p.f_history[p.f_history.length - 1].f_round_index) || 0
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
		processSkillBroadcastPayloadObs(body.f_data)
		tick.value = Date.now()
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
		uni.navigateTo({
			url: '/pages/f_display/role-showcase?code=' + encodeURIComponent(rc)
		})
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
	margin-bottom: 12rpx;
}
.obs-market-event {
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
.ph-role {
	color: #e8c76b;
	font-weight: 600;
}
.ph-role.muted {
	color: #8a7a50;
	font-weight: 400;
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

.ranking-hint {
	display: block;
	font-size: 22rpx;
	color: #8a7a50;
	margin-bottom: 10rpx;
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
