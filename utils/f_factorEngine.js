/**
 * 与 uniapp/cloudfunctions/factor-game/gameCore.js 及 nz_gaming_process_server.py 对齐：
 * 单人回放时用当前玩家在 f_game_round 中的各轮暴露；若 if_banker 则按 Python 中逻辑加入
 * 初始净值为 banker_nav0=floor(player_nm/3)、暴露为 0 的庄家参与净值加权定价。
 */

const FACTORS = ['size', 'momentum', 'book_to_price', 'growth', 'residual_volatility']

const FAC_TO_INTERNAL = {
	fac_size: 'size',
	fac_momentum: 'momentum',
	fac_book_to_price: 'book_to_price',
	fac_growth: 'growth',
	fac_residual_volatility: 'residual_volatility'
}

const FACTOR_UNIT_RETURNS = {
	size: 0.05,
	momentum: 0.02,
	book_to_price: 0.01,
	growth: 0.03,
	residual_volatility: 0.01
}

function f_clampInt(v) {
	const n = Math.round(Number(v))
	if (!Number.isFinite(n)) return 0
	return Math.max(-5, Math.min(5, n))
}

function emptyPlayer(nav) {
	const p = { nav }
	for (const f of FACTORS) p[f] = 0
	return p
}

/**
 * @param rows 各轮因子提交记录
 * @param playerId 展示用（如手机号）
 * @param {object} [options]
 * @param {boolean} [options.if_banker] 与 Python `if_banker` 一致，是否启用庄家参与加权
 * @param {number} [options.f_group_count] 房间组数，对应 Python `player_nm`，用于 banker_nav0 = floor(player_nm/3)
 * @param {number} [options.player_nm] 同 f_group_count
 */
export function f_buildChartDataFromHistory(rows, playerId = 'player', options = {}) {
	const if_banker = !!options.if_banker
	const player_nm = Math.max(1, parseInt(options.f_group_count ?? options.player_nm, 10) || 20)
	const banker_nav0 = Math.floor(player_nm / 3)

	const sorted = [...(rows || [])].sort((a, b) => a.f_round_index - b.f_round_index)
	const human = emptyPlayer(1.0)
	const banker = if_banker ? emptyPlayer(banker_nav0) : null

	const df_far_return = []
	const df_all_perf = []
	const bankerNavByRound = []

	for (const raw of sorted) {
		const round = Number(raw.f_round_index)
		for (const [facKey, internal] of Object.entries(FAC_TO_INTERNAL)) {
			human[internal] = f_clampInt(raw[facKey])
		}

		const factor_return = {}
		if (if_banker && banker) {
			const navSum = (banker.nav || 0) + (human.nav || 0)
			for (const f of FACTORS) {
				const num = (human[f] || 0) * (human.nav || 0)
				const wgt = navSum === 0 ? 0 : num / navSum
				factor_return[f] = wgt * (FACTOR_UNIT_RETURNS[f] / 10)
			}
		} else {
			const navSum = human.nav || 0
			for (const f of FACTORS) {
				const num = (human[f] || 0) * (human.nav || 0)
				const wgt = navSum === 0 ? 0 : num / navSum
				factor_return[f] = wgt * (FACTOR_UNIT_RETURNS[f] / 10)
			}
		}

		const rowFar = { round }
		for (const f of FACTORS) rowFar[f] = factor_return[f]
		df_far_return.push(rowFar)

		let totalReturn = 0
		const factorReturns = {}
		for (const f of FACTORS) {
			const exposure = human[f] || 0
			const fr = exposure * factor_return[f]
			factorReturns[f] = fr
			totalReturn += fr
		}
		human.nav = human.nav * (totalReturn + 1)

		const rowPerf = {
			Player_ID: 0,
			round,
			nav: human.nav,
			total_return: totalReturn
		}
		for (const f of FACTORS) {
			rowPerf[f] = human[f] || 0
			rowPerf[`${f}_return`] = factorReturns[f]
		}
		df_all_perf.push(rowPerf)

		if (if_banker && banker) {
			bankerNavByRound.push({ round, nav: banker.nav })
		}
	}

	const byPlayer = {}
	for (const row of df_all_perf) {
		const pid = row.Player_ID
		if (!byPlayer[pid]) byPlayer[pid] = []
		byPlayer[pid].push({ round: row.round, nav: row.nav })
	}

	const nav_series = []
	const pid = 0
	const strId = String(playerId)
	if (byPlayer[pid] && byPlayer[pid].length) {
		nav_series.push({
			player_id: strId,
			num_id: pid,
			points: [...byPlayer[pid]].sort((a, b) => a.round - b.round)
		})
	}

	let banker_series = null
	if (if_banker && bankerNavByRound.length) {
		const pts = [...bankerNavByRound].sort((a, b) => a.round - b.round)
		const n0 = pts[0].nav
		banker_series = pts.map((p) => ({
			round: p.round,
			nav_norm: n0 === 0 ? 1 : p.nav / n0
		}))
	}

	const attribution = []
	const rounds = {}
	for (const row of df_all_perf) {
		if (row.Player_ID !== 0) continue
		const r = row.round
		if (!rounds[r]) rounds[r] = { round: r }
		for (const f of FACTORS) {
			rounds[r][f] = row[`${f}_return`] || 0
		}
	}
	attribution.push({
		player_id: strId,
		num_id: 0,
		by_round: Object.values(rounds).sort((a, b) => a.round - b.round)
	})

	let factor_cumulative = []
	if (df_far_return.length) {
		const sortedFar = [...df_far_return].sort((a, b) => a.round - b.round)
		const cum = {}
		for (const f of FACTORS) cum[f] = 0
		factor_cumulative = sortedFar.map((row) => {
			const out = { round: row.round }
			for (const f of FACTORS) {
				cum[f] += row[f] || 0
				out[f] = cum[f]
			}
			return out
		})
	}

	return {
		nav_series,
		banker_series,
		attribution,
		factor_cumulative
	}
}

/**
 * 合并多名玩家的 chart 数据，仅用于「净值对比」一图多线（nav_series 合并；庄家线取首份 payload）。
 * @param {Array<ReturnType<typeof f_buildChartDataFromHistory>>} payloads
 * @param {{ if_banker?: boolean }} [options]
 */
export function f_mergeNavCompareChartData(payloads, options = {}) {
	const if_banker = !!options.if_banker
	const nav_series = []
	let banker_series = null
	for (const d of payloads || []) {
		if (!d) continue
		const ns = d.nav_series
		if (ns && ns.length) {
			for (const s of ns) {
				if (s && s.points && s.points.length) nav_series.push(s)
			}
		}
		if (if_banker && !banker_series && d.banker_series && d.banker_series.length) {
			banker_series = d.banker_series
		}
	}
	return {
		nav_series,
		banker_series,
		attribution: [],
		factor_cumulative: []
	}
}
