/**
 * 将 chart_data 转为 ECharts option。
 * 与 f_export_score_pdf 中 PDF 折线一致：直线连接（无 smooth）。
 * 横轴为整数轮次 category（一轮一格）；PDF 仍用连续 x=round。
 *
 * 注意：微信小程序 canvas 2d 上 legend.type: 'scroll' 底部分页按钮常无法点击，
 * 故统一使用 plain + 纵向/紧凑横向图例，避免分页控件。
 */

import { F_FACTOR_COLORS, F_FACTOR_COLOR_LIST } from './f_factorPalette.js'
import { F_FACTOR_INTERNAL_KEYS } from './f_gameFactorSpec.js'

const FACTOR_KEYS = F_FACTOR_INTERNAL_KEYS

/** 缩短图例文案，避免一行挤不下又去依赖 scroll */
const FACTOR_LEGEND_NAME = {
	size: 'size',
	beta: 'beta',
	momentum: 'mom',
	non_linear_size: 'nls',
	book_to_price: 'B/P',
	earnings_yield: 'EY',
	growth: 'grow',
	leverage: 'lev',
	liquidity: 'liq',
	residual_volatility: 'res_vol'
}

function fmtNumber(v, digits = 2) {
	const n = Number(v)
	if (!Number.isFinite(n)) return ''
	return n.toFixed(digits)
}

function pointLabel(digits) {
	return {
		show: true,
		position: 'top',
		distance: 6,
		fontSize: 9,
		color: '#f5e6b3',
		backgroundColor: 'rgba(0,0,0,0.55)',
		borderColor: 'rgba(212,175,55,0.55)',
		borderWidth: 1,
		borderRadius: 4,
		padding: [2, 4],
		formatter: (p) => {
			const val = Array.isArray(p.value) ? p.value[1] : p.value
			return fmtNumber(val, digits)
		}
	}
}

/** 十因子折线：标签放在点右侧，减轻与纵向图例、多条线之间的重叠 */
function factorPointLabel(digits, large = false) {
	return {
		show: true,
		position: 'right',
		distance: large ? 6 : 4,
		fontSize: large ? 11 : 8,
		color: '#f5e6b3',
		backgroundColor: 'rgba(0,0,0,0.55)',
		borderColor: 'rgba(212,175,55,0.45)',
		borderWidth: 1,
		borderRadius: 3,
		padding: large ? [2, 5] : [1, 3],
		formatter: (p) => {
			const val = Array.isArray(p.value) ? p.value[1] : p.value
			return fmtNumber(val, digits)
		}
	}
}

function lastRoundRow(rows) {
	if (!rows || !rows.length) return null
	return [...rows].sort((a, b) => Number(a.round) - Number(b.round)).pop() || null
}

/** 从多组数据合并去重后的整数轮次，作为 category 轴（一轮一格） */
function roundCategoriesFromRows(rows) {
	const seen = new Set()
	const list = []
	for (const row of [...rows].sort((a, b) => Number(a.round) - Number(b.round))) {
		const r = Math.round(Number(row.round))
		if (!Number.isFinite(r) || seen.has(r)) continue
		seen.add(r)
		list.push(String(r))
	}
	return list
}

function roundCategoriesFromNav(chartData) {
	const seen = new Set()
	const list = []
	const add = (round) => {
		const r = Math.round(Number(round))
		if (!Number.isFinite(r) || seen.has(r)) return
		seen.add(r)
		list.push(r)
	}
	for (const s of chartData?.nav_series || []) {
		for (const p of s.points || []) add(p.round)
	}
	for (const b of chartData?.banker_series || []) add(b.round)
	list.sort((a, b) => a - b)
	return list.map(String)
}

function seriesDataForRows(rows, field, categories) {
	const map = new Map()
	for (const row of rows) {
		const key = String(Math.round(Number(row.round)))
		const v = row[field]
		map.set(key, v != null ? Number(v) : null)
	}
	return categories.map((cat) => {
		const v = map.get(cat)
		return v != null && Number.isFinite(v) ? v : null
	})
}

function seriesDataForPoints(points, valueKey, categories) {
	const map = new Map()
	for (const p of points) {
		const key = String(Math.round(Number(p.round)))
		const v = Number(p[valueKey])
		map.set(key, Number.isFinite(v) ? v : null)
	}
	return categories.map((cat) => {
		const v = map.get(cat)
		return v != null && Number.isFinite(v) ? v : null
	})
}

/** 分类横轴：整数轮次，每轮等宽一格 */
function buildRoundCategoryXAxis(categories, large = false) {
	return {
		type: 'category',
		name: '回合',
		nameTextStyle: { fontSize: large ? 12 : 10 },
		data: categories,
		boundaryGap: true,
		axisLabel: { interval: 0, fontSize: large ? 12 : 9 },
		axisTick: { alignWithLabel: true },
		splitLine: {
			show: categories.length > 0,
			lineStyle: { color: 'rgba(212,175,55,0.18)', type: 'dashed' }
		}
	}
}

/** 右侧图例：因子名 + 最后一轮数值 */
function buildFactorLegend(lastRow, digits = 4, large = false) {
	const valueByName = {}
	if (lastRow) {
		for (const f of FACTOR_KEYS) {
			const name = FACTOR_LEGEND_NAME[f] || f
			valueByName[name] = fmtNumber(lastRow[f], digits)
		}
	}
	return {
		show: true,
		type: 'plain',
		orient: 'vertical',
		right: large ? 4 : 2,
		top: large ? 8 : 12,
		bottom: large ? 8 : 12,
		itemGap: large ? 6 : 4,
		itemWidth: large ? 14 : 10,
		itemHeight: large ? 10 : 8,
		textStyle: { fontSize: large ? 11 : 8, width: large ? 120 : 96, overflow: 'truncate' },
		selectedMode: true,
		formatter(name) {
			const val = valueByName[name]
			if (val == null || val === '') return name
			return `${name}  ${val}`
		}
	}
}

const FACTOR_CHART_GRID = {
	left: 44,
	right: 108,
	top: 28,
	bottom: 24
}

const FACTOR_CHART_TOOLTIP = {
	trigger: 'axis',
	confine: true,
	textStyle: { fontSize: 10 }
}

export function buildNavOption(chartData) {
	const nav = chartData?.nav_series || []
	const categories = roundCategoriesFromNav(chartData)
	const series = nav.map((s) => ({
		name: String(s.player_id),
		type: 'line',
		smooth: false,
		symbol: 'circle',
		symbolSize: 6,
		data: seriesDataForPoints(s.points || [], 'nav', categories),
		label: pointLabel(2)
	}))
	const bs = chartData?.banker_series
	if (bs && bs.length) {
		series.push({
			name: '庄家(归一化)',
			type: 'line',
			smooth: false,
			symbol: 'diamond',
			symbolSize: 5,
			lineStyle: { type: 'dashed', width: 2 },
			data: seriesDataForPoints(
				bs.map((b) => ({ round: b.round, nav: b.nav_norm })),
				'nav',
				categories
			),
			label: pointLabel(3)
		})
	}
	const multi = series.length > 1
	return {
		color: [
			'#5470c6',
			'#91cc75',
			'#fac858',
			'#ee6666',
			'#73c0de',
			'#3ba272',
			'#fc8452',
			'#9a60b4',
			'#ea7ccc',
			'#63869e',
			'#c4ccd3'
		],
		tooltip: { trigger: 'axis' },
		legend: multi
			? {
					show: true,
					type: 'plain',
					orient: 'vertical',
					right: 4,
					top: 'middle',
					itemGap: 6,
					itemWidth: 10,
					itemHeight: 9,
					textStyle: { fontSize: 9, width: 68, overflow: 'truncate' }
				}
			: { show: false },
		grid: {
			left: 44,
			right: multi ? 76 : 16,
			top: 28,
			bottom: 32
		},
		xAxis: buildRoundCategoryXAxis(categories),
		yAxis: { type: 'value', name: '净值', scale: true },
		series
	}
}

export function buildFactorCumOption(chartData, opts = {}) {
	const fc = chartData?.factor_cumulative || []
	const noAnim = !!opts.static
	const large = !!opts.large
	const categories = roundCategoriesFromRows(fc)
	const lastRow = lastRoundRow(fc)
	const series = FACTOR_KEYS.map((f) => ({
		name: FACTOR_LEGEND_NAME[f] || f,
		type: 'line',
		smooth: false,
		symbol: 'circle',
		symbolSize: large ? 7 : 4,
		animation: !noAnim,
		lineStyle: { color: F_FACTOR_COLORS[f], width: large ? 2 : 1 },
		itemStyle: { color: F_FACTOR_COLORS[f] },
		data: seriesDataForRows(fc, f, categories),
		label: factorPointLabel(4, large)
	}))
	const grid = large
		? { left: 52, right: 128, top: 16, bottom: 40 }
		: { ...FACTOR_CHART_GRID, bottom: 32 }
	return {
		animation: !noAnim,
		animationDuration: noAnim ? 0 : undefined,
		color: F_FACTOR_COLOR_LIST,
		tooltip: {
			...FACTOR_CHART_TOOLTIP,
			textStyle: { fontSize: large ? 13 : 10 }
		},
		legend: buildFactorLegend(lastRow, 4, large),
		grid,
		xAxis: buildRoundCategoryXAxis(categories, large),
		yAxis: {
			type: 'value',
			name: '累积',
			nameTextStyle: { fontSize: large ? 12 : 10 },
			axisLabel: { fontSize: large ? 12 : 10 }
		},
		series
	}
}

export function buildAttributionOption(chartData, opts = {}) {
	const list = chartData?.attribution || []
	const att = list[0]
	const br = att?.by_round || []
	const noAnim = !!opts.static
	const large = !!opts.large
	if (!br.length) {
		return {
			animation: false,
			xAxis: buildRoundCategoryXAxis([], large),
			yAxis: { type: 'value' },
			series: []
		}
	}
	const categories = roundCategoriesFromRows(br)
	const lastRow = lastRoundRow(br)
	const series = FACTOR_KEYS.map((f) => ({
		name: FACTOR_LEGEND_NAME[f] || f,
		type: 'line',
		smooth: false,
		symbolSize: large ? 7 : 4,
		lineStyle: { color: F_FACTOR_COLORS[f], width: large ? 2 : 1 },
		animation: !noAnim,
		itemStyle: { color: F_FACTOR_COLORS[f] },
		data: seriesDataForRows(br, f, categories),
		label: factorPointLabel(4, large)
	}))
	const grid = large
		? { left: 52, right: 128, top: 16, bottom: 40 }
		: { ...FACTOR_CHART_GRID, top: 36, bottom: 32 }
	return {
		animation: !noAnim,
		animationDuration: noAnim ? 0 : undefined,
		title: large
			? undefined
			: {
					text: att.player_id ? `收益归因（${att.player_id}）` : '收益归因',
					left: 'center',
					top: 4,
					textStyle: { fontSize: 12 }
				},
		color: F_FACTOR_COLOR_LIST,
		tooltip: {
			...FACTOR_CHART_TOOLTIP,
			textStyle: { fontSize: large ? 13 : 10 }
		},
		legend: buildFactorLegend(lastRow, 4, large),
		grid,
		xAxis: buildRoundCategoryXAxis(categories, large),
		yAxis: {
			type: 'value',
			name: '收益率',
			nameTextStyle: { fontSize: large ? 12 : 10 },
			axisLabel: { fontSize: large ? 12 : 10 }
		},
		series
	}
}
