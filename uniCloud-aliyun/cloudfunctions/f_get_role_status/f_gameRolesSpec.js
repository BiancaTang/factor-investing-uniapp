'use strict'

/** 与 utils/f_gameRolesSpec.js、docs/factor_game_roles.html 一致；置于本目录：单函数上传不含 ../common */

const F_CDN = 'https://mp-97b2aa2e-12fb-4d19-b974-f61aadc80368.cdn.bspapp.com/f_static/pic'
const F_SLUGS = [
	'yinghuo',
	'zhuifeng',
	'dunqiang',
	'daoke',
	'juemuren',
	'panshi',
	'jiafeng',
	'chengtuo',
	'ciwei',
	'zougangsi'
]

const F_ROLES = [
	{ id: 1, name: '萤火', subtitle: '小市值成长', mainFactor: '规模', subFactor: '成长' },
	{ id: 2, name: '追风', subtitle: '牛市猎手', mainFactor: '贝塔', subFactor: '动量' },
	{ id: 3, name: '盾墙', subtitle: '熊市防守', mainFactor: '残差波动', subFactor: '净市率' },
	{ id: 4, name: '刀客', subtitle: '涨停敢死队', mainFactor: '动量', subFactor: '流动性' },
	{ id: 5, name: '掘墓人', subtitle: '深度价值', mainFactor: '净市率', subFactor: '盈利收益' },
	{ id: 6, name: '磐石', subtitle: '质量稳健', mainFactor: '盈利收益', subFactor: '杠杆' },
	{ id: 7, name: '夹缝', subtitle: '中盘掘金', mainFactor: '非线性规模', subFactor: '成长' },
	{ id: 8, name: '秤砣', subtitle: 'GARP策略', mainFactor: '成长', subFactor: '净市率' },
	{ id: 9, name: '刺猬', subtitle: '小盘防御', mainFactor: '规模', subFactor: '残差波动' },
	{ id: 10, name: '走钢丝', subtitle: '杠铃策略', mainFactor: '动量', subFactor: '净市率' },
	{ id: 11, name: '测试角色', subtitle: '仅供调试', mainFactor: '—', subFactor: '—' }
]

function f_rolePortraitUrl(roleId) {
	const n = parseInt(roleId, 10)
	if (n === 11) {
		return `${F_CDN}/${F_SLUGS[0]}_1.png`
	}
	const slug = Number.isFinite(n) && n >= 1 && n <= 10 ? F_SLUGS[n - 1] : F_SLUGS[0]
	const id = Number.isFinite(n) && n >= 1 && n <= 10 ? n : 1
	return `${F_CDN}/${slug}_${id}.png`
}

function f_roleById(roleId) {
	const n = parseInt(roleId, 10)
	return F_ROLES.find((r) => r.id === n) || null
}

module.exports = {
	F_ROLES,
	f_rolePortraitUrl,
	f_roleById
}
