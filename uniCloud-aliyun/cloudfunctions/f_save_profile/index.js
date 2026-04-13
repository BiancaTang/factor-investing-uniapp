'use strict'

const db = uniCloud.database()
const f_col = db.collection('f_user_profile')

/** 新建用户默认玩家；管理员请在控制台把对应文档的 f_role 改为 admin */
const F_ROLE_PLAYER = 'player'

async function f_rowById(f_id) {
	const r = await f_col.doc(f_id).get()
	const row = r.data && r.data[0]
	return row
}

exports.main = async (event) => {
	const f_avatar_url = event.f_avatar_url != null ? String(event.f_avatar_url).trim() : ''
	const f_nick_name = event.f_nick_name != null ? String(event.f_nick_name).trim() : ''
	const f_phone = event.f_phone != null ? String(event.f_phone).trim() : ''

	if (!f_avatar_url || !f_nick_name || !f_phone) {
		return { f_code: 400, f_message: 'f_avatar_url、f_nick_name、f_phone 均为必填', f_data: null }
	}

	if (!/^1\d{10}$/.test(f_phone)) {
		return { f_code: 400, f_message: '手机号需为 11 位中国大陆号码', f_data: null }
	}

	const f_now = Date.now()
	// 更新资料时不得写入 f_role，避免覆盖你在控制台手动设置的管理员
	const f_doc = {
		f_avatar_url,
		f_nick_name,
		f_phone,
		f_updated_at: f_now
	}

	const f_exist = await f_col.where({ f_phone }).limit(1).get()
	if (f_exist.data && f_exist.data.length > 0) {
		const f_id = f_exist.data[0]._id
		await f_col.doc(f_id).update(f_doc)
		const row = await f_rowById(f_id)
		const f_role = (row && row.f_role) || F_ROLE_PLAYER
		return {
			f_code: 0,
			f_message: 'ok',
			f_data: { f_id, f_action: 'update', f_role }
		}
	}

	f_doc.f_role = F_ROLE_PLAYER
	f_doc.f_created_at = f_now
	const f_add = await f_col.add(f_doc)
	const f_id = f_add.id
	const row = await f_rowById(f_id)
	const f_role = (row && row.f_role) || F_ROLE_PLAYER
	return {
		f_code: 0,
		f_message: 'ok',
		f_data: { f_id, f_action: 'insert', f_role }
	}
}
