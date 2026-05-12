'use strict'

const {
	F_FACTOR_DEFS,
	f_navReturnDbKey
} = require('./f_gameFactorSpec.js')

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

	const facByKey = {}
	for (const d of F_FACTOR_DEFS) {
		facByKey[d.key] = f_intFactor(event[d.key])
	}
	const facVals = F_FACTOR_DEFS.map((d) => facByKey[d.key])
	const f_nav = f_numOrNull(event.f_nav)
	const f_total_return = f_numOrNull(event.f_total_return)
	const retByKey = {}
	for (const d of F_FACTOR_DEFS) {
		retByKey[f_navReturnDbKey(d.internal)] = f_numOrNull(event[f_navReturnDbKey(d.internal)])
	}

	if (!/^\d{4}$/.test(f_room_code) || !f_isPlayerUid(f_player_uid)) {
		return { f_code: 400, f_message: '房间号或玩家标识无效', f_data: null }
	}

	if (!Number.isFinite(f_round_index) || f_round_index < 1) {
		return { f_code: 400, f_message: '轮次无效', f_data: null }
	}

	if (facVals.some((x) => x === null)) {
		return { f_code: 400, f_message: '十因子须为 -5～5 的整数', f_data: null }
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
	if (roomRow.f_game_ended) {
		return { f_code: 403, f_message: '游戏已结束，不能继续提交', f_data: null }
	}

	let f_passive_adjusted = false
	try {
		const mall = await f_members.where({ f_room_code }).get()
		f_passive_adjusted = (mall.data || []).some((m) => {
			const r = parseInt(m.f_role_id, 10)
			return Number.isFinite(r) && r >= 1 && r <= 10
		})
	} catch (_) {
		f_passive_adjusted = false
	}

	const maxR = roomRow.f_round_count
	if (Number.isFinite(maxR) && maxR > 0 && f_round_index > maxR) {
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

	const dur = parseInt(roomRow.f_round_duration_sec, 10)
	const durationSec = Number.isFinite(dur) && dur > 0 ? dur : 300
	const startedAt =
		typeof roomRow.f_round_started_at === 'number' ? roomRow.f_round_started_at : parseInt(roomRow.f_round_started_at, 10)
	const f_now = Date.now()
	if (Number.isFinite(startedAt) && startedAt > 0) {
		const deadline = startedAt + durationSec * 1000
		if (f_now > deadline) {
			return {
				f_code: 403,
				f_message: '本轮已超时，请等待管理员开启下一轮',
				f_data: { f_open_round_index: f_open, f_deadline_at: deadline }
			}
		}
	}

	const doc = {
		f_room_code,
		f_player_uid,
		f_round_index,
		f_updated_at: f_now
	}
	for (const d of F_FACTOR_DEFS) {
		doc[d.key] = facByKey[d.key]
	}
	if (f_nav !== null) doc.f_nav = f_nav
	if (f_total_return !== null) doc.f_total_return = f_total_return
	doc.f_passive_adjusted = !!f_passive_adjusted
	for (const d of F_FACTOR_DEFS) {
		const rk = f_navReturnDbKey(d.internal)
		if (retByKey[rk] !== null) doc[rk] = retByKey[rk]
	}

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
