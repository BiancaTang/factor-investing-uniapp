'use strict'

/**
 * 危险操作：仅管理员。
 * - 单集合：event.f_collection（白名单内）
 * - 全库业务数据：event.f_purge_all === true，且 event.f_confirm === 'DELETE_ALL_DATA'
 *
 * 全量顺序：对局轮次 → 房间成员 → 房间 → 用户资料
 */
const ALLOW = new Set(['f_game_round', 'f_room_member', 'f_room', 'f_user_profile', 'factor'])

const PURGE_ALL_ORDER = ['f_game_round', 'f_room_member', 'f_room', 'f_user_profile']

async function f_requireAdmin(db, f_admin_phone) {
	const fu = db.collection('f_user_profile')
	const ur = await fu.where({ f_phone: f_admin_phone }).limit(1).get()
	const urow = ur.data && ur.data[0]
	if (!urow || urow.f_role !== 'admin') {
		return { f_ok: false, f_message: '仅管理员可执行' }
	}
	return { f_ok: true }
}

async function purgeOneCollection(db, name) {
	const col = db.collection(name)
	let removed = 0
	let guard = 0
	const maxGuard = 2000
	while (guard < maxGuard) {
		guard++
		const r = await col.limit(500).get()
		const rows = r.data || []
		if (!rows.length) break
		for (const row of rows) {
			await col.doc(row._id).remove()
			removed++
		}
	}
	return removed
}

exports.main = async (event) => {
	const f_admin_phone = event.f_admin_phone != null ? String(event.f_admin_phone).trim() : ''

	if (!/^1\d{10}$/.test(f_admin_phone)) {
		return { f_code: 400, f_message: '管理员手机号无效', f_data: null }
	}

	const db = uniCloud.database()

	const adm = await f_requireAdmin(db, f_admin_phone)
	if (!adm.f_ok) {
		return { f_code: 403, f_message: adm.f_message, f_data: null }
	}

	if (event.f_purge_all === true || event.f_purge_all === 'true') {
		if (String(event.f_confirm || '').trim() !== 'DELETE_ALL_DATA') {
			return {
				f_code: 400,
				f_message: '全量清空需传入 f_confirm 为字符串 DELETE_ALL_DATA',
				f_data: null
			}
		}
		const report = {}
		let total = 0
		for (const name of PURGE_ALL_ORDER) {
			const n = await purgeOneCollection(db, name)
			report[name] = n
			total += n
		}
		return {
			f_code: 0,
			f_message: 'ok',
			f_data: { f_mode: 'purge_all', f_removed_by_collection: report, f_removed_total: total }
		}
	}

	const f_collection = event.f_collection != null ? String(event.f_collection).trim() : 'f_game_round'
	if (!ALLOW.has(f_collection)) {
		return {
			f_code: 400,
			f_message: '仅允许清空: ' + [...ALLOW].join(', ') + '；或全量见 f_purge_all + f_confirm',
			f_data: null
		}
	}

	const removed = await purgeOneCollection(db, f_collection)

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: { f_mode: 'single', f_collection, f_removed: removed }
	}
}
