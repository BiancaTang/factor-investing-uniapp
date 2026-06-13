'use strict'

const { F_FACTOR_DEFS } = require('./f_gameFactorSpec.js')

const db = uniCloud.database()

const FACTOR_KEYS = F_FACTOR_DEFS.map((d) => d.key)

function f_isHttpUrl(s) {
	return /^https?:\/\//i.test(String(s || ''))
}

function f_isCloudFileId(s) {
	const u = String(s || '').trim()
	if (!u) return false
	if (u.startsWith('cloud://')) return true
	return !f_isHttpUrl(u)
}

/** 批量读取 f_user_profile 头像，云存储 fileID 转为临时 HTTPS 链接供 H5 展示 */
async function f_avatarByUidMap(uids) {
	const out = {}
	const unique = [...new Set((uids || []).map((u) => String(u || '').trim()).filter(Boolean))]
	if (!unique.length) return out

	const _ = db.command
	const profRes = await db
		.collection('f_user_profile')
		.where({ f_uid: _.in(unique) })
		.field({ f_uid: true, f_avatar_url: true })
		.get()

	const cloudPairs = []
	for (const row of profRes.data || []) {
		const uid = row.f_uid ? String(row.f_uid) : ''
		const url = row.f_avatar_url != null ? String(row.f_avatar_url).trim() : ''
		if (!uid || !url) continue
		if (f_isCloudFileId(url)) {
			cloudPairs.push({ uid, fileID: url })
		} else if (f_isHttpUrl(url)) {
			out[uid] = url
		}
	}

	if (!cloudPairs.length) return out

	try {
		const fileList = cloudPairs.map((c) => c.fileID)
		const tempRes = await uniCloud.getTempFileURL({ fileList })
		const tempByFid = {}
		for (const item of tempRes.fileList || []) {
			if (item && item.fileID && item.tempFileURL) {
				tempByFid[item.fileID] = item.tempFileURL
			}
		}
		for (const { uid, fileID } of cloudPairs) {
			out[uid] = tempByFid[fileID] || ''
		}
	} catch (err) {
		console.error('[f_avatarByUidMap] getTempFileURL', err)
	}

	return out
}

function f_skillBroadcastLogForClient(row) {
	const raw = row.f_skill_broadcast_log
	if (Array.isArray(raw) && raw.length) {
		return raw.filter((e) => e && Array.isArray(e.lines) && e.lines.length)
	}
	const b = row.f_skill_broadcast
	if (b && typeof b === 'object' && Array.isArray(b.lines) && b.lines.length) {
		return [b]
	}
	return []
}

function f_normalizeRoomCode(event) {
	const raw = event.f_room_code != null ? event.f_room_code : event.f_room_id
	const t = String(raw || '')
		.replace(/\D/g, '')
		.slice(0, 4)
	return /^\d{4}$/.test(t) ? t : ''
}

/** 与 f_get_room_player_status / 小程序博弈页仿真参数一致 */
function f_roleMapsFromMembers(memRows) {
	const roleIdByPlayerId = {}
	const role1_10ActiveRoundByPlayerId = {}
	const roleActiveVariantByPlayerId = {}
	const role11ActiveRoundByPlayerId = {}
	for (const m of memRows || []) {
		const uid = m.f_player_uid ? String(m.f_player_uid) : ''
		if (!uid) continue
		const rid = parseInt(m.f_role_id, 10)
		if (Number.isFinite(rid) && rid >= 1 && rid <= 11) {
			roleIdByPlayerId[uid] = rid
		}
		if (Number.isFinite(rid) && rid >= 1 && rid <= 10) {
			const ar = parseInt(m.f_role_active_round, 10)
			if (Number.isFinite(ar) && ar >= 1) role1_10ActiveRoundByPlayerId[uid] = ar
		}
		const v0 =
			m.f_role_active_variant != null ? String(m.f_role_active_variant).trim().toUpperCase() : ''
		roleActiveVariantByPlayerId[uid] = v0 === 'B' ? 'B' : 'A'
		if (rid === 11) {
			const r11 = parseInt(m.f_role11_active_round, 10)
			if (Number.isFinite(r11) && r11 >= 1) role11ActiveRoundByPlayerId[uid] = r11
		}
	}
	return {
		roleIdByPlayerId,
		role1_10ActiveRoundByPlayerId,
		roleActiveVariantByPlayerId,
		role11ActiveRoundByPlayerId
	}
}

function f_randomEventsByRoundForClient(row) {
	const raw = row.f_random_events_by_round
	if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) return raw
	const rr = parseInt(row.f_round_random_event_round, 10)
	const snap = row.f_round_random_event_snapshot
	if (Number.isFinite(rr) && rr > 0 && rr % 2 === 0 && snap && typeof snap === 'object' && snap.name) {
		return { [String(rr)]: snap }
	}
	return {}
}

/** 双数轮且与房间登记轮次一致时，转为大屏 EventScreen 结构 */
function f_roomSnapshotToCurrentEvent(room, openRound) {
	if (!openRound || openRound % 2 !== 0) return null
	const map = f_randomEventsByRoundForClient(room)
	let snap = map[String(openRound)]
	if (!snap || typeof snap !== 'object' || !snap.name) {
		const evRound = parseInt(room.f_round_random_event_round, 10)
		if (!Number.isFinite(evRound) || evRound !== openRound) return null
		snap = room.f_round_random_event_snapshot
	}
	if (!snap || typeof snap !== 'object' || !snap.name) return null
	const UP = 1.18
	const DOWN = 1 / UP
	const effects = (snap.effects || []).map((e) => ({
		factor: e.internal,
		direction: e.direction === 'up' ? 'up' : 'down',
		multiplier: e.direction === 'up' ? UP : DOWN
	}))
	return {
		cardId: snap.cardId || `EVT-${String(snap.id || 0).padStart(2, '0')}`,
		name: snap.name,
		category: snap.sentimentLabel || (snap.sentiment === 'good' ? '利好' : '利空'),
		sentiment: snap.sentiment,
		lore: snap.lore || '',
		effects
	}
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

		let currentPhase = 'lobby'
		if (room.f_game_ended) {
			currentPhase = 'finale'
		} else if (openRound > 0) {
			currentPhase = 'decision'
		} else if (maxRoundIndexAll > 0) {
			currentPhase = 'review'
		}

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
		/** 复盘阶段 openRound=0：用最近已完成轮次的提交数据算群体因子与事件 */
		const exposureRound = openRound > 0 ? openRound : maxRoundIndexAll
		const exposureRoundRows =
			exposureRound > 0
				? rows.filter((r) => parseInt(r.f_round_index, 10) === exposureRound)
				: []
		const submittedUids = new Set(openRoundRows.map((r) => r.f_player_uid).filter(Boolean))
		const roundRowByUid = new Map()
		for (const r of openRoundRows) {
			if (r.f_player_uid) roundRowByUid.set(r.f_player_uid, r)
		}

		const groupExposure = {}
		for (const k of FACTOR_KEYS) {
			const vals = exposureRoundRows.map((r) => Number(r[k] || 0)).filter((n) => Number.isFinite(n))
			if (!vals.length) {
				groupExposure[k] = 0
			} else {
				const avg = vals.reduce((a, b) => a + b, 0) / vals.length
				groupExposure[k] = Number(avg.toFixed(2))
			}
		}

		const memRows = memRes.data || []
		const avatarByUid = await f_avatarByUidMap(memRows.map((m) => m.f_player_uid))
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
				avatar: avatarByUid[String(uid || '')] || '',
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

		const currentEvent = f_roomSnapshotToCurrentEvent(room, exposureRound)
		const roleMaps = f_roleMapsFromMembers(memRows)

		const skSeq = parseInt(room.f_skill_broadcast_seq, 10)
		const skBroadcast =
			room.f_skill_broadcast && typeof room.f_skill_broadcast === 'object' ? room.f_skill_broadcast : null
		const skLogEntries = f_skillBroadcastLogForClient(room)
		const skillLogFromBroadcast = []
		for (const entry of skLogEntries) {
			for (const text of entry.lines || []) {
				skillLogFromBroadcast.push({
					f_skill_name: text,
					f_char_name: '技能播报',
					f_player_uid: ''
				})
			}
		}

		let roundMarketSnapshot = null
		let roundMarketEventRound = 0
		if (openRound > 0 && openRound % 2 === 0) {
			const map = f_randomEventsByRoundForClient(room)
			let snap = map[String(openRound)]
			if (!snap || typeof snap !== 'object' || !snap.name) {
				const evR = parseInt(room.f_round_random_event_round, 10)
				if (Number.isFinite(evR) && evR === openRound) {
					snap = room.f_round_random_event_snapshot
				}
			}
			if (snap && typeof snap === 'object' && snap.name) {
				roundMarketSnapshot = snap
				roundMarketEventRound = openRound
			}
		}

		const displayState = {
			roomId: f_room_code,
			roomName: `房间 ${f_room_code}`,
			maxPlayers,
			currentPhase,
			currentRoundIndex: openRound > 0 ? openRound : maxRoundIndexAll,
			maxRounds,
			timeLeft,
			players,
			submittedCount: submittedUids.size,
			totalPlayers: players.length,
			groupExposure,
			currentEvent,
			roundMarketSnapshot,
			roundMarketEventRound,
			skillLog: skillLogFromBroadcast,
			skillBroadcastSeq: Number.isFinite(skSeq) && skSeq >= 0 ? skSeq : 0,
			skillBroadcast: skBroadcast,
			skillBroadcastLog: skLogEntries,
			roundHistory,
			ifBanker: !!room.f_banker_intervene,
			fGroupCount: maxPlayers,
			roomAdminUid: room.f_admin_uid != null ? String(room.f_admin_uid) : '',
			simulationPlayers,
			chartsReviewUnlocked,
			joinLocked: !!room.f_join_locked,
			playingStarted: room.f_playing_started === true,
			randomEventsByRound: f_randomEventsByRoundForClient(room),
			roleIdByPlayerId: roleMaps.roleIdByPlayerId,
			role1_10ActiveRoundByPlayerId: roleMaps.role1_10ActiveRoundByPlayerId,
			roleActiveVariantByPlayerId: roleMaps.roleActiveVariantByPlayerId,
			role11ActiveRoundByPlayerId: roleMaps.role11ActiveRoundByPlayerId,
			timestamp: Date.now()
		}

		return { code: 0, data: displayState }
	} catch (err) {
		console.error('[f_sync_display_state]', err)
		return { code: -1, message: err.message || '查询失败' }
	}
}
