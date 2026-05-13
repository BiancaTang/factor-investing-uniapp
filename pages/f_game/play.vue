<template>
	<view class="page">
		<view class="head">
			<text class="room">房间 {{ roomCode || '-' }}</text>
			<text class="meta">共 {{ totalRoundsLabel }} 轮 · 开放轮次 {{ openRoundLabel }} · 剩余 {{ roundCountdownLabel }}</text>
			<text v-if="roomInfo && roomInfo.f_banker_intervene" class="banker">Banker 介入：开</text>
		</view>

		<FRoundMarketEvent
			v-if="!loading && activeRoundMarketBanner"
			class="global-market-event"
			variant="compact"
			:snapshot="activeRoundMarketBanner.snapshot"
			:open-round="activeRoundMarketBanner.openRound"
		/>

		<view v-if="loading" class="loading">加载中…</view>

		<view v-else-if="phase === 'role_prep'" class="card">
			<text class="section-title">选角阶段</text>
			<text class="wait-tip">房间已锁定加入。管理员在「房间观测」点击「开始博弈」前，你可随时修改角色。</text>
			<button v-if="!isRoomAdmin" class="btn primary" @click="goRoleSelect">去选择 / 修改角色</button>
			<text v-else class="wait-tip">你是管理员：请在「房间观测」中点击「开始博弈」以锁定角色；玩家即可进入正式轮次。</text>
			<button class="btn ghost" :loading="refreshing" @click="refreshStatus">刷新状态</button>
		</view>

		<view v-else-if="phase === 'complete'" class="card">
			<text class="done-title">{{ roomEnded ? '游戏已结束' : `已完成全部 ${totalRoundsLabel} 轮` }}</text>
			<f-game-charts
				:key="'c-' + chartRefreshKey"
				v-bind="chartSimRoleOpts"
				:history="history"
				:nav-chart-data="compareNavChartData"
				nav-chart-title="玩家净值对比（已提交玩家）"
				:if-banker="roomIfBanker"
				:f-group-count="roomGroupCount"
				:room-admin-uid="roomInfo?.f_admin_uid || ''"
				:simulation-players="simulationPlayersForChart"
				:attribution-player-id="currentUserUid"
			/>
			<view v-if="roomEnded && rankingList.length" class="ranking">
				<text class="section-title">最终净值排名</text>
				<view v-for="r in rankingList" :key="r.f_player_uid" class="rank-row">
					<text class="rank-name">#{{ r.rank }} {{ r.f_nick_name }}</text>
					<text class="rank-nav">净值 {{ r.f_nav_text }}</text>
				</view>
			</view>
			<button class="btn ghost" @click="backHome">返回首页</button>
		</view>

		<view v-else-if="phase === 'waiting'" class="card">
			<view v-if="showMidGameRoleEntry" class="role-strip">
				<text class="role-strip-label">选角尚未锁定（未点「开始博弈」）时，可随时改选角色</text>
				<button v-if="!isRoomAdmin" type="button" class="btn ghost btn-compact" @click="goRoleSelect">
					去选择 / 修改角色
				</button>
				<button v-else type="button" class="btn ghost btn-compact" @click="goRoleSelect">打开选角页（查看）</button>
			</view>
			<text class="section-title">等待管理员开始第 {{ nextRoundIndex }} 轮</text>
			<text class="wait-tip">管理员在「房间观测」中开启本轮后，点击下方刷新即可继续。</text>
			<view class="intro-wrap">
				<text class="intro-title">因子配置说明（入门版）</text>
				<view v-for="item in factorIntroItems" :key="item.key" class="intro-item">
					<view class="intro-bar" :style="{ background: item.color }">
						<text class="intro-bar-text">{{ item.title }}</text>
					</view>
					<text class="intro-desc">{{ item.desc }}</text>
				</view>
			</view>
			<view v-if="history.length" class="wait-charts">
				<f-game-charts
					:key="'w-' + chartRefreshKey"
					v-bind="chartSimRoleOpts"
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
			<view v-if="showMidGameRoleEntry" class="role-strip">
				<text class="role-strip-label">选角尚未锁定时可改选角色</text>
				<button v-if="!isRoomAdmin" type="button" class="btn ghost btn-compact" @click="goRoleSelect">
					去选择 / 修改角色
				</button>
				<button v-else type="button" class="btn ghost btn-compact" @click="goRoleSelect">打开选角页（查看）</button>
			</view>
			<text class="section-title">第 {{ nextRoundIndex }} / {{ totalRoundsLabel }} 轮 · 设置十个因子（-5～5）</text>
			<view v-if="myRoleIdFromSnapshot === F_TEST_ROLE_ID" class="test-role-tip">
				<text class="test-role-tip-title">测试角色（11 号）</text>
				<text class="test-role-tip-body">
					主动：打开下方开关并在本轮点击「确认本轮」后生效——将「因子收益贡献」中最低的一项提至与最高项相同；本局每名玩家限
					1 次。被动：仅第 2 轮全局生效，净值步长额外 ×2（无单独开关）。
				</text>
				<text v-if="role11ActiveConsumed && role11ActiveUsedRound != null" class="test-role-tip-warn">
					测试主动已在第 {{ role11ActiveUsedRound }} 轮使用。
				</text>
				<view v-else class="role11-active-row">
					<text class="role11-active-label">本轮使用测试主动（本局 1 次）</text>
					<switch :checked="role11ActiveChecked" color="#3d7a52" @change="onRole11ActiveChange" />
				</view>
				<text v-if="nextRoundIndex === 2" class="test-role-tip-warn">
					当前将提交第 2 轮：被动已计入上方仿真；提交成功后会再次提示。
				</text>
			</view>
			<view v-if="history.length" class="wait-charts">
				<f-game-charts
					:key="'i-' + chartRefreshKey"
					v-bind="chartSimRoleOpts"
					:history="history"
					:nav-chart-data="compareNavChartData"
					display-mode="factorOnly"
					nav-chart-title="玩家净值对比（已提交玩家）"
					:if-banker="roomIfBanker"
					:f-group-count="roomGroupCount"
					:room-admin-uid="roomInfo?.f_admin_uid || ''"
					:simulation-players="simulationPlayersForChart"
					:attribution-player-id="currentUserUid"
				/>
			</view>
			<view class="intro-wrap">
				<text class="intro-title">因子配置说明（入门版）</text>
				<view v-for="item in factorIntroItems" :key="item.key" class="intro-item">
					<view class="intro-bar" :style="{ background: item.color }">
						<text class="intro-bar-text">{{ item.title }}</text>
					</view>
					<text class="intro-desc">{{ item.desc }}</text>
				</view>
			</view>
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
			<view v-if="showMidGameRoleEntry" class="role-strip">
				<text class="role-strip-label">选角尚未锁定时可改选角色</text>
				<button v-if="!isRoomAdmin" type="button" class="btn ghost btn-compact" @click="goRoleSelect">
					去选择 / 修改角色
				</button>
				<button v-else type="button" class="btn ghost btn-compact" @click="goRoleSelect">打开选角页（查看）</button>
			</view>
			<text class="section-title">第 {{ lastCompletedRound }} 轮结果</text>
			<view v-if="testRolePassiveReviewHint" class="passive-banner">
				<text>本局为第 2 轮：测试角色被动（净值步长 ×2）已计入上方净值与仿真。</text>
			</view>
			<f-game-charts
				:key="'r-' + chartRefreshKey"
				v-bind="chartSimRoleOpts"
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
		</view>
	</view>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import FGameCharts from '../../components/f-game-charts/f-game-charts.vue'
import FRoundMarketEvent from '../../components/f-round-market-event/f-round-market-event.vue'
import { F_FACTOR_DEFS, f_navReturnDbKey } from '../../utils/f_gameLogic.js'
import { f_getStoredUser } from '../../utils/f_userStorage.js'
import {
	f_getRoomInCloud,
	f_submitGameRoundInCloud,
	f_listGameRoundsInCloud,
	f_getRoomMemberStatusInCloud
} from '../../utils/f_gameApi.js'
import { f_buildJointNavCompareChartData, f_simulatePythonFactorGame } from '../../utils/f_factorEngine.js'
import {
	f_roundEventFactorMultipliersByRoundFromRoomMap,
	f_normalizeRandomEventsByRound
} from '../../utils/f_roundRandomEventMultipliers.js'
import { F_FACTOR_COLOR_BY_FAC_KEY } from '../../utils/f_factorPalette.js'
import { F_TEST_ROLE_ID } from '../../utils/f_roleTestRole.js'

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
/** 11 号测试主动：本轮提交是否勾选（每轮重置） */
const role11ActiveChecked = ref(false)
let timer = null

const factorIntroItems = computed(() =>
	F_FACTOR_DEFS.map((d) => ({
		key: d.internal,
		title: d.introTitle,
		desc: d.introDesc,
		color: F_FACTOR_COLOR_BY_FAC_KEY[d.key]
	}))
)

const factors = reactive(Object.fromEntries(F_FACTOR_DEFS.map((d) => [d.key, 0])))

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

const isRoomAdmin = computed(() => {
	const a = roomInfo.value && roomInfo.value.f_admin_uid
	return !!(a && currentUserUid.value && String(a) === currentUserUid.value)
})

/** 当前用户在快照中的角色 id（1～11），无则 null */
const myRoleIdFromSnapshot = computed(() => {
	const uid = currentUserUid.value
	if (!uid) return null
	const ps = (roomSnapshot.value && roomSnapshot.value.f_players) || []
	const me = ps.find((p) => String(p.f_player_uid || '') === uid)
	const rid = parseInt(me && me.f_role_id, 10)
	return Number.isFinite(rid) && rid >= 1 && rid <= 11 ? rid : null
})

/** 博弈已开始前：除选角页外，在候局/填因子/复盘也提供入口 */
const showMidGameRoleEntry = computed(() => {
	if (roomInfo.value?.f_join_locked !== true) return false
	if (roomInfo.value?.f_playing_started === true) return false
	const p = phase.value
	return p === 'waiting' || p === 'input' || p === 'review'
})

function goRoleSelect() {
	const rc = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
	if (!/^\d{4}$/.test(rc)) return
	uni.navigateTo({ url: '/pages/f_role_select/index?code=' + encodeURIComponent(rc) })
}

function onRole11ActiveChange(e) {
	role11ActiveChecked.value = !!(e && e.detail && e.detail.value)
}

const simulationPlayersForChart = computed(() => {
	const ps = roomSnapshot.value && roomSnapshot.value.f_players
	if (!ps || !ps.length) return []
	return ps.map((p) => ({
		player_id: p.f_player_uid,
		history: p.f_history || [],
		label: p.f_nick_name || p.f_player_uid
	}))
})

function f_roleIdByPlayerIdFromSnapshot() {
	const ps = (roomSnapshot.value && roomSnapshot.value.f_players) || []
	const m = {}
	for (const p of ps) {
		const rid = parseInt(p.f_role_id, 10)
		if (!p.f_player_uid || !Number.isFinite(rid) || rid < 1 || rid > 11) continue
		m[String(p.f_player_uid)] = rid
	}
	return m
}

/** 角色 11 已登记发动主动的轮次（来自成员表快照） */
function f_role11ActiveRoundByPlayerIdFromSnapshot() {
	const ps = (roomSnapshot.value && roomSnapshot.value.f_players) || []
	const o = {}
	for (const p of ps) {
		const rid = parseInt(p.f_role_id, 10)
		if (rid !== F_TEST_ROLE_ID || !p.f_player_uid) continue
		const r11 = parseInt(p.f_role11_active_round, 10)
		if (Number.isFinite(r11) && r11 >= 1) o[String(p.f_player_uid)] = r11
	}
	return o
}

const mergedRandomEventsByRound = computed(() => {
	const sn = roomSnapshot.value || {}
	const ri = roomInfo.value || {}
	const out = {}
	if (sn.f_random_events_by_round && typeof sn.f_random_events_by_round === 'object') {
		Object.assign(out, sn.f_random_events_by_round)
	}
	if (ri.f_random_events_by_round && typeof ri.f_random_events_by_round === 'object') {
		Object.assign(out, ri.f_random_events_by_round)
	}
	if (Object.keys(out).length > 0) return out
	return f_normalizeRandomEventsByRound({ ...sn, ...ri })
})

const roundEventFactorMultipliersByRound = computed(() =>
	f_roundEventFactorMultipliersByRoundFromRoomMap(mergedRandomEventsByRound.value)
)

const chartSimRoleOpts = computed(() => ({
	roleIdByPlayerId: f_roleIdByPlayerIdFromSnapshot(),
	role11ActiveRoundByPlayerId: f_role11ActiveRoundByPlayerIdFromSnapshot(),
	roundEventFactorMultipliersByRound: roundEventFactorMultipliersByRound.value
}))

/** 双数开放轮：与房间登记一致时展示本轮随机市场事件（叙事 + 已计入净值仿真） */
const activeRoundMarketBanner = computed(() => {
	const ri = roomInfo.value
	const rs = roomSnapshot.value
	const open = parseInt(ri && ri.f_open_round_index, 10)
	if (!Number.isFinite(open) || open <= 0 || open % 2 !== 0) return null
	const merged = mergedRandomEventsByRound.value
	const snap =
		(merged && merged[String(open)]) ||
		(rs && rs.f_round_random_event_snapshot) ||
		(ri && ri.f_round_random_event_snapshot) ||
		null
	const evR = parseInt(
		(rs && rs.f_round_random_event_round) != null ? rs.f_round_random_event_round : ri && ri.f_round_random_event_round,
		10
	)
	if (!snap || typeof snap !== 'object' || !snap.name) return null
	if (!(merged && merged[String(open)]) && (!Number.isFinite(evR) || evR !== open)) return null
	return { snapshot: snap, openRound: open }
})

const rankingList = computed(() => {
	const ps = (roomSnapshot.value && roomSnapshot.value.f_players) || []
	const ifBanker = !!(roomInfo.value && roomInfo.value.f_banker_intervene)
	const adminUid = roomInfo.value && roomInfo.value.f_admin_uid ? String(roomInfo.value.f_admin_uid) : ''
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
			roleIdByPlayerId: f_roleIdByPlayerIdFromSnapshot(),
			role11ActiveRoundByPlayerId: f_role11ActiveRoundByPlayerIdFromSnapshot(),
			roundEventFactorMultipliersByRound: roundEventFactorMultipliersByRound.value
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
			f_admin_uid: roomInfo.value?.f_admin_uid || '',
			roleIdByPlayerId: f_roleIdByPlayerIdFromSnapshot(),
			role11ActiveRoundByPlayerId: f_role11ActiveRoundByPlayerIdFromSnapshot(),
			roundEventFactorMultipliersByRound: roundEventFactorMultipliersByRound.value
		}
	)
})

const nextRoundIndex = computed(() => history.value.length + 1)

watch(nextRoundIndex, () => {
	role11ActiveChecked.value = false
})
const roomEnded = computed(() => !!(roomInfo.value && roomInfo.value.f_game_ended))
const isUnlimitedRounds = computed(() => {
	const n = roomInfo.value ? parseInt(roomInfo.value.f_round_count, 10) : 0
	return !Number.isFinite(n) || n <= 0
})
const totalRoundsLabel = computed(() => (isUnlimitedRounds.value ? '∞' : String(totalRounds.value)))

const lastCompletedRound = computed(() => {
	if (!history.value.length) return 0
	const sorted = [...history.value].sort((a, b) => b.f_round_index - a.f_round_index)
	return sorted[0].f_round_index
})

const testRolePassiveReviewHint = computed(
	() =>
		phase.value === 'review' &&
		myRoleIdFromSnapshot.value === F_TEST_ROLE_ID &&
		Number(lastCompletedRound.value) === 2
)

const role11ActiveConsumed = computed(() => {
	const uid = currentUserUid.value
	if (!uid) return false
	const ps = (roomSnapshot.value && roomSnapshot.value.f_players) || []
	const me = ps.find((p) => String(p.f_player_uid || '') === uid)
	if (!me || parseInt(me.f_role_id, 10) !== F_TEST_ROLE_ID) return false
	const r = parseInt(me.f_role11_active_round, 10)
	return Number.isFinite(r) && r >= 1
})

/** 已使用测试主动的轮次号（仅当为 11 号且已用时有效） */
const role11ActiveUsedRound = computed(() => {
	const uid = currentUserUid.value
	if (!uid) return null
	const ps = (roomSnapshot.value && roomSnapshot.value.f_players) || []
	const me = ps.find((p) => String(p.f_player_uid || '') === uid)
	if (!me || parseInt(me.f_role_id, 10) !== F_TEST_ROLE_ID) return null
	const r = parseInt(me.f_role11_active_round, 10)
	return Number.isFinite(r) && r >= 1 ? r : null
})

const canContinue = computed(() => {
	if (roomEnded.value) return false
	if (isUnlimitedRounds.value) return true
	return history.value.length < totalRounds.value
})

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
	return o === nextR && (isUnlimitedRounds.value || nextR <= totalRounds.value)
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

	if (roomEnded.value) {
		phase.value = 'complete'
		return
	}

	const joinLocked = roomInfo.value?.f_join_locked === true
	const playingStarted = roomInfo.value?.f_playing_started === true
	if (!roomEnded.value && joinLocked && !playingStarted) {
		phase.value = 'role_prep'
		return
	}
	if (!isUnlimitedRounds.value && h >= total) {
		phase.value = 'complete'
		return
	}
	if (preserveReview && phase.value === 'review') {
		if (open === nextR && (isUnlimitedRounds.value || nextR <= total)) {
			phase.value = 'input'
			resetFactors()
		}
		return
	}
	if (open === nextR && (isUnlimitedRounds.value || nextR <= total)) {
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
		const tr = parseInt(d.f_round_count, 10)
		totalRounds.value = Number.isFinite(tr) && tr > 0 ? tr : 0

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
	if (!isUnlimitedRounds.value && cr > totalRounds.value) return
	submitting.value = true
	try {
		const applyR11 =
			role11ActiveChecked.value &&
			myRoleIdFromSnapshot.value === F_TEST_ROLE_ID &&
			!role11ActiveConsumed.value
		const payload = {
			f_room_code: roomCode.value,
			f_player_uid: u.f_uid,
			f_round_index: cr,
			f_apply_role11_active: !!applyR11
		}
		for (const d of F_FACTOR_DEFS) {
			payload[d.key] = factors[d.key]
		}
		const metric = buildRoundMetricsForSubmit(payload)
		if (metric) {
			payload.f_nav = metric.f_nav
			payload.f_total_return = metric.f_total_return
			for (const d of F_FACTOR_DEFS) {
				const rk = f_navReturnDbKey(d.internal)
				if (metric[rk] != null) payload[rk] = metric[rk]
			}
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
		const ridSubmit = myRoleIdFromSnapshot.value
		const passive2 = ridSubmit === F_TEST_ROLE_ID && cr === 2
		if (passive2 && applyR11) {
			uni.showToast({
				title: '第2轮：被动净值步长×2；测试主动已发动（本局已用）',
				icon: 'none',
				duration: 3600
			})
		} else if (passive2) {
			uni.showToast({
				title: '测试角色被动已触发：第2轮净值步长×2',
				icon: 'none',
				duration: 3200
			})
		} else if (applyR11) {
			uni.showToast({
				title: `测试主动已发动（第 ${cr} 轮），本局已用`,
				icon: 'none',
				duration: 2800
			})
		}
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
							...Object.fromEntries(F_FACTOR_DEFS.map((d) => [d.key, payload[d.key]]))
						}
					: null
			]
				.filter(Boolean)
				.sort((a, b) => parseInt(a.f_round_index, 10) - parseInt(b.f_round_index, 10))
		}))

	const r11Base = f_role11ActiveRoundByPlayerIdFromSnapshot()
	const r11Map = { ...r11Base }
	if (
		role11ActiveChecked.value &&
		uid &&
		myRoleIdFromSnapshot.value === F_TEST_ROLE_ID &&
		!(Number.isFinite(r11Map[uid]) && r11Map[uid] >= 1)
	) {
		r11Map[uid] = round
	}

	const sim = f_simulatePythonFactorGame(list, {
		if_banker: roomIfBanker.value,
		f_group_count: roomGroupCount.value,
		f_admin_uid: roomInfo.value?.f_admin_uid || '',
		roleIdByPlayerId: f_roleIdByPlayerIdFromSnapshot(),
		role11ActiveRoundByPlayerId: r11Map,
		roundEventFactorMultipliersByRound: roundEventFactorMultipliersByRound.value
	})
	const rows = sim.attributionRowsByPlayerId.get(uid) || []
	const hit = rows.find((r) => parseInt(r.round, 10) === round)
	if (!hit) return null
	const metric = {
		f_nav: Number(hit.nav),
		f_total_return: Number(hit.total_return)
	}
	for (const d of F_FACTOR_DEFS) {
		const rk = f_navReturnDbKey(d.internal)
		const v = hit[`${d.internal}_return`]
		metric[rk] = Number.isFinite(Number(v)) ? Number(v) : 0
	}
	return metric
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

.global-market-event {
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

.intro-wrap {
	margin-bottom: 24rpx;
}

.intro-title {
	display: block;
	font-size: 26rpx;
	color: #f5e6b3;
	margin-bottom: 10rpx;
}

.intro-item {
	margin-bottom: 12rpx;
}

.intro-bar {
	border-radius: 10rpx;
	padding: 12rpx 16rpx;
}

.intro-bar-text {
	font-size: 26rpx;
	color: #fff;
}

.intro-desc {
	display: block;
	margin-top: 8rpx;
	font-size: 23rpx;
	line-height: 1.5;
	color: #dcc58a;
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

.role-strip {
	margin-bottom: 20rpx;
	padding: 16rpx 18rpx;
	background: #1a1810;
	border: 1rpx solid #4a3f1a;
	border-radius: 14rpx;
}

.role-strip-label {
	display: block;
	font-size: 24rpx;
	color: #bfa56a;
	line-height: 1.45;
	margin-bottom: 12rpx;
}

.btn-compact {
	margin-top: 0 !important;
	height: 72rpx !important;
	line-height: 72rpx !important;
	font-size: 26rpx !important;
}

.test-role-tip {
	margin-bottom: 20rpx;
	padding: 16rpx 18rpx;
	background: #1a2218;
	border: 1rpx solid #2d5a3a;
	border-radius: 14rpx;
}

.test-role-tip-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #7dce9e;
	margin-bottom: 8rpx;
}

.test-role-tip-body,
.test-role-tip-warn {
	display: block;
	font-size: 24rpx;
	color: #c8e6d0;
	line-height: 1.5;
}

.test-role-tip-warn {
	margin-top: 10rpx;
	color: #e6c86a;
	font-weight: 600;
}

.role11-active-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 14rpx;
	padding-top: 12rpx;
	border-top: 1rpx solid rgba(125, 206, 158, 0.25);
}

.role11-active-label {
	flex: 1;
	font-size: 24rpx;
	color: #c8e6d0;
	line-height: 1.45;
	padding-right: 16rpx;
}

.passive-banner {
	margin-bottom: 16rpx;
	padding: 14rpx 18rpx;
	background: #2a2210;
	border: 1rpx solid #8a7020;
	border-radius: 12rpx;
	font-size: 24rpx;
	color: #f0d78c;
	line-height: 1.45;
}

.ranking {
	margin-top: 26rpx;
	padding-top: 18rpx;
	border-top: 1rpx solid #3f341a;
}

.rank-row {
	display: flex;
	justify-content: space-between;
	padding: 12rpx 0;
	border-bottom: 1rpx solid #2a2415;
}

.rank-row:last-child {
	border-bottom: none;
}

.rank-name {
	font-size: 26rpx;
	color: #dcc58a;
}

.rank-nav {
	font-size: 26rpx;
	color: #f5e6b3;
}
</style>
