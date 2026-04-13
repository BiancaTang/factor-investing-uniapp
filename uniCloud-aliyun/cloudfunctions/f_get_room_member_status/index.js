'use strict'

/**
 * 房间成员查看全员进度与各玩家 f_game_round 历史（与 f_get_room_player_status 的 f_data 结构一致），
 * 用于玩家端绘制与管理员相同的「多人净值对比」曲线。
 * 校验：f_player_phone 须在 f_room_member 中。
 */
const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_members = db.collection('f_room_member')
const f_rounds = db.collection('f_game_round')

exports.main = async (event) => {
	const f_player_phone = event.f_player_phone != null ? String(event.f_player_phone).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''

	if (!/^1\d{10}$/.test(f_player_phone) || !/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '参数无效', f_data: null }
	}

	const memOk = await f_members.where({ f_room_code, f_player_phone }).limit(1).get()
	if (!memOk.data || !memOk.data.length) {
		return { f_code: 403, f_message: '仅房间成员可查看', f_data: null }
	}

	const room = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!room.data || !room.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}

	const row = room.data[0]
	const openRi = parseInt(row.f_open_round_index, 10)
	const f_open_round_index = Number.isFinite(openRi) && openRi >= 0 ? openRi : 0

	const mem = await f_members.where({ f_room_code }).get()
	const phones = (mem.data || []).map((m) => m.f_player_phone).filter(Boolean)

	const rounds = await f_rounds.where({ f_room_code }).get()
	const maxByPhone = {}
	const listByPhone = {}
	for (const g of rounds.data || []) {
		const p = g.f_player_phone
		const ri = parseInt(g.f_round_index, 10)
		if (!p || !Number.isFinite(ri)) continue
		maxByPhone[p] = Math.max(maxByPhone[p] || 0, ri)
		if (!listByPhone[p]) listByPhone[p] = []
		listByPhone[p].push({
			f_round_index: ri,
			fac_size: g.fac_size,
			fac_momentum: g.fac_momentum,
			fac_book_to_price: g.fac_book_to_price,
			fac_growth: g.fac_growth,
			fac_residual_volatility: g.fac_residual_volatility
		})
	}
	for (const p of Object.keys(listByPhone)) {
		listByPhone[p].sort((a, b) => a.f_round_index - b.f_round_index)
	}

	const f_players = phones.map((phone) => ({
		f_player_phone: phone,
		f_max_round_index: maxByPhone[phone] || 0,
		f_history: listByPhone[phone] || []
	}))

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: {
			f_room_code,
			f_round_count: row.f_round_count,
			f_group_count: row.f_group_count,
			f_banker_intervene: !!row.f_banker_intervene,
			f_open_round_index,
			f_players
		}
	}
}
