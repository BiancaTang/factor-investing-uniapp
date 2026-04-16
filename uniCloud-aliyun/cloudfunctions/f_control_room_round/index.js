'use strict'

const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_members = db.collection('f_room_member')
const f_rounds = db.collection('f_game_round')

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

exports.main = async (event) => {
	const f_admin_uid = event.f_admin_uid != null ? String(event.f_admin_uid).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_action = event.f_action != null ? String(event.f_action).trim() : ''

	if (!f_isPlayerUid(f_admin_uid) || !/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '参数无效', f_data: null }
	}

	if (f_action !== 'start' && f_action !== 'end') {
		return { f_code: 400, f_message: 'f_action 须为 start 或 end', f_data: null }
	}

	const r = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!r.data || !r.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}

	const row = r.data[0]
	if (row.f_admin_uid !== f_admin_uid) {
		return { f_code: 403, f_message: '仅房间创建管理员可操作', f_data: null }
	}

	const maxR = parseInt(row.f_round_count, 10)
	const openRi = parseInt(row.f_open_round_index, 10)
	const curOpen = Number.isFinite(openRi) && openRi >= 0 ? openRi : 0
	const f_now = Date.now()

	if (f_action === 'end') {
		if (curOpen > 0) {
			const mem = await f_members.where({ f_room_code }).get()
			const uids = (mem.data || []).map((m) => m.f_player_uid).filter(Boolean)
			const existing = await f_rounds
				.where({
					f_room_code,
					f_round_index: curOpen
				})
				.get()
			const submitted = new Set((existing.data || []).map((r) => r.f_player_uid).filter(Boolean))
			for (const f_player_uid of uids) {
				if (submitted.has(f_player_uid)) continue
				await f_rounds.add({
					f_room_code,
					f_player_uid,
					f_round_index: curOpen,
					fac_size: 0,
					fac_momentum: 0,
					fac_book_to_price: 0,
					fac_growth: 0,
					fac_residual_volatility: 0,
					f_updated_at: f_now,
					f_created_at: f_now
				})
			}
		}

		await f_rooms.doc(row._id).update({
			f_open_round_index: 0,
			f_updated_at: f_now
		})
		return {
			f_code: 0,
			f_message: 'ok',
			f_data: { f_open_round_index: 0, f_action: 'end' }
		}
	}

	const f_round_index = parseInt(event.f_round_index, 10)
	if (!Number.isFinite(f_round_index) || f_round_index < 1 || f_round_index > maxR) {
		return { f_code: 400, f_message: '轮次须为 1～' + maxR, f_data: null }
	}

	if (curOpen !== 0) {
		return { f_code: 400, f_message: '请先结束本轮再开启下一轮', f_data: { f_open_round_index: curOpen } }
	}

	await f_rooms.doc(row._id).update({
		f_open_round_index: f_round_index,
		f_updated_at: f_now
	})

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: { f_open_round_index: f_round_index, f_action: 'start' }
	}
}
