'use strict'

const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_members = db.collection('f_room_member')
const f_rounds = db.collection('f_game_round')

exports.main = async (event) => {
	const f_admin_phone = event.f_admin_phone != null ? String(event.f_admin_phone).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_action = event.f_action != null ? String(event.f_action).trim() : ''

	if (!/^1\d{10}$/.test(f_admin_phone) || !/^\d{4}$/.test(f_room_code)) {
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
	if (row.f_admin_phone !== f_admin_phone) {
		return { f_code: 403, f_message: '仅房间创建管理员可操作', f_data: null }
	}

	const maxR = parseInt(row.f_round_count, 10)
	const openRi = parseInt(row.f_open_round_index, 10)
	const curOpen = Number.isFinite(openRi) && openRi >= 0 ? openRi : 0
	const f_now = Date.now()

	if (f_action === 'end') {
		// 结束本轮前：未提交的玩家写入 f_game_round，五因子均为 0（与已提交结构一致，避免缺行）
		if (curOpen > 0) {
			const mem = await f_members.where({ f_room_code }).get()
			const phones = (mem.data || []).map((m) => m.f_player_phone).filter(Boolean)
			const existing = await f_rounds
				.where({
					f_room_code,
					f_round_index: curOpen
				})
				.get()
			const submitted = new Set((existing.data || []).map((r) => r.f_player_phone).filter(Boolean))
			for (const f_player_phone of phones) {
				if (submitted.has(f_player_phone)) continue
				await f_rounds.add({
					f_room_code,
					f_player_phone,
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
