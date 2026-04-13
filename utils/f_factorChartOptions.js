/**
 * 将 chart_data 转为 ECharts option。
 * 与 f_export_score_pdf 中 PDF 折线一致：直线连接（无 smooth）、横轴为回合数值（与 PDF 的 x=round 对齐）。
 */

const FACTOR_KEYS = ['size', 'momentum', 'book_to_price', 'growth', 'residual_volatility']

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
		legend: { show: series.length > 1, bottom: 0, type: 'scroll', fontSize: 10 },
		grid: {
			left: 44,
			right: 16,
			top: 28,
			bottom: series.length > 1 ? 52 : 28
		},
		xAxis: { type: 'value', name: '回合', scale: true },
		yAxis: { type: 'value', name: '净值', scale: true },
		series
	}
}

export function buildFactorCumOption(chartData) {
	const fc = chartData?.factor_cumulative || []
	const series = FACTOR_KEYS.map((f) => ({
		name: f,
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
		legend: { bottom: 0, type: 'scroll', fontSize: 10 },
		grid: { left: 44, right: 12, top: 28, bottom: 64 },
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
		name: f,
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
		legend: { bottom: 0, type: 'scroll', fontSize: 10 },
		grid: { left: 44, right: 12, top: 40, bottom: 64 },
		xAxis: { type: 'value', name: '回合', scale: true },
		yAxis: { type: 'value', name: '收益率' },
		series
	}
}
