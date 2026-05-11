'use strict'

const db = uniCloud.database()
const f_members = db.collection('f_room_member')

const ROLES = [
	{ id: 1, name: '萤火', subtitle: '小市值成长', mainFactor: '规模', subFactor: '成长' },
	{ id: 2, name: '追风', subtitle: '牛市猎手', mainFactor: '贝塔', subFactor: '动量' },
	{ id: 3, name: '盾墙', subtitle: '熊市防守', mainFactor: '残差波动', subFactor: '市净' },
	{ id: 4, name: '刀客', subtitle: '涨停敢死队', mainFactor: '动量', subFactor: '流动性' },
	{ id: 5, name: '掘墓人', subtitle: '深度价值', mainFactor: '市净', subFactor: '盈利收益' },
	{ id: 6, name: '磐石', subtitle: '质量稳健', mainFactor: '盈利收益', subFactor: '杠杆' },
	{ id: 7, name: '夹缝', subtitle: '中盘掘金', mainFactor: '非线性规模', subFactor: '成长' },
	{ id: 8, name: '秤砣', subtitle: 'GARP策略', mainFactor: '成长', subFactor: '市净' },
	{ id: 9, name: '刺猬', subtitle: '小盘防御', mainFactor: '规模', subFactor: '残差波动' },
	{ id: 10, name: '走钢丝', subtitle: '杠铃策略', mainFactor: '动量', subFactor: '市净' }
]

exports.main = async (event) => {
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''

	if (!/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '房间号须为 4 位数字', f_data: null }
	}

	const membersRes = await f_members.where({ f_room_code }).get()
	const members = membersRes.data || []

	const selectedRoles = members
		.filter(m => m.f_role_id)
		.map(m => ({
			f_player_uid: m.f_player_uid,
			f_nick_name: m.f_nick_name,
			f_role_id: m.f_role_id,
			f_role_name: m.f_role_name
		}))

	const takenRoleIds = selectedRoles.map(r => r.f_role_id)

	const allRoles = ROLES.map(r => ({
		...r,
		selected: takenRoleIds.includes(r.id),
		selected_by: selectedRoles.find(sr => sr.f_role_id === r.id)?.f_nick_name || null
	}))

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: {
			f_roles: allRoles,
			f_selected_count: selectedRoles.length,
			f_total_count: members.length,
			f_selected_players: selectedRoles
		}
	}
}
