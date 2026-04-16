'use strict'

const db = uniCloud.database()
const f_col = db.collection('f_user_profile')

function f_genUid() {
	let s = 'u'
	for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16)
	return s
}

function f_normNick(s) {
	return String(s || '')
		.trim()
		.slice(0, 40)
}

exports.main = async (event) => {
	const f_nick_name = f_normNick(event.f_nick_name)
	let f_avatar_url = event.f_avatar_url != null ? String(event.f_avatar_url).trim() : ''

	if (!f_nick_name) {
		return { f_code: 400, f_message: '请提供昵称', f_data: null }
	}
	if (!f_avatar_url) {
		f_avatar_url = ''
	}

	const r = await f_col.where({ f_nick_name }).limit(1).get()
	const f_now = Date.now()

	if (r.data && r.data.length) {
		const row = r.data[0]
		const f_uid = row.f_uid
		if (!f_uid) {
			return { f_code: 500, f_message: '用户资料缺少 f_uid，请联系管理员', f_data: null }
		}
		await f_col.doc(row._id).update({
			f_avatar_url,
			f_updated_at: f_now
		})
		return {
			f_code: 0,
			f_message: 'ok',
			f_data: {
				f_action: 'login',
				f_user: {
					f_id: row._id,
					f_uid,
					f_nick_name: row.f_nick_name,
					f_avatar_url,
					f_role: row.f_role || 'player'
				}
			}
		}
	}

	let f_uid = f_genUid()
	for (let i = 0; i < 6; i++) {
		const dup = await f_col.where({ f_uid }).limit(1).get()
		if (!dup.data || !dup.data.length) break
		f_uid = f_genUid()
	}

	const add = await f_col.add({
		f_uid,
		f_nick_name,
		f_avatar_url,
		f_role: 'player',
		f_created_at: f_now,
		f_updated_at: f_now
	})

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: {
			f_action: 'register',
			f_user: {
				f_id: add.id,
				f_uid,
				f_nick_name,
				f_avatar_url,
				f_role: 'player'
			}
		}
	}
}
