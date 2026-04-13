'use strict'

const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_members = db.collection('f_room_member')

exports.main = async (event) => {
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_player_phone = event.f_player_phone != null ? String(event.f_player_phone).trim() : ''

	if (!f_room_code || !f_player_phone) {
		return { f_code: 400, f_message: '缺少 f_room_code 或 f_player_phone', f_data: null }
	}

	if (!/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '房间号须为 4 位数字', f_data: null }
	}

	if (!/^1\d{10}$/.test(f_player_phone)) {
		return { f_code: 400, f_message: '手机号格式不正确', f_data: null }
	}

	const room = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!room.data || !room.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}

	const exist = await f_members
		.where({ f_room_code, f_player_phone })
		.limit(1)
		.get()

	if (exist.data && exist.data.length > 0) {
		return {
			f_code: 0,
			f_message: 'ok',
			f_data: { f_action: 'already_in', f_room_code }
		}
	}

	const f_now = Date.now()
	await f_members.add({
		f_room_code,
		f_player_phone,
		f_joined_at: f_now
	})

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: { f_action: 'joined', f_room_code }
	}
}
