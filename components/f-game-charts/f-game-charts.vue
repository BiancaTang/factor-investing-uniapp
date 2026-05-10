<template>
	<view class="charts">
		<view v-if="!hasData" class="empty">暂无对局数据</view>
		<template v-else>
			<!-- #ifdef H5 -->
			<template v-if="showNav">
				<view class="block">
					<text class="sub">{{ navChartTitle }}</text>
					<view class="chart-box">
						<view :id="idNav" class="chart-inner"></view>
					</view>
				</view>
			</template>
			<template v-if="showFactorCurve">
				<view class="block">
					<text class="sub">因子收益率曲线（累积）</text>
					<view class="chart-box">
						<view :id="idFc" class="chart-inner"></view>
					</view>
				</view>
			</template>
			<template v-if="showAttribution">
				<view class="block">
					<text class="sub">收益归因</text>
					<view class="chart-box">
						<view :id="idAtt" class="chart-inner"></view>
					</view>
				</view>
			</template>
			<!-- #endif -->
			<!--
				小程序端：不要用 v-if 切换「一张/三张」canvas，否则 onlyNav 时节点与 selectorQuery.in 时机易错位。
				始终挂载三个 type="2d" canvas，仅用 v-show 隐藏后两张（仅净值模式）。
			-->
			<!-- #ifndef H5 -->
			<view v-show="showNav" class="block">
				<text class="sub">{{ navChartTitle }}</text>
				<view class="chart-box">
					<canvas
						type="2d"
						:id="idNav"
						:canvas-id="idNav"
						class="chart-inner"
						disable-scroll
						:style="canvasStyle"
					></canvas>
				</view>
			</view>
			<view v-show="showFactorCurve" class="block">
				<text class="sub">因子收益率曲线（累积）</text>
				<view class="chart-box">
					<canvas
						type="2d"
						:id="idFc"
						:canvas-id="idFc"
						class="chart-inner"
						disable-scroll
						:style="canvasStyle"
					></canvas>
				</view>
			</view>
			<view v-show="showAttribution" class="block">
				<text class="sub">收益归因</text>
				<view class="chart-box">
					<canvas
						type="2d"
						:id="idAtt"
						:canvas-id="idAtt"
						class="chart-inner"
						disable-scroll
						:style="canvasStyle"
					></canvas>
				</view>
			</view>
			<!-- #endif -->
			<view v-if="factorInputRows.length" class="block">
				<text class="sub">玩家输入的十个因子值</text>
				<view class="factor-table">
					<view class="factor-head">
						<text class="c-round">轮次</text>
						<text v-for="c in factorColumns" :key="'h-' + c.key" class="c-val">{{ c.label }}</text>
					</view>
					<view v-for="r in factorInputRows" :key="'r-' + r.f_round_index" class="factor-row">
						<text class="c-round">第 {{ r.f_round_index }} 轮</text>
						<text v-for="c in factorColumns" :key="`v-${r.f_round_index}-${c.key}`" class="c-val">
							{{ r[c.key] }}
						</text>
					</view>
				</view>
			</view>
		</template>
	</view>
</template>

<script setup>
import { computed, watch, onMounted, getCurrentInstance } from 'vue'
import { F_FACTOR_DEFS } from '../../utils/f_gameLogic.js'

/** 小程序端用 px 高度，避免部分机型上 rpx 导致 canvas 实际高度为 0 */
const canvasStyle = computed(() => {
	let h = 240
	try {
		h = typeof uni.upx2px === 'function' ? uni.upx2px(480) : 240
	} catch (e) {}
	return { width: '100%', height: h + 'px' }
})
import { f_getStoredUser } from '../../utils/f_userStorage.js'
import { f_buildChartDataFromHistory } from '../../utils/f_factorEngine.js'
import { useFGameCharts } from '../../composables/useFGameCharts.js'

const vueInstance = getCurrentInstance()

const props = defineProps({
	history: {
		type: Array,
		default: () => []
	},
	/** 若传入则直接使用（如合并净值），优先级高于 history / navChartData */
	chartData: {
		type: Object,
		default: null
	},
	/**
	 * 仅覆盖「净值」曲线（nav_series / banker_series），因子累积与归因仍由 history 计算。
	 * 用于玩家端与管理员一致的多人净值对比。
	 */
	navChartData: {
		type: Object,
		default: null
	},
	/** 仅渲染净值一张图（与 chartData 配合做多人对比） */
	onlyNav: {
		type: Boolean,
		default: false
	},
	/** all: 三图+表；factorOnly: 仅因子收益率曲线+十因子表 */
	displayMode: {
		type: String,
		default: 'all'
	},
	navChartTitle: {
		type: String,
		default: '玩家净值曲线'
	},
	/** 与 Python `if_banker` / 房间 f_banker_intervene 一致 */
	ifBanker: {
		type: Boolean,
		default: false
	},
	/** 房间组数 player_nm，用于 banker_nav0 = floor(f_group_count/3) */
	fGroupCount: {
		type: Number,
		default: 20
	},
	/**
	 * 全房间玩家历史（与 Python 多槽位仿真一致）；有则用于因子累积/归因/净值，而非仅用 history 单人回放
	 */
	simulationPlayers: {
		type: Array,
		default: null
	},
	/** 当前用户 f_uid，用于在 simulationPlayers 中定位归因与本人净值曲线 */
	attributionPlayerId: {
		type: String,
		default: ''
	},
	/** 房间创建者 f_uid；开启 Banker 且房主参与对局时，其因子计入庄家槽（与 f_factorEngine 一致） */
	roomAdminUid: {
		type: String,
		default: ''
	}
})

const effectiveMode = computed(() => {
	if (props.onlyNav) return 'onlyNav'
	return props.displayMode === 'factorOnly' ? 'factorOnly' : 'all'
})
const showNav = computed(() => effectiveMode.value !== 'factorOnly')
const showFactorCurve = computed(() => effectiveMode.value !== 'onlyNav')
const showAttribution = computed(() => effectiveMode.value === 'all')

const chartPayload = computed(() => {
	if (props.chartData && typeof props.chartData === 'object') {
		return props.chartData
	}
	const u = f_getStoredUser() || {}
	const label = u.f_nick_name || 'player'
	const targetId = props.attributionPlayerId || u.f_uid || ''
	const gc = Math.max(1, parseInt(props.fGroupCount, 10) || 20)
	const baseOpts = {
		if_banker: props.ifBanker,
		f_group_count: gc,
		targetPlayerId: targetId,
		...(props.roomAdminUid && String(props.roomAdminUid).trim()
			? { f_admin_uid: String(props.roomAdminUid).trim() }
			: {})
	}
	let allList = null
	if (props.simulationPlayers && props.simulationPlayers.length > 0) {
		allList = props.simulationPlayers.map((p) => ({
			player_id: p.player_id != null ? String(p.player_id) : String(p.f_player_uid || ''),
			history: p.history || p.f_history || [],
			label:
				p.label != null && p.label !== ''
					? String(p.label)
					: String(p.f_nick_name || p.player_id || p.f_player_uid || '')
		}))
	}
	const own = f_buildChartDataFromHistory(props.history, label, {
		...baseOpts,
		...(allList ? { allPlayerHistories: allList } : {})
	})
	const nav = props.navChartData
	if (nav && typeof nav === 'object') {
		return {
			...own,
			nav_series: nav.nav_series != null ? nav.nav_series : own.nav_series,
			banker_series:
				nav.banker_series !== undefined ? nav.banker_series : own.banker_series
		}
	}
	return own
})

const hasData = computed(() => {
	const d = chartPayload.value
	if (!d) return false
	const ns = d.nav_series
	if (ns && ns.length) {
		for (const s of ns) {
			if (s && s.points && s.points.length) return true
		}
	}
	if (d.factor_cumulative && d.factor_cumulative.length) return true
	if (props.history && props.history.length) return true
	return false
})

const factorColumns = F_FACTOR_DEFS.map((d) => ({ key: d.key, label: d.label }))

const factorInputRows = computed(() => {
	const rows = Array.isArray(props.history) ? props.history : []
	return [...rows]
		.filter((r) => Number.isFinite(parseInt(r.f_round_index, 10)))
		.map((r) => {
			const out = { f_round_index: parseInt(r.f_round_index, 10) }
			for (const d of F_FACTOR_DEFS) {
				const v = Number(r[d.key])
				out[d.key] = Number.isFinite(v) ? Math.round(v) : 0
			}
			return out
		})
		.sort((a, b) => a.f_round_index - b.f_round_index)
})

const { idNav, idFc, idAtt, renderCharts, disposeAllCharts } = useFGameCharts(
	() => chartPayload.value,
	vueInstance,
	{
		getOnlyNav: () => props.onlyNav,
		getRenderMode: () => effectiveMode.value
	}
)

watch(
	chartPayload,
	() => {
		if (hasData.value) renderCharts()
	},
	{ deep: true }
)

onMounted(() => {
	if (hasData.value) renderCharts()
})
</script>

<style scoped>
.charts {
	margin-top: 8rpx;
}

.empty {
	font-size: 26rpx;
	color: #bfa56a;
	padding: 24rpx 0;
}

.block {
	margin-bottom: 28rpx;
}

.sub {
	font-size: 26rpx;
	color: #dcc58a;
	display: block;
	margin-bottom: 12rpx;
}

.chart-box {
	width: 100%;
	border: 1rpx solid #5b4a20;
	border-radius: 12rpx;
	overflow: hidden;
	background: #141414;
}

.chart-inner {
	width: 100%;
	height: 480rpx;
}

.factor-table {
	border: 1rpx solid #5b4a20;
	border-radius: 12rpx;
	overflow: hidden;
	background: #161616;
}

.factor-head,
.factor-row {
	display: flex;
	align-items: center;
	padding: 14rpx 12rpx;
	border-bottom: 1rpx solid #3f341a;
}

.factor-head {
	background: #211c10;
}

.factor-row:last-child {
	border-bottom: none;
}

.c-round {
	width: 120rpx;
	font-size: 22rpx;
	color: #dcc58a;
}

.c-val {
	flex: 1;
	min-width: 0;
	font-size: 20rpx;
	color: #f5e6b3;
	text-align: center;
}
</style>
