'use strict'

const db = uniCloud.database()
const f_col = db.collection('f_user_profile')

const F_ROLE_PLAYER = 'player'

function f_genUid() {
	let s = 'u'
	for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16)
	return s
}

async function f_rowById(f_id) {
	const r = await f_col.doc(f_id).get()
	const row = r.data && r.data[0]
	return row
}

/**
 * 兼容旧客户端：按昵称 upsert（与 f_login_wx 一致）；f_phone 可选仅作存档。
 */
exports.main = async (event) => {
	const f_avatar_url = event.f_avatar_url != null ? String(event.f_avatar_url).trim() : ''
	const f_nick_name = event.f_nick_name != null ? String(event.f_nick_name).trim().slice(0, 40) : ''
	const f_phone = event.f_phone != null ? String(event.f_phone).trim() : ''

	if (!f_avatar_url || !f_nick_name) {
		return { f_code: 400, f_message: 'f_avatar_url、f_nick_name 为必填', f_data: null }
	}

	const f_now = Date.now()
	const f_doc = {
		f_avatar_url,
		f_nick_name,
		f_updated_at: f_now
	}
	if (f_phone) f_doc.f_phone = f_phone

	const f_exist = await f_col.where({ f_nick_name }).limit(1).get()
	if (f_exist.data && f_exist.data.length) {
		const f_id = f_exist.data[0]._id
		await f_col.doc(f_id).update(f_doc)
		const row = await f_rowById(f_id)
		const f_role = (row && row.f_role) || F_ROLE_PLAYER
		const f_uid = row && row.f_uid
		if (!f_uid) {
			const nu = f_genUid()
			await f_col.doc(f_id).update({ f_uid: nu, f_updated_at: f_now })
		}
		const row2 = await f_rowById(f_id)
		return {
			f_code: 0,
			f_message: 'ok',
			f_data: {
				f_id,
				f_action: 'update',
				f_role,
				f_uid: (row2 && row2.f_uid) || f_uid
			}
		}
	}

	f_doc.f_uid = f_genUid()
	f_doc.f_role = F_ROLE_PLAYER
	f_doc.f_created_at = f_now
	const f_add = await f_col.add(f_doc)
	const f_id = f_add.id
	const row = await f_rowById(f_id)
	const f_role = (row && row.f_role) || F_ROLE_PLAYER
	return {
		f_code: 0,
		f_message: 'ok',
		f_data: { f_id, f_action: 'insert', f_role, f_uid: row && row.f_uid }
	}
}
