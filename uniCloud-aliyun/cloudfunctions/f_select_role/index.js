'use strict'

const db = uniCloud.database()
const f_members = db.collection('f_room_member')

const ROLES = [
	{ id: 1, name: '萤火' },
	{ id: 2, name: '追风' },
	{ id: 3, name: '盾墙' },
	{ id: 4, name: '刀客' },
	{ id: 5, name: '掘墓人' },
	{ id: 6, name: '磐石' },
	{ id: 7, name: '夹缝' },
	{ id: 8, name: '秤砣' },
	{ id: 9, name: '刺猬' },
	{ id: 10, name: '走钢丝' }
]

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

exports.main = async (event) => {
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''
	const f_player_uid = event.f_player_uid != null ? String(event.f_player_uid).trim() : ''
	const f_role_id = parseInt(event.f_role_id, 10)
	const f_is_random = !!event.f_is_random

	if (!f_room_code || !f_player_uid) {
		return { f_code: 400, f_message: '缺少 f_room_code 或 f_player_uid', f_data: null }
	}

	if (!f_isPlayerUid(f_player_uid)) {
		return { f_code: 400, f_message: 'f_player_uid 无效', f_data: null }
	}

	if (!/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '房间号须为 4 位数字', f_data: null }
	}

	// 查找玩家当前记录
	const memberRes = await f_members
		.where({ f_room_code, f_player_uid })
		.limit(1)
		.get()

	if (!memberRes.data || !memberRes.data.length) {
		return { f_code: 404, f_message: '不在该房间中', f_data: null }
	}

	const member = memberRes.data[0]

	// 如果已经选了角色，不能重复选
	if (member.f_role_id && !f_is_random) {
		return { f_code: 409, f_message: '已经选择了角色，不可更改', f_data: null }
	}

	let finalRoleId = f_role_id

	// 处理随机选择
	if (f_is_random) {
		const randomCount = member.f_random_count || 0
		if (randomCount >= 3) {
			return { f_code: 403, f_message: '随机次数已用完（最多3次）', f_data: null }
		}

		// 获取已被选择的角色
		const allMembers = await f_members.where({ f_room_code }).get()
		const takenRoleIds = (allMembers.data || [])
			.map(m => m.f_role_id)
			.filter(Boolean)

		const availableRoles = ROLES.filter(r => !takenRoleIds.includes(r.id))
		if (availableRoles.length === 0) {
			return { f_code: 409, f_message: '所有角色已被选完', f_data: null }
		}

		// 随机选一个
		const randomIndex = Math.floor(Math.random() * availableRoles.length)
		finalRoleId = availableRoles[randomIndex].id
	} else {
		// 手动选择，检查是否已被选
		if (!ROLES.some(r => r.id === finalRoleId)) {
			return { f_code: 400, f_message: '无效的角色ID', f_data: null }
		}

		const exist = await f_members
			.where({ f_room_code, f_role_id: finalRoleId })
			.limit(1)
			.get()

		if (exist.data && exist.data.length) {
			return { f_code: 409, f_message: '该角色已被其他玩家选择', f_data: null }
		}
	}

	const role = ROLES.find(r => r.id === finalRoleId)
	const f_now = Date.now()

	// 更新记录
	const updateData = {
		f_role_id: finalRoleId,
		f_role_name: role.name,
		f_role_selected_at: f_now
	}

	if (f_is_random) {
		updateData.f_random_count = (member.f_random_count || 0) + 1
	}

	await f_members.doc(member._id).update(updateData)

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: {
			f_role_id: finalRoleId,
			f_role_name: role.name,
			f_random_count: updateData.f_random_count || member.f_random_count || 0
		}
	}
}
