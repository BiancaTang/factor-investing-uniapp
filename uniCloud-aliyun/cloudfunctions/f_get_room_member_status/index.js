'use strict'

const { f_pickFacFromRow, f_pickReturnFromRow } = require('./f_gameFactorSpec.js')

/**
 * 房间成员查看全员进度与各玩家 f_game_round 历史（与 f_get_room_player_status 的 f_data 结构一致），
 * 用于玩家端绘制与管理员相同的「多人净值对比」曲线。
 * 校验：f_player_uid 须在 f_room_member 中。
 */
const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_members = db.collection('f_room_member')
const f_rounds = db.collection('f_game_round')

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

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

exports.main = async (event) => {
	const f_player_uid = event.f_player_uid != null ? String(event.f_player_uid).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''

	if (!f_isPlayerUid(f_player_uid) || !/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '参数无效', f_data: null }
	}

	const memOk = await f_members.where({ f_room_code, f_player_uid }).limit(1).get()
	if (!memOk.data || !memOk.data.length) {
		return { f_code: 403, f_message: '仅房间成员可查看', f_data: null }
	}

	const room = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!room.data || !room.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}

	const row = room.data[0]
	const openRi = parseInt(row.f_open_round_index, 10)
	const f_open_round_index = Number.isFinite(openRi) && openRi >= 0 ? openRi : 0
	const dur = parseInt(row.f_round_duration_sec, 10)
	const startedAt = typeof row.f_round_started_at === 'number' ? row.f_round_started_at : parseInt(row.f_round_started_at, 10)

	const mem = await f_members.where({ f_room_code }).get()
	const memRows = [...(mem.data || [])].sort((a, b) => {
		const ta = typeof a.f_joined_at === 'number' ? a.f_joined_at : new Date(a.f_joined_at || 0).getTime()
		const tb = typeof b.f_joined_at === 'number' ? b.f_joined_at : new Date(b.f_joined_at || 0).getTime()
		return ta - tb
	})
	const uids = memRows.map((m) => m.f_player_uid).filter(Boolean)
	const nickByUid = {}
	for (const m of memRows) {
		if (m.f_player_uid) {
			nickByUid[m.f_player_uid] = (m.f_nick_name && String(m.f_nick_name).trim()) || m.f_player_uid.slice(0, 8)
		}
	}

	const rounds = await f_rounds.where({ f_room_code }).get()
	const maxByUid = {}
	const listByUid = {}
	for (const g of rounds.data || []) {
		const p = g.f_player_uid
		const ri = parseInt(g.f_round_index, 10)
		if (!p || !Number.isFinite(ri)) continue
		maxByUid[p] = Math.max(maxByUid[p] || 0, ri)
		if (!listByUid[p]) listByUid[p] = []
		listByUid[p].push({
			f_round_index: ri,
			...f_pickFacFromRow(g),
			f_nav: g.f_nav,
			f_total_return: g.f_total_return,
			...f_pickReturnFromRow(g)
		})
	}
	for (const p of Object.keys(listByUid)) {
		listByUid[p].sort((a, b) => a.f_round_index - b.f_round_index)
	}

	const f_players = uids.map((uid) => {
		const m = memRows.find((x) => x.f_player_uid === uid)
		const rid = m ? parseInt(m.f_role_id, 10) : NaN
		const r11 = m ? parseInt(m.f_role11_active_round, 10) : NaN
		const ra = m ? parseInt(m.f_role_active_round, 10) : NaN
		const rv0 = m && m.f_role_active_variant != null ? String(m.f_role_active_variant).trim().toUpperCase() : ''
		const rv = rv0 === 'B' ? 'B' : 'A'
		const roleName =
			m && m.f_role_name != null && String(m.f_role_name).trim() !== ''
				? String(m.f_role_name).trim()
				: null
		return {
			f_player_uid: uid,
			f_nick_name: nickByUid[uid] || uid.slice(0, 8),
			f_max_round_index: maxByUid[uid] || 0,
			f_history: listByUid[uid] || [],
			f_role_id: Number.isFinite(rid) && rid >= 1 && rid <= 11 ? rid : null,
			f_role_name: roleName,
			f_role11_active_round: Number.isFinite(r11) && r11 >= 0 ? r11 : 0,
			f_role_active_round: Number.isFinite(ra) && ra >= 0 ? ra : 0,
			f_role_active_variant: rv
		}
	})

	const adminUid = String(row.f_admin_uid || '').trim()
	const f_player_seat_used = memRows.filter((m) => m.f_player_uid && m.f_player_uid !== adminUid).length

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: {
			f_room_code,
			f_round_count: row.f_round_count,
			f_group_count: row.f_group_count,
			f_banker_intervene: !!row.f_banker_intervene,
			f_open_round_index,
			f_round_duration_sec: Number.isFinite(dur) && dur > 0 ? dur : 300,
			f_round_started_at: Number.isFinite(startedAt) && startedAt > 0 ? startedAt : 0,
			f_game_ended: !!row.f_game_ended,
			f_game_ended_at: row.f_game_ended_at || 0,
			f_admin_uid: row.f_admin_uid || '',
			f_join_locked: !!row.f_join_locked,
			f_player_seat_used,
			f_player_seat_max: 10,
			f_playing_started: row.f_playing_started === true,
			f_round_random_event_id: (() => {
				const n = parseInt(row.f_round_random_event_id, 10)
				return Number.isFinite(n) && n >= 0 ? n : 0
			})(),
			f_round_random_event_round: (() => {
				const n = parseInt(row.f_round_random_event_round, 10)
				return Number.isFinite(n) && n >= 0 ? n : 0
			})(),
			f_round_random_event_snapshot:
				row.f_round_random_event_snapshot && typeof row.f_round_random_event_snapshot === 'object'
					? row.f_round_random_event_snapshot
					: null,
			f_random_events_by_round: f_randomEventsByRoundForClient(row),
			f_skill_broadcast_seq: (() => {
				const n = parseInt(row.f_skill_broadcast_seq, 10)
				return Number.isFinite(n) && n >= 0 ? n : 0
			})(),
			f_skill_broadcast:
				row.f_skill_broadcast && typeof row.f_skill_broadcast === 'object' ? row.f_skill_broadcast : null,
			f_players
		}
	}
}
