'use strict'

const { f_pickFacFromRow, f_pickReturnFromRow } = require('./f_gameFactorSpec.js')

const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_members = db.collection('f_room_member')
const f_rounds = db.collection('f_game_round')

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

exports.main = async (event) => {
	const f_admin_uid = event.f_admin_uid != null ? String(event.f_admin_uid).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''

	if (!f_isPlayerUid(f_admin_uid) || !/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '参数无效', f_data: null }
	}

	const room = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!room.data || !room.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}

	const row = room.data[0]
	if (row.f_admin_uid !== f_admin_uid) {
		return { f_code: 403, f_message: '仅房间创建管理员可查看', f_data: null }
	}

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

	const f_players = uids.map((f_player_uid) => {
		const m = memRows.find((x) => x.f_player_uid === f_player_uid)
		const rid = m ? parseInt(m.f_role_id, 10) : NaN
		const r11 = m ? parseInt(m.f_role11_active_round, 10) : NaN
		return {
			f_player_uid,
			f_nick_name: nickByUid[f_player_uid] || f_player_uid.slice(0, 8),
			f_max_round_index: maxByUid[f_player_uid] || 0,
			f_history: listByUid[f_player_uid] || [],
			f_role_id: Number.isFinite(rid) && rid >= 1 && rid <= 11 ? rid : null,
			f_role11_active_round: Number.isFinite(r11) && r11 >= 0 ? r11 : 0
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
			f_players
		}
	}
}
