'use strict'

const { F_FACTOR_DEFS } = require('./f_gameFactorSpec.js')

const db = uniCloud.database()

const FACTOR_KEYS = F_FACTOR_DEFS.map((d) => d.key)

function f_normalizeRoomCode(event) {
	const raw = event.f_room_code != null ? event.f_room_code : event.f_room_id
	const t = String(raw || '')
		.replace(/\D/g, '')
		.slice(0, 4)
	return /^\d{4}$/.test(t) ? t : ''
}

/**
 * 大屏状态：对齐现有「因子博弈」库表 f_room / f_room_member / f_game_round（f_room_code、f_open_round_index）。
 * 阶段：候场 lobby | 本轮开放决策 decision | 游戏已结束 finale（与 f_game_ended 一致）。
 */
exports.main = async (event) => {
	const f_room_code = f_normalizeRoomCode(event || {})
	if (!f_room_code) {
		return { code: -1, message: '缺少或无效的房间号（须 4 位数字 f_room_code）' }
	}

	try {
		const roomRes = await db.collection('f_room').where({ f_room_code }).limit(1).get()
		if (!roomRes.data || !roomRes.data.length) {
			return { code: -1, message: '房间不存在' }
		}

		const room = roomRes.data[0]
		const openRi = parseInt(room.f_open_round_index, 10)
		const openRound = Number.isFinite(openRi) && openRi > 0 ? openRi : 0
		const maxRoundsCfg = parseInt(room.f_round_count, 10)
		const maxRounds = Number.isFinite(maxRoundsCfg) && maxRoundsCfg > 0 ? maxRoundsCfg : 99
		const maxPlayers = Math.max(1, parseInt(room.f_group_count, 10) || 20)
		const durSec = Math.max(1, parseInt(room.f_round_duration_sec, 10) || 300)
		const startedAt =
			typeof room.f_round_started_at === 'number'
				? room.f_round_started_at
				: parseInt(room.f_round_started_at, 10)
		const f_now = Date.now()
		let timeLeft = 0
		if (openRound > 0 && Number.isFinite(startedAt) && startedAt > 0) {
			const deadline = startedAt + durSec * 1000
			timeLeft = Math.max(0, Math.ceil((deadline - f_now) / 1000))
		}

		let currentPhase = 'lobby'
		if (room.f_game_ended) {
			currentPhase = 'finale'
		} else if (openRound > 0) {
			currentPhase = 'decision'
		}

		const memRes = await db
			.collection('f_room_member')
			.where({ f_room_code })
			.orderBy('f_joined_at', 'asc')
			.get()

		const roundsRes = await db
			.collection('f_game_round')
			.where({ f_room_code })
			.orderBy('f_round_index', 'desc')
			.limit(800)
			.get()

		const rows = roundsRes.data || []
		let maxRoundIndexAll = 0
		for (const row of rows) {
			const ri = parseInt(row.f_round_index, 10)
			if (Number.isFinite(ri) && ri > maxRoundIndexAll) maxRoundIndexAll = ri
		}
		/** 本轮已结束（管理员结束本轮后 openRound 归零），可展示复盘曲线；决策中 openRound>0 为 false */
		const chartsReviewUnlocked = maxRoundIndexAll > 0 && openRound === 0

		const bestByUid = new Map()
		for (const row of rows) {
			const uid = row.f_player_uid
			if (!uid) continue
			const ri = parseInt(row.f_round_index, 10)
			if (!Number.isFinite(ri)) continue
			const prev = bestByUid.get(uid)
			if (!prev || ri > prev.ri) {
				bestByUid.set(uid, { ri, row })
			}
		}

		const openRoundRows = openRound > 0 ? rows.filter((r) => parseInt(r.f_round_index, 10) === openRound) : []
		const submittedUids = new Set(openRoundRows.map((r) => r.f_player_uid).filter(Boolean))
		const roundRowByUid = new Map()
		for (const r of openRoundRows) {
			if (r.f_player_uid) roundRowByUid.set(r.f_player_uid, r)
		}

		const groupExposure = {}
		for (const k of FACTOR_KEYS) {
			const vals = openRoundRows.map((r) => Number(r[k] || 0)).filter((n) => Number.isFinite(n))
			if (!vals.length) {
				groupExposure[k] = 0
			} else {
				const avg = vals.reduce((a, b) => a + b, 0) / vals.length
				groupExposure[k] = Number(avg.toFixed(2))
			}
		}

		const memRows = memRes.data || []
		const players = memRows.map((m, idx) => {
			const uid = m.f_player_uid
			const openRow = openRound > 0 ? roundRowByUid.get(uid) : null
			const best = bestByUid.get(uid)
			const exposure = {}
			for (const k of FACTOR_KEYS) {
				if (openRow && openRow[k] != null) {
					exposure[k] = openRow[k]
				} else if (best && best.row && best.row[k] != null) {
					exposure[k] = best.row[k]
				} else {
					exposure[k] = 0
				}
			}
			let navStr = '1.0000'
			if (best && best.row && best.row.f_nav != null && Number.isFinite(Number(best.row.f_nav))) {
				navStr = Number(best.row.f_nav).toFixed(4)
			}
			return {
				uid,
				nickName: m.f_nick_name || `玩家${idx + 1}`,
				avatar: '',
				charId: null,
				charName: null,
				charFaction: null,
				nav: navStr,
				rank: idx + 1,
				exposure,
				hasSubmitted: openRound > 0 && submittedUids.has(uid)
			}
		})

		players.sort((a, b) => Number(b.nav) - Number(a.nav))
		players.forEach((p, i) => {
			p.rank = i + 1
		})

		const roundHistory = []
		const seenRi = new Set()
		for (const row of [...rows].sort((a, b) => parseInt(a.f_round_index, 10) - parseInt(b.f_round_index, 10))) {
			const ri = parseInt(row.f_round_index, 10)
			if (!Number.isFinite(ri) || seenRi.has(ri)) continue
			seenRi.add(ri)
			roundHistory.push({
				roundIndex: ri,
				eventCardId: null,
				eventName: null,
				playerReturns: {},
				factorReturns: {},
				skillUses: []
			})
		}

		const rowsAsc = [...rows].sort(
			(a, b) => parseInt(a.f_round_index, 10) - parseInt(b.f_round_index, 10)
		)
		const histByUid = new Map()
		for (const row of rowsAsc) {
			const uid = row.f_player_uid
			if (!uid) continue
			if (!histByUid.has(uid)) histByUid.set(uid, [])
			const ri = parseInt(row.f_round_index, 10)
			const h = { f_round_index: Number.isFinite(ri) ? ri : 0 }
			for (const k of FACTOR_KEYS) {
				const v = row[k]
				h[k] = v != null && Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0
			}
			const arr = histByUid.get(uid)
			const last = arr.length ? arr[arr.length - 1] : null
			if (last && last.f_round_index === h.f_round_index) {
				Object.assign(last, h)
			} else {
				arr.push(h)
			}
		}
		const simulationPlayers = memRows
			.map((m) => ({
				player_id: String(m.f_player_uid),
				label:
					(m.f_nick_name && String(m.f_nick_name).trim()) ||
					String(m.f_player_uid || '').slice(0, 8),
				history: histByUid.get(m.f_player_uid) || []
			}))
			.filter((p) => p.history.length > 0)

		const displayState = {
			roomId: f_room_code,
			roomName: `房间 ${f_room_code}`,
			maxPlayers,
			currentPhase,
			currentRoundIndex: openRound,
			maxRounds,
			timeLeft,
			players,
			submittedCount: submittedUids.size,
			totalPlayers: players.length,
			groupExposure,
			currentEvent: null,
			skillLog: [],
			roundHistory,
			ifBanker: !!room.f_banker_intervene,
			fGroupCount: maxPlayers,
			roomAdminUid: room.f_admin_uid != null ? String(room.f_admin_uid) : '',
			simulationPlayers,
			chartsReviewUnlocked,
			timestamp: Date.now()
		}

		return { code: 0, data: displayState }
	} catch (err) {
		console.error('[f_sync_display_state]', err)
		return { code: -1, message: err.message || '查询失败' }
	}
}
