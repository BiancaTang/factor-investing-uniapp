'use strict'

const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_rounds = db.collection('f_game_round')
const f_members = db.collection('f_room_member')

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

function f_intFactor(v) {
	const n = Math.round(Number(v))
	if (!Number.isFinite(n) || n < -5 || n > 5) return null
	return n
}

function f_numOrNull(v) {
	if (v === '' || v == null) return null
	const n = Number(v)
	return Number.isFinite(n) ? n : null
}

exports.main = async (event) => {
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_player_uid = event.f_player_uid != null ? String(event.f_player_uid).trim() : ''
	const f_round_index = parseInt(event.f_round_index, 10)

	const fac_size = f_intFactor(event.fac_size)
	const fac_momentum = f_intFactor(event.fac_momentum)
	const fac_book_to_price = f_intFactor(event.fac_book_to_price)
	const fac_growth = f_intFactor(event.fac_growth)
	const fac_residual_volatility = f_intFactor(event.fac_residual_volatility)
	const f_nav = f_numOrNull(event.f_nav)
	const f_total_return = f_numOrNull(event.f_total_return)
	const f_size_return = f_numOrNull(event.f_size_return)
	const f_momentum_return = f_numOrNull(event.f_momentum_return)
	const f_book_to_price_return = f_numOrNull(event.f_book_to_price_return)
	const f_growth_return = f_numOrNull(event.f_growth_return)
	const f_residual_volatility_return = f_numOrNull(event.f_residual_volatility_return)

	if (!/^\d{4}$/.test(f_room_code) || !f_isPlayerUid(f_player_uid)) {
		return { f_code: 400, f_message: '房间号或玩家标识无效', f_data: null }
	}

	if (!Number.isFinite(f_round_index) || f_round_index < 1) {
		return { f_code: 400, f_message: '轮次无效', f_data: null }
	}

	if ([fac_size, fac_momentum, fac_book_to_price, fac_growth, fac_residual_volatility].some((x) => x === null)) {
		return { f_code: 400, f_message: '五因子须为 -5～5 的整数', f_data: null }
	}

	const mem = await f_members.where({ f_room_code, f_player_uid }).limit(1).get()
	if (!mem.data || !mem.data.length) {
		return { f_code: 403, f_message: '非本房间成员不可提交', f_data: null }
	}

	const room = await f_rooms.where({ f_room_code }).limit(1).get()
	if (!room.data || !room.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}

	const roomRow = room.data[0]
	const maxR = roomRow.f_round_count
	if (f_round_index > maxR) {
		return { f_code: 400, f_message: '超过房间设定轮次', f_data: null }
	}

	const openRi = parseInt(roomRow.f_open_round_index, 10)
	const f_open = Number.isFinite(openRi) && openRi > 0 ? openRi : 0
	if (f_open !== f_round_index) {
		return {
			f_code: 403,
			f_message: f_open === 0 ? '请等待管理员开始本轮' : '当前非本轮开放时间，请等待管理员',
			f_data: { f_open_round_index: f_open }
		}
	}

	const f_now = Date.now()
	const doc = {
		f_room_code,
		f_player_uid,
		f_round_index,
		fac_size,
		fac_momentum,
		fac_book_to_price,
		fac_growth,
		fac_residual_volatility,
		f_updated_at: f_now
	}
	if (f_nav !== null) doc.f_nav = f_nav
	if (f_total_return !== null) doc.f_total_return = f_total_return
	if (f_size_return !== null) doc.f_size_return = f_size_return
	if (f_momentum_return !== null) doc.f_momentum_return = f_momentum_return
	if (f_book_to_price_return !== null) doc.f_book_to_price_return = f_book_to_price_return
	if (f_growth_return !== null) doc.f_growth_return = f_growth_return
	if (f_residual_volatility_return !== null) doc.f_residual_volatility_return = f_residual_volatility_return

	const exist = await f_rounds
		.where({ f_room_code, f_player_uid, f_round_index })
		.limit(1)
		.get()

	if (exist.data && exist.data.length) {
		await f_rounds.doc(exist.data[0]._id).update(doc)
		return { f_code: 0, f_message: 'ok', f_data: { f_action: 'update', f_id: exist.data[0]._id } }
	}

	doc.f_created_at = f_now
	const add = await f_rounds.add(doc)
	return { f_code: 0, f_message: 'ok', f_data: { f_action: 'insert', f_id: add.id } }
}
