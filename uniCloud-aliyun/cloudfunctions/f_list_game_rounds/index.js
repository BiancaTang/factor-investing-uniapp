'use strict'

const db = uniCloud.database()
const f_rounds = db.collection('f_game_round')

exports.main = async (event) => {
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_player_phone = event.f_player_phone != null ? String(event.f_player_phone).trim() : ''

	if (!/^\d{4}$/.test(f_room_code) || !/^1\d{10}$/.test(f_player_phone)) {
		return { f_code: 400, f_message: '参数无效', f_data: null }
	}

	const r = await f_rounds.where({ f_room_code, f_player_phone }).get()
	const rows = (r.data || []).sort((a, b) => a.f_round_index - b.f_round_index)

	const list = rows.map((row) => ({
		f_round_index: row.f_round_index,
		fac_size: row.fac_size,
		fac_momentum: row.fac_momentum,
		fac_book_to_price: row.fac_book_to_price,
		fac_growth: row.fac_growth,
		fac_residual_volatility: row.fac_residual_volatility
	}))

	return { f_code: 0, f_message: 'ok', f_data: { f_list: list } }
}
