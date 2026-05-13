'use strict'

const { F_ROLES, f_rolePortraitUrl, f_roleById } = require('./f_gameRolesSpec.js')

const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_members = db.collection('f_room_member')

exports.main = async (event) => {
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	if (!/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '房间号须为 4 位数字', f_data: null }
	}

	const room = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!room.data || !room.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}

	const row = room.data[0]
	const adminUid = String(row.f_admin_uid || '').trim()
	const mem = await f_members.where({ f_room_code }).get()
	const members = mem.data || []

	const takenByRoleId = {}
	for (const m of members) {
		const rid = parseInt(m.f_role_id, 10)
		if (!Number.isFinite(rid) || rid < 1 || rid > 11) continue
		takenByRoleId[rid] = {
			f_player_uid: m.f_player_uid,
			nick: (m.f_nick_name && String(m.f_nick_name).trim()) || String(m.f_player_uid || '').slice(0, 8)
		}
	}

	const f_roles = F_ROLES.map((r) => {
		const t = takenByRoleId[r.id]
		return {
			id: r.id,
			name: r.name,
			subtitle: r.subtitle,
			mainFactor: r.mainFactor,
			subFactor: r.subFactor,
			image: f_rolePortraitUrl(r.id),
			selected: !!t,
			selectedBy: t ? t.nick : '',
			selectedByUid: t ? String(t.f_player_uid || '') : ''
		}
	})

	const f_selected_players = members
		.filter((m) => {
			const rid = parseInt(m.f_role_id, 10)
			return m.f_player_uid && Number.isFinite(rid) && rid >= 1 && rid <= 11
		})
		.map((m) => {
			const rid = parseInt(m.f_role_id, 10)
			const meta = f_roleById(rid)
			return {
				f_player_uid: m.f_player_uid,
				f_role_id: rid,
				f_role_name: m.f_role_name || (meta && meta.name) || ''
			}
		})

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: {
			f_room_code,
			f_join_locked: !!row.f_join_locked,
			f_playing_started: row.f_playing_started === true,
			f_admin_uid: adminUid,
			f_roles,
			f_selected_players
		}
	}
}
