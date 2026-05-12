'use strict'

const db = uniCloud.database()
const f_rooms = db.collection('f_room')

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

exports.main = async (event) => {
	const f_admin_uid = event.f_admin_uid != null ? String(event.f_admin_uid).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_join_locked = !!event.f_join_locked

	if (!f_isPlayerUid(f_admin_uid) || !/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '参数无效', f_data: null }
	}

	const room = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!room.data || !room.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}

	const row = room.data[0]
	if (String(row.f_admin_uid || '').trim() !== f_admin_uid) {
		return { f_code: 403, f_message: '仅房间创建管理员可锁定/解锁加入', f_data: null }
	}

	const f_now = Date.now()
	await f_rooms.where({ f_room_code }).update({
		f_join_locked,
		f_updated_at: f_now
	})

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: { f_room_code, f_join_locked }
	}
}
