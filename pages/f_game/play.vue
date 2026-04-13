<template>
	<view class="page">
		<view class="head">
			<text class="room">房间 {{ roomCode || '-' }}</text>
			<text class="meta">共 {{ totalRounds }} 轮 · 开放轮次 {{ openRoundLabel }}</text>
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
					activeColor="#111827"
					backgroundColor="#e5e7eb"
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
import { computed, reactive, ref } from 'vue'
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
import { f_buildChartDataFromHistory, f_mergeNavCompareChartData } from '../../utils/f_factorEngine.js'

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

const playersWithHistory = computed(() => {
	const ps = roomSnapshot.value && roomSnapshot.value.f_players
	if (!ps) return []
	return ps.filter((p) => p.f_history && p.f_history.length > 0)
})

/** 与管理员「房间观测」中多人净值对比一致；仅 1 名有提交时为 null，净值图退化为本人曲线 */
const compareNavChartData = computed(() => {
	const list = playersWithHistory.value
	if (list.length < 2) return null
	const ifb = roomIfBanker.value
	const gc = roomGroupCount.value
	const payloads = list.map((p) =>
		f_buildChartDataFromHistory(p.f_history, p.f_player_phone, { if_banker: ifb, f_group_count: gc })
	)
	return f_mergeNavCompareChartData(payloads, { if_banker: ifb })
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

/** 管理员已开启「下一轮」编号，与玩家将要打的 nextRoundIndex 一致时可进入输入 */
const nextRoundOpen = computed(() => {
	const open = roomInfo.value?.f_open_round_index
	const o = typeof open === 'number' ? open : parseInt(open, 10)
	const nextR = nextRoundIndex.value
	if (!Number.isFinite(o) || o <= 0) return false
	return o === nextR && nextR <= totalRounds.value
})

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
		if (!u || !u.f_phone) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			return
		}

		const lr = await f_listGameRoundsInCloud({
			f_room_code: rc,
			f_player_phone: u.f_phone
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
	if (!u || !u.f_phone || !/^\d{4}$/.test(rc)) {
		roomSnapshot.value = null
		return
	}
	try {
		const ms = await f_getRoomMemberStatusInCloud({
			f_room_code: rc,
			f_player_phone: u.f_phone
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
})

async function submitRound() {
	const u = f_getStoredUser()
	if (!u || !u.f_phone) return
	const cr = nextRoundIndex.value
	if (cr > totalRounds.value) return
	submitting.value = true
	try {
		const payload = {
			f_room_code: roomCode.value,
			f_player_phone: u.f_phone,
			f_round_index: cr,
			fac_size: factors.fac_size,
			fac_momentum: factors.fac_momentum,
			fac_book_to_price: factors.fac_book_to_price,
			fac_growth: factors.fac_growth,
			fac_residual_volatility: factors.fac_residual_volatility
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
	background: #f3f4f6;
	box-sizing: border-box;
}

.head {
	margin-bottom: 20rpx;
}

.room {
	display: block;
	font-size: 34rpx;
	font-weight: 700;
	color: #111827;
}

.meta {
	display: block;
	font-size: 26rpx;
	color: #6b7280;
	margin-top: 8rpx;
}

.banker {
	display: block;
	font-size: 24rpx;
	color: #b45309;
	margin-top: 6rpx;
}

.loading {
	text-align: center;
	padding: 80rpx;
	color: #6b7280;
}

.card {
	background: #fff;
	border-radius: 20rpx;
	padding: 28rpx 24rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #111827;
	display: block;
	margin-bottom: 24rpx;
}

.wait-tip {
	font-size: 26rpx;
	color: #6b7280;
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
	color: #374151;
}

.fac-num {
	font-size: 26rpx;
	font-weight: 600;
	color: #111827;
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
	background: #111827;
	color: #fff;
}

.btn.secondary {
	background: #e5e7eb;
	color: #374151;
}

.btn.ghost {
	background: #e5e7eb;
	color: #374151;
	margin-top: 24rpx;
}
</style>
