'use strict'

const db = uniCloud.database()
const f_rooms = db.collection('f_room')

exports.main = async (event) => {
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	if (!/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '房间号须为 4 位数字', f_data: null }
	}
	const r = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!r.data || !r.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}
	const row = r.data[0]
	const openRi = parseInt(row.f_open_round_index, 10)
	return {
		f_code: 0,
		f_message: 'ok',
		f_data: {
			f_id: row._id,
			f_room_code: row.f_room_code,
			f_group_count: row.f_group_count,
			f_round_count: row.f_round_count,
			f_banker_intervene: !!row.f_banker_intervene,
			f_admin_phone: row.f_admin_phone,
			f_open_round_index: Number.isFinite(openRi) && openRi >= 0 ? openRi : 0
		}
	}
}
