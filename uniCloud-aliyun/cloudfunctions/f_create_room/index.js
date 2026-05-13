'use strict'

const db = uniCloud.database()
const f_users = db.collection('f_user_profile')
const f_rooms = db.collection('f_room')

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

async function f_requireAdmin(f_uid) {
	const r = await f_users.where({ f_uid }).limit(1).get()
	const row = r.data && r.data[0]
	if (!row) return { f_ok: false, f_message: '用户不存在' }
	if (row.f_role !== 'admin') return { f_ok: false, f_message: '仅管理员可创建房间' }
	return { f_ok: true }
}

exports.main = async (event) => {
	const f_admin_uid = event.f_admin_uid != null ? String(event.f_admin_uid).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_banker_intervene = !!event.f_banker_intervene
	/** 玩家席上限（不含庄家），与 10 角色一致；不再由创建页传入 */
	const f_group_count = 10

	if (!f_isPlayerUid(f_admin_uid)) {
		return { f_code: 400, f_message: '缺少或无效的 f_admin_uid', f_data: null }
	}

	const adm = await f_requireAdmin(f_admin_uid)
	if (!adm.f_ok) {
		return { f_code: 403, f_message: adm.f_message, f_data: null }
	}

	if (!/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '房间号须为 4 位数字', f_data: null }
	}

	const dup = await f_rooms.where({ f_room_code }).limit(1).get()
	if (dup.data && dup.data.length > 0) {
		return { f_code: 409, f_message: '该房间号已存在', f_data: null }
	}

	const f_now = Date.now()
	const doc = {
		f_room_code,
		f_group_count,
		// 0 表示无限轮，由管理员主动结束游戏
		f_round_count: 0,
		f_banker_intervene,
		// 单轮时长：默认 5 分钟
		f_round_duration_sec: 300,
		f_game_ended: false,
		f_game_ended_at: 0,
		f_join_locked: false,
		f_playing_started: false,
		f_admin_uid,
		/** 管理员当前开启的轮次，0 表示未开启，玩家不可提交 */
		f_open_round_index: 0,
		/** 当前轮开始时间戳；未开启时为 0 */
		f_round_started_at: 0,
		f_round_random_event_id: 0,
		f_round_random_event_round: 0,
		f_round_random_event_snapshot: null,
		f_random_events_by_round: {},
		f_created_at: f_now,
		f_updated_at: f_now
	}

	const add = await f_rooms.add(doc)
	return {
		f_code: 0,
		f_message: 'ok',
		f_data: { f_id: add.id, f_room_code }
	}
}
