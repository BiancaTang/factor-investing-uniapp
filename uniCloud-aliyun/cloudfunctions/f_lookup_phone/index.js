'use strict'

const db = uniCloud.database()
const f_col = db.collection('f_user_profile')

const F_ROLE_PLAYER = 'player'

exports.main = async (event) => {
	const f_phone = event.f_phone != null ? String(event.f_phone).trim() : ''

	if (!f_phone) {
		return { f_code: 400, f_message: '请传入 f_phone', f_data: null }
	}

	if (!/^1\d{10}$/.test(f_phone)) {
		return { f_code: 400, f_message: 'ID 需为 11 位中国大陆号码', f_data: null }
	}

	const r = await f_col.where({ f_phone }).limit(1).get()
	const list = r.data || []

	if (!list.length) {
		return {
			f_code: 0,
			f_message: 'ok',
			f_data: { f_exists: false }
		}
	}

	const row = list[0]
	const f_user = {
		f_id: row._id,
		f_uid: row.f_uid || '',
		f_avatar_url: row.f_avatar_url || '',
		f_nick_name: row.f_nick_name || '',
		f_phone: row.f_phone || '',
		f_role: row.f_role || F_ROLE_PLAYER
	}

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: {
			f_exists: true,
			f_user
		}
	}
}
