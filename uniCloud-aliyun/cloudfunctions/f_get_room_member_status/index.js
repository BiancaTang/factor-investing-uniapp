'use strict'

/**
 * 房间成员查看全员进度与各玩家 f_game_round 历史（与 f_get_room_player_status 的 f_data 结构一致），
 * 用于玩家端绘制与管理员相同的「多人净值对比」曲线。
 * 校验：f_player_uid 须在 f_room_member 中。
 */
const db = uniCloud.database()
const f_rooms = db.collection('f_room')
const f_members = db.collection('f_room_member')
const f_rounds = db.collection('f_game_round')

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

exports.main = async (event) => {
	const f_player_uid = event.f_player_uid != null ? String(event.f_player_uid).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''

	if (!f_isPlayerUid(f_player_uid) || !/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '参数无效', f_data: null }
	}

	const memOk = await f_members.where({ f_room_code, f_player_uid }).limit(1).get()
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
	const memRows = [...(mem.data || [])].sort((a, b) => {
		const ta = typeof a.f_joined_at === 'number' ? a.f_joined_at : new Date(a.f_joined_at || 0).getTime()
		const tb = typeof b.f_joined_at === 'number' ? b.f_joined_at : new Date(b.f_joined_at || 0).getTime()
		return ta - tb
	})
	const uids = memRows.map((m) => m.f_player_uid).filter(Boolean)
	const nickByUid = {}
	for (const m of memRows) {
		if (m.f_player_uid) {
			nickByUid[m.f_player_uid] = (m.f_nick_name && String(m.f_nick_name).trim()) || m.f_player_uid.slice(0, 8)
		}
	}

	const rounds = await f_rounds.where({ f_room_code }).get()
	const maxByUid = {}
	const listByUid = {}
	for (const g of rounds.data || []) {
		const p = g.f_player_uid
		const ri = parseInt(g.f_round_index, 10)
		if (!p || !Number.isFinite(ri)) continue
		maxByUid[p] = Math.max(maxByUid[p] || 0, ri)
		if (!listByUid[p]) listByUid[p] = []
		listByUid[p].push({
			f_round_index: ri,
			fac_size: g.fac_size,
			fac_momentum: g.fac_momentum,
			fac_book_to_price: g.fac_book_to_price,
			fac_growth: g.fac_growth,
			fac_residual_volatility: g.fac_residual_volatility,
			f_nav: g.f_nav,
			f_total_return: g.f_total_return,
			f_size_return: g.f_size_return,
			f_momentum_return: g.f_momentum_return,
			f_book_to_price_return: g.f_book_to_price_return,
			f_growth_return: g.f_growth_return,
			f_residual_volatility_return: g.f_residual_volatility_return
		})
	}
	for (const p of Object.keys(listByUid)) {
		listByUid[p].sort((a, b) => a.f_round_index - b.f_round_index)
	}

	const f_players = uids.map((uid) => ({
		f_player_uid: uid,
		f_nick_name: nickByUid[uid] || uid.slice(0, 8),
		f_max_round_index: maxByUid[uid] || 0,
		f_history: listByUid[uid] || []
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
			f_admin_uid: row.f_admin_uid || '',
			f_players
		}
	}
}
