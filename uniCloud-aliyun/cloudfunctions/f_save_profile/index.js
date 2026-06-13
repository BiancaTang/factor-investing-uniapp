'use strict'

const db = uniCloud.database()
const f_col = db.collection('f_user_profile')

const F_ROLE_PLAYER = 'player'

function f_genUid() {
	let s = 'u'
	for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16)
	return s
}

function f_isInvalidAvatarUrl(url) {
	const s = String(url || '').trim()
	if (!s) return true
	if (s.startsWith('wxfile://')) return true
	if (s.startsWith('file://')) return true
	if (/^http:\/\/tmp\//i.test(s)) return true
	return false
}

function f_isValidStoredAvatar(url) {
	const s = String(url || '').trim()
	if (!s || f_isInvalidAvatarUrl(s)) return false
	if (s.startsWith('cloud://')) return true
	if (/^https:\/\/[^/]+\.cdn\.bspapp\.com\//i.test(s)) return true
	if (/^https?:\/\//i.test(s)) return true
	return s.length > 8
}

async function f_rowById(f_id) {
	const r = await f_col.doc(f_id).get()
	const row = r.data && r.data[0]
	return row
}

async function f_successPayload(f_id, f_action, row) {
	const f_role = (row && row.f_role) || F_ROLE_PLAYER
	return {
		f_code: 0,
		f_message: 'ok',
		f_data: {
			f_id,
			f_action,
			f_role,
			f_uid: (row && row.f_uid) || ''
		}
	}
}

/**
 * 注册 / 更新资料。优先按 f_phone 更新（便于老用户重传头像）；新用户按昵称插入。
 */
exports.main = async (event) => {
	const f_avatar_url = event.f_avatar_url != null ? String(event.f_avatar_url).trim() : ''
	const f_nick_name = event.f_nick_name != null ? String(event.f_nick_name).trim().slice(0, 40) : ''
	const f_phone = event.f_phone != null ? String(event.f_phone).trim() : ''

	if (!f_avatar_url || !f_nick_name) {
		return { f_code: 400, f_message: 'f_avatar_url、f_nick_name 为必填', f_data: null }
	}
	if (f_isInvalidAvatarUrl(f_avatar_url)) {
		return {
			f_code: 400,
			f_message: '头像须上传到云存储，请重新选择头像',
			f_data: null
		}
	}
	if (!f_isValidStoredAvatar(f_avatar_url)) {
		return {
			f_code: 400,
			f_message: '头像地址无效，请重新选择并上传',
			f_data: null
		}
	}

	const f_now = Date.now()
	const f_doc = {
		f_avatar_url,
		f_nick_name,
		f_updated_at: f_now
	}
	if (f_phone) f_doc.f_phone = f_phone

	if (f_phone) {
		const byPhone = await f_col.where({ f_phone }).limit(1).get()
		if (byPhone.data && byPhone.data.length) {
			const f_id = byPhone.data[0]._id
			await f_col.doc(f_id).update(f_doc)
			let row = await f_rowById(f_id)
			if (row && !row.f_uid) {
				const nu = f_genUid()
				await f_col.doc(f_id).update({ f_uid: nu, f_updated_at: f_now })
				row = await f_rowById(f_id)
			}
			return f_successPayload(f_id, 'update', row)
		}
	}

	const f_exist = await f_col.where({ f_nick_name }).limit(1).get()
	if (f_exist.data && f_exist.data.length) {
		const f_id = f_exist.data[0]._id
		await f_col.doc(f_id).update(f_doc)
		let row = await f_rowById(f_id)
		if (row && !row.f_uid) {
			const nu = f_genUid()
			await f_col.doc(f_id).update({ f_uid: nu, f_updated_at: f_now })
			row = await f_rowById(f_id)
		}
		return f_successPayload(f_id, 'update', row)
	}

	f_doc.f_uid = f_genUid()
	f_doc.f_role = F_ROLE_PLAYER
	f_doc.f_created_at = f_now
	const f_add = await f_col.add(f_doc)
	const f_id = f_add.id
	const row = await f_rowById(f_id)
	return f_successPayload(f_id, 'insert', row)
}
