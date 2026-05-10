/**
 * 与 FastAPI FactorTradingGameAPI（Python）一致（若后端同步请对齐）：
 * - player_nm 个槽位，初始 nav：slot0=庄家时为 floor(player_nm/3)，其余为 1
 * - 每轮：各槽位暴露清零后写入本轮提交；因子收益率
 *   factor_ret_f = (Σ_i exp_i_f * nav_i) / (Σ_i nav_i) * unit_f / 10
 * - 各槽位 total_return = Σ_f exp_f * factor_ret_f，nav *= (1 + total_return)
 * - Banker：数据中的「第一轮」（最小 f_round_index）结算后，将 slot0 的 nav 重置为 1，其后各轮按上式滚动。
 * - 房主参与 Banker 时图表图例统一为「庄家」。
 * 图表仍由 ECharts 消费本文件产出的数据结构。
 */

import { F_FACTOR_DEFS } from './f_gameFactorSpec.js'

/** 管理员作为庄家时的图例名 */
export const F_BANKER_CHART_LABEL = '庄家'

const FACTORS = F_FACTOR_DEFS.map((d) => d.internal)
const FAC_TO_INTERNAL = Object.fromEntries(F_FACTOR_DEFS.map((d) => [d.key, d.internal]))
const FACTOR_UNIT_RETURNS = Object.fromEntries(
	F_FACTOR_DEFS.map((d) => [d.internal, d.unitReturn])
)

function f_clampInt(v) {
	const n = Math.round(Number(v))
	if (!Number.isFinite(n)) return 0
	return Math.max(-5, Math.min(5, n))
}

function f_emptyExposureRow() {
	const o = {}
	for (const f of FACTORS) o[f] = 0
	return o
}

/**
 * @param {Array<{ player_id: string, history: any[] }>} allPlayerHistories
 * @param {{ if_banker?: boolean, f_group_count?: number, player_nm?: number, f_admin_uid?: string }} options
 *        若开启 Banker 且提供 f_admin_uid：房间管理员参与对局时占用槽位 0（庄家）；第一轮结算后庄家 nav=1；图表中显示为「庄家」。
 * @returns {{
 *   df_far_return: Array<Record<string, number>>,
 *   navByPlayerId: Map<string, Array<{ round: number, nav: number }>>,
 *   bankerNavByRound: Array<{ round: number, nav: number }> | null,
 *   attributionRowsByPlayerId: Map<string, Array<Record<string, number>>>
 * }}
 */
export function f_simulatePythonFactorGame(allPlayerHistories, options = {}) {
	const if_banker = !!options.if_banker
	const player_nm = Math.max(1, parseInt(options.f_group_count ?? options.player_nm ?? 20, 10) || 20)
	const banker_nav0 = Math.floor(player_nm / 3)
	const adminUid =
		if_banker && options.f_admin_uid != null && String(options.f_admin_uid).trim() !== ''
			? String(options.f_admin_uid).trim()
			: ''

	const roundSet = new Set()
	for (const p of allPlayerHistories || []) {
		for (const r of p.history || []) {
			const ri = parseInt(r.f_round_index, 10)
			if (Number.isFinite(ri)) roundSet.add(ri)
		}
	}
	const rounds = [...roundSet].sort((a, b) => a - b)

	const nav = new Array(player_nm).fill(1)
	if (if_banker) nav[0] = banker_nav0

	const uidBySlot = new Array(player_nm).fill(null)
	const slotByUid = new Map()
	const startSlot = if_banker ? 1 : 0

	if (if_banker) {
		if (adminUid) {
			uidBySlot[0] = adminUid
			slotByUid.set(adminUid, 0)
		} else {
			uidBySlot[0] = '__banker__'
		}
	}

	function assignSlot(uid) {
		if (slotByUid.has(uid)) return slotByUid.get(uid)
		for (let s = startSlot; s < player_nm; s++) {
			if (uidBySlot[s] == null) {
				uidBySlot[s] = uid
				slotByUid.set(uid, s)
				return s
			}
		}
		return -1
	}

	const df_far_return = []
	const navByPlayerId = new Map()
	const bankerNavByRound = if_banker ? [] : null
	/** 每玩家每轮：round, 各因子 *_return, total_return, nav_after（与 Python df_all_perf 语义对齐） */
	const attributionRowsByPlayerId = new Map()

	/** 与 Python 一致：按接口/房间返回的玩家列表顺序占槽，勿按 player_id 字典序（否则槽位与 FastAPI 不一致） */
	const playersOrdered = [...(allPlayerHistories || [])]

	for (const round of rounds) {
		const exp = Array.from({ length: player_nm }, () => f_emptyExposureRow())

		for (const p of playersOrdered) {
			const row = (p.history || []).find(
				(h) => parseInt(h.f_round_index, 10) === round
			)
			if (!row) continue
			const uid = String(p.player_id)
			const s = assignSlot(uid)
			if (s < 0) continue
			for (const [facKey, internal] of Object.entries(FAC_TO_INTERNAL)) {
				exp[s][internal] = f_clampInt(row[facKey])
			}
		}

		let sumNav = 0
		for (let i = 0; i < player_nm; i++) sumNav += nav[i]
		const factor_return = {}
		for (const f of FACTORS) {
			let num = 0
			for (let i = 0; i < player_nm; i++) num += exp[i][f] * nav[i]
			const wgt = sumNav === 0 ? 0 : num / sumNav
			factor_return[f] = wgt * (FACTOR_UNIT_RETURNS[f] / 10)
		}

		const rowFar = { round }
		for (const f of FACTORS) rowFar[f] = factor_return[f]
		df_far_return.push(rowFar)

		const nextNav = new Array(player_nm)
		const slotTotalReturn = new Array(player_nm)
		const slotFactorRet = Array.from({ length: player_nm }, () => ({}))

		for (let i = 0; i < player_nm; i++) {
			let totalReturn = 0
			const factorReturns = {}
			for (const f of FACTORS) {
				const exposure = exp[i][f] || 0
				const fr = exposure * factor_return[f]
				factorReturns[f] = fr
				totalReturn += fr
			}
			slotTotalReturn[i] = totalReturn
			for (const f of FACTORS) slotFactorRet[i][f] = factorReturns[f]
			nextNav[i] = nav[i] * (totalReturn + 1)
		}

		// 对齐 gaming_process.py：Banker 的 nav 不做“首轮后重置为 1”，仅在展示时可归一化

		for (let i = 0; i < player_nm; i++) {
			nav[i] = nextNav[i]
			const uid = uidBySlot[i]
			if (!uid || uid === '__banker__') continue

			if (!navByPlayerId.has(uid)) navByPlayerId.set(uid, [])
			navByPlayerId.get(uid).push({ round, nav: nav[i] })

			const tr = slotTotalReturn[i]
			const attRow = { round, nav: nav[i], total_return: tr }
			for (const f of FACTORS) {
				attRow[f] = exp[i][f] || 0
				attRow[`${f}_return`] = slotFactorRet[i][f]
			}
			if (!attributionRowsByPlayerId.has(uid)) attributionRowsByPlayerId.set(uid, [])
			attributionRowsByPlayerId.get(uid).push(attRow)
		}

		if (if_banker && bankerNavByRound) {
			bankerNavByRound.push({ round, nav: nav[0] })
		}
	}

	return {
		df_far_return,
		navByPlayerId,
		bankerNavByRound,
		attributionRowsByPlayerId
	}
}

function f_buildFactorCumulative(df_far_return) {
	if (!df_far_return.length) return []
	const sortedFar = [...df_far_return].sort((a, b) => a.round - b.round)
	const cum = {}
	for (const f of FACTORS) cum[f] = 0
	return sortedFar.map((row) => {
		const out = { round: row.round }
		for (const f of FACTORS) {
			cum[f] += row[f] || 0
			out[f] = cum[f]
		}
		return out
	})
}

function f_normalizeNavPoints(points) {
	const arr = [...(points || [])].sort((a, b) => a.round - b.round)
	if (!arr.length) return []
	const n0 = Number(arr[0].nav)
	if (!Number.isFinite(n0) || n0 === 0) {
		return arr.map((p) => ({ round: p.round, nav: 1 }))
	}
	return arr.map((p) => ({ round: p.round, nav: Number(p.nav) / n0 }))
}

/**
 * @param {string} targetPlayerId
 * @param {string} displayLabel 图例 / player_id 展示名
 * @param {ReturnType<typeof f_simulatePythonFactorGame>} sim
 */
function f_chartPayloadForPlayer(targetPlayerId, displayLabel, sim) {
	const strId = String(displayLabel || targetPlayerId)
	const uid = String(targetPlayerId)
	const pts = sim.navByPlayerId.get(uid)
	const nav_series = []
	if (pts && pts.length) {
		const isBanker = strId === F_BANKER_CHART_LABEL
		const outPts = isBanker ? f_normalizeNavPoints(pts) : [...pts].sort((a, b) => a.round - b.round)
		nav_series.push({
			player_id: strId,
			num_id: 0,
			points: outPts
		})
	}

	let banker_series = null
	if (sim.bankerNavByRound && sim.bankerNavByRound.length) {
		const ptsb = [...sim.bankerNavByRound].sort((a, b) => a.round - b.round)
		const n0 = ptsb[0].nav
		banker_series = ptsb.map((p) => ({
			round: p.round,
			nav_norm: n0 === 0 ? 1 : p.nav / n0
		}))
	}

	const attRows = sim.attributionRowsByPlayerId.get(uid) || []
	const rounds = {}
	for (const row of attRows) {
		const r = row.round
		if (!rounds[r]) rounds[r] = { round: r }
		for (const f of FACTORS) {
			rounds[r][f] = row[`${f}_return`] || 0
		}
	}
	const attribution = [
		{
			player_id: strId,
			num_id: 0,
			by_round: Object.values(rounds).sort((a, b) => a.round - b.round)
		}
	]

	const factor_cumulative = f_buildFactorCumulative(sim.df_far_return)

	return {
		nav_series,
		banker_series,
		attribution,
		factor_cumulative
	}
}

/**
 * @param {any[]} rows 当前玩家历史（当未传 allPlayerHistories 时作为唯一玩家）
 * @param {string} playerId 展示用 id / 昵称
 * @param {object} [options]
 * @param {boolean} [options.if_banker]
 * @param {number} [options.f_group_count] player_nm
 * @param {Array<{ player_id: string, history: any[], label?: string }>} [options.allPlayerHistories] 全房间玩家；不传则仅 rows 一名玩家
 * @param {string} [options.targetPlayerId] 归因与净值曲线对应的用户 id（如 f_uid）；默认取 allPlayerHistories 中唯一一行或第一项
 * @param {string} [options.f_admin_uid] Banker 开启时房间创建者 uid；其参与对局时占用庄家槽，且不重复绘制「庄家归一」辅助线
 */
export function f_buildChartDataFromHistory(rows, playerId = 'player', options = {}) {
	let list = options.allPlayerHistories
	if (!list || !list.length) {
		const pid =
			options.targetPlayerId != null && String(options.targetPlayerId) !== ''
				? String(options.targetPlayerId)
				: 'solo'
		list = [{ player_id: pid, history: rows || [], label: String(playerId) }]
	}

	const sim = f_simulatePythonFactorGame(
		list.map((p) => ({ player_id: p.player_id, history: p.history || [] })),
		options
	)

	let tid =
		options.targetPlayerId != null && options.targetPlayerId !== ''
			? String(options.targetPlayerId)
			: null
	if (!tid && list.length === 1) tid = String(list[0].player_id)
	if (!tid) tid = String(list[0].player_id)

	const labelRow = list.find((p) => String(p.player_id) === tid)
	let displayLabel = (labelRow && labelRow.label) || String(playerId)
	if (
		!!options.if_banker &&
		options.f_admin_uid != null &&
		String(options.f_admin_uid).trim() === tid
	) {
		displayLabel = F_BANKER_CHART_LABEL
	}

	const out = f_chartPayloadForPlayer(tid, displayLabel, sim)
	if (
		!!options.if_banker &&
		options.f_admin_uid != null &&
		String(options.f_admin_uid).trim() === tid
	) {
		out.banker_series = null
	}
	return out
}

/**
 * 多人净值对比：同一套 Python 仿真，输出所有已提交玩家的 nav 线 + 庄家线。
 * @param {Array<{ player_id: string, history: any[], label?: string }>} allPlayerHistories
 * @param {{ if_banker?: boolean, f_group_count?: number, f_admin_uid?: string }} options
 */
export function f_buildJointNavCompareChartData(allPlayerHistories, options = {}) {
	const sim = f_simulatePythonFactorGame(
		(allPlayerHistories || []).map((p) => ({
			player_id: p.player_id,
			history: p.history || []
		})),
		options
	)

	const adminUid =
		options.f_admin_uid != null && String(options.f_admin_uid).trim() !== ''
			? String(options.f_admin_uid).trim()
			: ''

	const nav_series = []
	for (const p of allPlayerHistories || []) {
		const uid = String(p.player_id)
		const pts = sim.navByPlayerId.get(uid)
		if (!pts || !pts.length) continue
		const isBanker = !!options.if_banker && !!adminUid && uid === adminUid
		const outPts = isBanker ? f_normalizeNavPoints(pts) : [...pts].sort((a, b) => a.round - b.round)
		const leg =
			adminUid && uid === adminUid
				? F_BANKER_CHART_LABEL
				: p.label != null && p.label !== ''
					? String(p.label)
					: uid
		nav_series.push({
			player_id: leg,
			num_id: 0,
			points: outPts
		})
	}

	let banker_series = null
	if (sim.bankerNavByRound && sim.bankerNavByRound.length) {
		const ptsb = [...sim.bankerNavByRound].sort((a, b) => a.round - b.round)
		const n0 = ptsb[0].nav
		banker_series = ptsb.map((p) => ({
			round: p.round,
			nav_norm: n0 === 0 ? 1 : p.nav / n0
		}))
	}
	if (adminUid && (allPlayerHistories || []).some((p) => String(p.player_id) === adminUid)) {
		banker_series = null
	}

	return {
		nav_series,
		banker_series,
		attribution: [],
		factor_cumulative: []
	}
}

/**
 * @param {Array<ReturnType<typeof f_buildChartDataFromHistory>>} payloads
 * @deprecated 多人净值请改用 f_buildJointNavCompareChartData，保证与 Python 一致
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
