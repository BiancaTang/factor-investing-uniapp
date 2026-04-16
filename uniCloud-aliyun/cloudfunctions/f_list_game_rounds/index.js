'use strict'

const db = uniCloud.database()
const f_rounds = db.collection('f_game_round')

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

exports.main = async (event) => {
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_player_uid = event.f_player_uid != null ? String(event.f_player_uid).trim() : ''

	if (!/^\d{4}$/.test(f_room_code) || !f_isPlayerUid(f_player_uid)) {
		return { f_code: 400, f_message: '参数无效', f_data: null }
	}

	const r = await f_rounds.where({ f_room_code, f_player_uid }).get()
	const rows = (r.data || []).sort((a, b) => a.f_round_index - b.f_round_index)

	const list = rows.map((row) => ({
		f_round_index: row.f_round_index,
		fac_size: row.fac_size,
		fac_momentum: row.fac_momentum,
		fac_book_to_price: row.fac_book_to_price,
		fac_growth: row.fac_growth,
		fac_residual_volatility: row.fac_residual_volatility,
		f_nav: row.f_nav,
		f_total_return: row.f_total_return,
		f_size_return: row.f_size_return,
		f_momentum_return: row.f_momentum_return,
		f_book_to_price_return: row.f_book_to_price_return,
		f_growth_return: row.f_growth_return,
		f_residual_volatility_return: row.f_residual_volatility_return
	}))

	return { f_code: 0, f_message: 'ok', f_data: { f_list: list } }
}
