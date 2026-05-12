'use strict'

const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_members = db.collection('f_room_member')

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

function f_normNick(s) {
	return String(s || '')
		.trim()
		.slice(0, 40)
}

exports.main = async (event) => {
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_player_uid = event.f_player_uid != null ? String(event.f_player_uid).trim() : ''
	const f_nick_name = f_normNick(event.f_nick_name)

	if (!f_room_code || !f_player_uid) {
		return { f_code: 400, f_message: '缺少 f_room_code 或 f_player_uid', f_data: null }
	}

	if (!f_isPlayerUid(f_player_uid)) {
		return { f_code: 400, f_message: 'f_player_uid 无效', f_data: null }
	}

	if (!f_nick_name) {
		return { f_code: 400, f_message: '缺少 f_nick_name', f_data: null }
	}

	if (!/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '房间号须为 4 位数字', f_data: null }
	}

	const room = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!room.data || !room.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}

	const roomRow = room.data[0]
	const adminUid = String(roomRow.f_admin_uid || '').trim()
	if (roomRow.f_join_locked) {
		return { f_code: 403, f_message: '房间已锁定，无法加入', f_data: null }
	}

	const exist = await f_members
		.where({ f_room_code, f_player_uid })
		.limit(1)
		.get()

	if (exist.data && exist.data.length) {
		return {
			f_code: 0,
			f_message: 'ok',
			f_data: { f_action: 'already_in', f_room_code }
		}
	}

	const allMem = await f_members.where({ f_room_code }).get()
	const rows = allMem.data || []
	const playerSeatUsed = rows.filter((m) => m.f_player_uid && m.f_player_uid !== adminUid).length
	if (f_player_uid !== adminUid && playerSeatUsed >= 10) {
		return { f_code: 409, f_message: '玩家席已满（最多 10 人，不含庄家）', f_data: null }
	}

	const f_now = Date.now()
	await f_members.add({
		f_room_code,
		f_player_uid,
		f_nick_name,
		f_joined_at: f_now
	})

	let f_join_locked_after = !!roomRow.f_join_locked
	if (f_player_uid !== adminUid) {
		const nextCount = playerSeatUsed + 1
		if (nextCount >= 10) {
			await f_rooms.where({ f_room_code }).update({
				f_join_locked: true,
				f_updated_at: f_now
			})
			f_join_locked_after = true
		}
	}

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: { f_action: 'joined', f_room_code, f_join_locked: f_join_locked_after }
	}
}
