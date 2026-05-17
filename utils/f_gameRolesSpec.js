/** 角色 1～10 与 docs/factor_game_roles.html 一致；第 11 号为联调用「测试角色」，不在原始 HTML 手册十卡内，见 utils/f_roleTestRole.js */
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

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   subtitle: string,
 *   mainFactor: string,
 *   subFactor: string,
 *   roleIntro: string,
 *   activeSkillName: string,
 *   activeSkillDesc: string,
 *   passiveSkillName: string,
 *   passiveSkillDesc: string
 * }} FGameRoleDef
 */

/** @type {FGameRoleDef[]} */
export const F_GAME_ROLES = [
	{
		id: 1,
		name: '萤火',
		subtitle: '小市值成长',
		mainFactor: '规模',
		subFactor: '成长',
		roleIntro: '偏小盘与成长风格：在规模因子上与庄家博弈，运行阶段随成长敞口调节规模收益弹性。',
		activeSkillName: '借势',
		activeSkillDesc:
			'你可选择发动。发动后，若庄家「规模」≥ 0，你的「规模」改为 -5；若庄家 < 0，改为 -3。',
		passiveSkillName: '轻身',
		passiveSkillDesc: '若「成长」> 0，规模收益 ×2；否则 ×0.5。'
	},
	{
		id: 2,
		name: '追风',
		subtitle: '牛市猎手',
		mainFactor: '贝塔',
		subFactor: '动量',
		roleIntro: '高弹性贝塔与动量结合，适合趋势行情；被动随动量方向放大或收缩贝塔贡献。',
		activeSkillName: '逐浪',
		activeSkillDesc: '你可选择将自己的「贝塔」改为场上平均值 + 2，或改为场上最大值。二选一。',
		passiveSkillName: '乘势',
		passiveSkillDesc: '若「动量」> 0，贝塔收益 ×2；否则 ×0.5。'
	},
	{
		id: 3,
		name: '盾墙',
		subtitle: '熊市防守',
		mainFactor: '残差波动',
		subFactor: '市净',
		roleIntro: '防守型残差波动与估值因子；主动压低波动暴露，被动与市净敞口联动调节残差波动收益。',
		activeSkillName: '预判',
		activeSkillDesc: '你可选择将自己的「残差波动」改为 -4，或改为场上最低值 - 1（最低锁 -5）。二选一。',
		passiveSkillName: '铁壁',
		passiveSkillDesc: '若「市净」> 0，残差波动收益 ×2；否则 ×0.5。'
	},
	{
		id: 4,
		name: '刀客',
		subtitle: '涨停敢死队',
		mainFactor: '动量',
		subFactor: '流动性',
		roleIntro: '进攻型动量与流动性；主动追逐极端动量，被动由流动性敞口决定动量收益倍率。',
		activeSkillName: '追涨',
		activeSkillDesc:
			'你可选择将自己的「动量」改为场上最大值 + 1（上限 5），或改为庄家动量 + 2（上限 5）。二选一。',
		passiveSkillName: '嗜血',
		passiveSkillDesc: '若「流动性」> 0，动量收益 ×2；否则 ×0.5。'
	},
	{
		id: 5,
		name: '掘墓人',
		subtitle: '深度价值',
		mainFactor: '市净',
		subFactor: '盈利收益',
		roleIntro: '深度价值与盈利收益；主动拉高市净暴露，被动视盈利收益符号调节市净贡献。',
		activeSkillName: '左侧',
		activeSkillDesc: '你可选择将自己的「市净」改为 +4 或 +5。二选一。',
		passiveSkillName: '捡漏',
		passiveSkillDesc: '若「盈利收益」> 0，市净收益 ×2；否则 ×0.5。'
	},
	{
		id: 6,
		name: '磐石',
		subtitle: '质量稳健',
		mainFactor: '盈利收益',
		subFactor: '杠杆',
		roleIntro: '质量与盈利收益为核心；主动向场上均值靠拢，被动在杠杆偏保守时强化盈利收益。',
		activeSkillName: '避险',
		activeSkillDesc: '你可选择将自己的「盈利收益」改为场上平均值 + 1，或改为场上平均值 + 2。二选一。',
		passiveSkillName: '厚利',
		passiveSkillDesc: '若「杠杆」< 0，盈利收益 ×2；否则 ×0.5。'
	},
	{
		id: 7,
		name: '夹缝',
		subtitle: '中盘掘金',
		mainFactor: '非线性规模',
		subFactor: '成长',
		roleIntro: '中盘与非线性规模；主动与庄家因子对位，被动由成长方向调节非线性规模收益。',
		activeSkillName: '腾挪',
		activeSkillDesc: '你可选择将自己的「非线性规模」改为 0，或改为庄家该因子的相反数。二选一。',
		passiveSkillName: '中坚',
		passiveSkillDesc: '若「成长」> 0，非线性规模收益 ×2；否则 ×0.5。'
	},
	{
		id: 8,
		name: '秤砣',
		subtitle: 'GARP策略',
		mainFactor: '成长',
		subFactor: '市净',
		roleIntro: '成长与估值平衡（GARP）；主动跟随均值或庄家，被动由市净符号调节成长收益。',
		activeSkillName: '纠偏',
		activeSkillDesc: '你可选择将自己的「成长」改为场上平均值，或改为庄家值。二选一。',
		passiveSkillName: '平衡',
		passiveSkillDesc: '若「市净」> 0，成长收益 ×2；否则 ×0.5。'
	},
	{
		id: 9,
		name: '刺猬',
		subtitle: '小盘防御',
		mainFactor: '规模',
		subFactor: '残差波动',
		roleIntro: '小盘+低波防守；主动进一步压低规模暴露，被动在残差波动偏防御时强化规模收益。',
		activeSkillName: '缩壳',
		activeSkillDesc: '你可选择将自己的「规模」改为 -3 或 -4。二选一。',
		passiveSkillName: '抱团',
		passiveSkillDesc: '若「残差波动」< 0，规模收益 ×2；否则 ×0.5。'
	},
	{
		id: 10,
		name: '走钢丝',
		subtitle: '杠铃策略',
		mainFactor: '动量',
		subFactor: '市净',
		roleIntro: '杠铃式动量与估值；主动锚定场上极值，被动由市净方向决定动量收益倍率。',
		activeSkillName: '切换',
		activeSkillDesc: '你可选择将自己的「动量」改为场上最大值，或改为场上最小值。二选一。',
		passiveSkillName: '两端',
		passiveSkillDesc: '若「市净」> 0，动量收益 ×2；否则 ×0.5。'
	},
	{
		id: 11,
		name: '测试角色',
		subtitle: '仅供调试',
		mainFactor: '—',
		subFactor: '—',
		roleIntro: '不参与正式数值平衡，仅用于验证结算链路与 UI。',
		activeSkillName: '收益修型',
		activeSkillDesc:
			'博弈页本轮提交前打开开关：本局仅可发动一次；发动当轮将各因子收益贡献中最低的一项改为与最高项相同。',
		passiveSkillName: '净值的回响',
		passiveSkillDesc: '仅全局轮次号为 2 的一轮：该轮净值步长额外 ×2（自动，无按钮）。'
	}
]

/**
 * @param {number} roleId
 * @returns {FGameRoleDef | null}
 */
export function f_gameRoleMetaById(roleId) {
	const n = parseInt(roleId, 10)
	return F_GAME_ROLES.find((r) => r.id === n) || null
}

export function f_gameRolePortraitUrl(roleId) {
	const n = parseInt(roleId, 10)
	if (n === 11) {
		return `${F_CDN}/${F_SLUGS[0]}_1.png`
	}
	const slug = Number.isFinite(n) && n >= 1 && n <= 10 ? F_SLUGS[n - 1] : F_SLUGS[0]
	const id = Number.isFinite(n) && n >= 1 && n <= 10 ? n : 1
	return `${F_CDN}/${slug}_${id}.png`
}
