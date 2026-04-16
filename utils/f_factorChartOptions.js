/**
 * 将 chart_data 转为 ECharts option。
 * 与 f_export_score_pdf 中 PDF 折线一致：直线连接（无 smooth）、横轴为回合数值（与 PDF 的 x=round 对齐）。
 *
 * 注意：微信小程序 canvas 2d 上 legend.type: 'scroll' 底部分页按钮常无法点击，
 * 故统一使用 plain + 纵向/紧凑横向图例，避免分页控件。
 */

const FACTOR_KEYS = ['size', 'momentum', 'book_to_price', 'growth', 'residual_volatility']

/** 缩短图例文案，避免一行挤不下又去依赖 scroll */
const FACTOR_LEGEND_NAME = {
	size: 'size',
	momentum: 'mom',
	book_to_price: 'B/P',
	growth: 'grow',
	residual_volatility: 'res_vol'
}

export function buildNavOption(chartData) {
	const nav = chartData?.nav_series || []
	const series = nav.map((s) => ({
		name: String(s.player_id),
		type: 'line',
		smooth: false,
		symbol: 'circle',
		symbolSize: 6,
		data: (s.points || []).map((p) => [Number(p.round), Number(p.nav)])
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
			data: bs.map((b) => [Number(b.round), Number(b.nav_norm)])
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
			bottom: 28
		},
		xAxis: { type: 'value', name: '回合', scale: true },
		yAxis: { type: 'value', name: '净值', scale: true },
		series
	}
}

export function buildFactorCumOption(chartData) {
	const fc = chartData?.factor_cumulative || []
	const series = FACTOR_KEYS.map((f) => ({
		name: FACTOR_LEGEND_NAME[f] || f,
		type: 'line',
		smooth: false,
		symbol: 'circle',
		symbolSize: 4,
		data: fc.map((row) => [
			Number(row.round),
			row[f] != null ? Number(row[f]) : 0
		])
	}))
	return {
		color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'],
		tooltip: { trigger: 'axis' },
		legend: {
			type: 'plain',
			orient: 'horizontal',
			left: 'center',
			bottom: 2,
			itemGap: 10,
			itemWidth: 10,
			itemHeight: 8,
			textStyle: { fontSize: 9 }
		},
		grid: { left: 44, right: 12, top: 28, bottom: 52 },
		xAxis: { type: 'value', name: '回合', scale: true },
		yAxis: { type: 'value', name: '累积' },
		series
	}
}

export function buildAttributionOption(chartData) {
	const list = chartData?.attribution || []
	const att = list[0]
	const br = att?.by_round || []
	if (!br.length) {
		return {
			xAxis: { type: 'value', scale: true },
			yAxis: { type: 'value' },
			series: []
		}
	}
	const series = FACTOR_KEYS.map((f) => ({
		name: FACTOR_LEGEND_NAME[f] || f,
		type: 'line',
		smooth: false,
		symbolSize: 4,
		data: br.map((row) => [
			Number(row.round),
			row[f] != null ? Number(row[f]) : 0
		])
	}))
	return {
		title: {
			text: att.player_id ? `收益归因（${att.player_id}）` : '收益归因',
			left: 'center',
			top: 4,
			textStyle: { fontSize: 12 }
		},
		color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'],
		tooltip: { trigger: 'axis' },
		legend: {
			type: 'plain',
			orient: 'horizontal',
			left: 'center',
			bottom: 2,
			itemGap: 10,
			itemWidth: 10,
			itemHeight: 8,
			textStyle: { fontSize: 9 }
		},
		grid: { left: 44, right: 12, top: 40, bottom: 52 },
		xAxis: { type: 'value', name: '回合', scale: true },
		yAxis: { type: 'value', name: '收益率' },
		series
	}
}
