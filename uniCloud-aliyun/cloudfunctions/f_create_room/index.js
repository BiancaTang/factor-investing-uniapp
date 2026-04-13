'use strict'

const db = uniCloud.database()
const f_users = db.collection('f_user_profile')
const f_rooms = db.collection('f_room')

async function f_requireAdmin(f_phone) {
	const r = await f_users.where({ f_phone }).limit(1).get()
	const row = r.data && r.data[0]
	if (!row) return { f_ok: false, f_message: '用户不存在' }
	if (row.f_role !== 'admin') return { f_ok: false, f_message: '仅管理员可创建房间' }
	return { f_ok: true }
}

exports.main = async (event) => {
	const f_admin_phone = event.f_admin_phone != null ? String(event.f_admin_phone).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_group_count = parseInt(event.f_group_count, 10)
	const f_round_count = parseInt(event.f_round_count, 10)
	const f_banker_intervene = !!event.f_banker_intervene

	if (!f_admin_phone) {
		return { f_code: 400, f_message: '缺少 f_admin_phone', f_data: null }
	}

	const adm = await f_requireAdmin(f_admin_phone)
	if (!adm.f_ok) {
		return { f_code: 403, f_message: adm.f_message, f_data: null }
	}

	if (!/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '房间号须为 4 位数字', f_data: null }
	}

	if (!Number.isFinite(f_group_count) || f_group_count < 1 || f_group_count > 999) {
		return { f_code: 400, f_message: '组数须为 1～999 的整数', f_data: null }
	}

	if (!Number.isFinite(f_round_count) || f_round_count < 1 || f_round_count > 999) {
		return { f_code: 400, f_message: '轮次须为 1～999 的整数', f_data: null }
	}

	const dup = await f_rooms.where({ f_room_code }).limit(1).get()
	if (dup.data && dup.data.length > 0) {
		return { f_code: 409, f_message: '该房间号已存在', f_data: null }
	}

	const f_now = Date.now()
	const doc = {
		f_room_code,
		f_group_count,
		f_round_count,
		f_banker_intervene,
		f_admin_phone,
		/** 管理员当前开启的轮次，0 表示未开启，玩家不可提交 */
		f_open_round_index: 0,
		f_created_at: f_now,
		f_updated_at: f_now
	}

	const add = await f_rooms.add(doc)
	return {
		f_code: 0,
		f_message: 'ok',
		f_data: { f_id: add.id, f_room_code }
	}
}
