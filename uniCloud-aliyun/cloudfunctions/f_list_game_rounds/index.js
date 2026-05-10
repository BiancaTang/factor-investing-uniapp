'use strict'

const { F_FACTOR_DEFS, f_navReturnDbKey } = require('../common/f_gameFactorSpec.js')

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

	const list = rows.map((row) => {
		const o = {
			f_round_index: row.f_round_index,
			f_nav: row.f_nav,
			f_total_return: row.f_total_return
		}
		for (const d of F_FACTOR_DEFS) {
			o[d.key] = row[d.key]
			o[f_navReturnDbKey(d.internal)] = row[f_navReturnDbKey(d.internal)]
		}
		return o
	})

	return { f_code: 0, f_message: 'ok', f_data: { f_list: list } }
}
