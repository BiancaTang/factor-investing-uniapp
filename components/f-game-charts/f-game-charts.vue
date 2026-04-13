<template>
	<view class="charts">
		<view v-if="!hasData" class="empty">暂无对局数据</view>
		<template v-else>
			<!-- #ifdef H5 -->
			<template v-if="onlyNav">
				<view class="block">
					<text class="sub">{{ navChartTitle }}</text>
					<view class="chart-box">
						<view :id="idNav" class="chart-inner"></view>
					</view>
				</view>
			</template>
			<template v-else>
				<view class="block">
					<text class="sub">{{ navChartTitle }}</text>
					<view class="chart-box">
						<view :id="idNav" class="chart-inner"></view>
					</view>
				</view>
				<view class="block">
					<text class="sub">因子收益率曲线（累积）</text>
					<view class="chart-box">
						<view :id="idFc" class="chart-inner"></view>
					</view>
				</view>
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
			<view class="block">
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
			<view v-show="!onlyNav" class="block">
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
			<view v-show="!onlyNav" class="block">
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
		</template>
	</view>
</template>

<script setup>
import { computed, watch, onMounted, getCurrentInstance } from 'vue'

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
	}
})

const chartPayload = computed(() => {
	if (props.chartData && typeof props.chartData === 'object') {
		return props.chartData
	}
	const phone = (f_getStoredUser() || {}).f_phone || 'player'
	const gc = Math.max(1, parseInt(props.fGroupCount, 10) || 20)
	const own = f_buildChartDataFromHistory(props.history, phone, {
		if_banker: props.ifBanker,
		f_group_count: gc
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

const { idNav, idFc, idAtt, renderCharts, disposeAllCharts } = useFGameCharts(
	() => chartPayload.value,
	vueInstance,
	{ getOnlyNav: () => props.onlyNav }
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
	color: #9ca3af;
	padding: 24rpx 0;
}

.block {
	margin-bottom: 28rpx;
}

.sub {
	font-size: 26rpx;
	color: #333;
	display: block;
	margin-bottom: 12rpx;
}

.chart-box {
	width: 100%;
	border: 1rpx solid #eee;
	border-radius: 12rpx;
	overflow: hidden;
	background: #fafafa;
}

.chart-inner {
	width: 100%;
	height: 480rpx;
}
</style>
