'use strict'

const { F_ROLES, f_roleById } = require('../common/f_gameRolesSpec.js')

const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_members = db.collection('f_room_member')

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

exports.main = async (event) => {
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_player_uid = event.f_player_uid != null ? String(event.f_player_uid).trim() : ''
	const f_is_random = !!event.f_is_random
	const f_role_id_raw = event.f_role_id

	if (!/^\d{4}$/.test(f_room_code) || !f_isPlayerUid(f_player_uid)) {
		return { f_code: 400, f_message: '参数无效', f_data: null }
	}

	const room = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!room.data || !room.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}

	const row = room.data[0]
	const adminUid = String(row.f_admin_uid || '').trim()

	if (!row.f_join_locked) {
		return { f_code: 400, f_message: '请先锁定房间加入后，再选择角色', f_data: null }
	}
	if (row.f_playing_started === true) {
		return { f_code: 400, f_message: '管理员已开始博弈，不能再修改角色', f_data: null }
	}

	if (f_player_uid === adminUid) {
		return { f_code: 403, f_message: '庄家不参与选角', f_data: null }
	}

	const memSelf = await f_members.where({ f_room_code, f_player_uid }).limit(1).get()
	if (!memSelf.data || !memSelf.data.length) {
		return { f_code: 403, f_message: '你不在该房间中', f_data: null }
	}

	const memAll = await f_members.where({ f_room_code }).get()
	const members = memAll.data || []

	const usedByOthers = new Map()
	for (const m of members) {
		if (!m.f_player_uid || m.f_player_uid === f_player_uid) continue
		const rid = parseInt(m.f_role_id, 10)
		if (Number.isFinite(rid) && rid >= 1 && rid <= 10) {
			usedByOthers.set(rid, m.f_player_uid)
		}
	}

	let finalRoleId = parseInt(f_role_id_raw, 10)

	if (f_is_random) {
		const pool = []
		for (let id = 1; id <= 10; id++) {
			if (!usedByOthers.has(id)) pool.push(id)
		}
		if (!pool.length) {
			return { f_code: 409, f_message: '所有角色已被选完', f_data: null }
		}
		finalRoleId = pool[Math.floor(Math.random() * pool.length)]
	}

	if (!Number.isFinite(finalRoleId) || finalRoleId < 1 || finalRoleId > 10) {
		return { f_code: 400, f_message: '无效的角色 ID', f_data: null }
	}

	const holder = usedByOthers.get(finalRoleId)
	if (holder && holder !== f_player_uid) {
		return { f_code: 409, f_message: '该角色已被其他玩家选择', f_data: null }
	}

	const role = f_roleById(finalRoleId)
	if (!role) {
		return { f_code: 400, f_message: '无效的角色', f_data: null }
	}

	const f_now = Date.now()
	await f_members.where({ f_room_code, f_player_uid }).update({
		f_role_id: finalRoleId,
		f_role_name: role.name,
		f_role_selected_at: f_now
	})

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: {
			f_role_id: finalRoleId,
			f_role_name: role.name,
			f_is_random: f_is_random
		}
	}
}
