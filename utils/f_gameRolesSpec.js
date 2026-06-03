/** 角色 1～10 与 docs/factor_game_roles.html、角色技能设计_revising.md 一致；第 11 号为联调用「测试角色」，见 utils/f_roleTestRole.js */
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
		roleIntro: '偏小盘与成长风格：主动随庄家规模敞口调整自身规模；运行阶段由成长敞口调节成长收益倍率。',
		activeSkillName: '主借势',
		activeSkillDesc:
			'配置阶段可发动。若庄家「规模」=0，你的「规模」改为0；若庄家「规模」<0，你的「规模」改为-5。',
		passiveSkillName: '被轻身',
		passiveSkillDesc: '若「成长」>0，成长收益×1.5；否则成长收益×0.9。'
	},
	{
		id: 2,
		name: '追风',
		subtitle: '牛市猎手',
		mainFactor: '贝塔',
		subFactor: '动量',
		roleIntro: '高弹性贝塔与动量结合；主动随庄家贝塔方向加减敞口，被动由动量方向调节贝塔收益。',
		activeSkillName: '主逐浪',
		activeSkillDesc:
			'配置阶段可发动，二选一：若庄家「贝塔」>0，你的贝塔在原有配置基础上+2；若庄家「贝塔」<0，你的贝塔在原有配置基础上-2。',
		passiveSkillName: '被乘势',
		passiveSkillDesc: '若「动量」>0，贝塔收益×1.5；否则贝塔收益×0.9。'
	},
	{
		id: 3,
		name: '盾墙',
		subtitle: '熊市防守',
		mainFactor: '残差波动',
		subFactor: '净市率',
		roleIntro: '防守型残差波动与净市率；主动按庄家残差波动方向定档，被动由净市率敞口调节残差波动收益。',
		activeSkillName: '主预判',
		activeSkillDesc:
			'配置阶段可发动，二选一：若庄家「残差波动」<0，将你的「残差波动」改为-4；若庄家「残差波动」>0，改为1。',
		passiveSkillName: '被铁壁',
		passiveSkillDesc: '若「净市率」>0，残差波动收益×1.5；否则残差波动收益×0.9。'
	},
	{
		id: 4,
		name: '刀客',
		subtitle: '涨停敢死队',
		mainFactor: '动量',
		subFactor: '流动性',
		roleIntro: '进攻型动量与流动性；主动在庄家动量为正时追逐场上极端动量，被动由流动性敞口决定动量收益倍率。',
		activeSkillName: '主追涨',
		activeSkillDesc:
			'配置阶段可发动：若庄家「动量」>0，将自己的「动量」改为场上最大值+1（上限5）。',
		passiveSkillName: '被嗜血',
		passiveSkillDesc: '若「流动性」>0，动量收益×1.5；否则动量收益×0.9。'
	},
	{
		id: 5,
		name: '掘墓人',
		subtitle: '深度价值',
		mainFactor: '净市率',
		subFactor: '盈利收益',
		roleIntro: '深度价值与盈利收益；主动按庄家净市率方向定档，被动由盈利收益符号调节净市率贡献。',
		activeSkillName: '主左侧',
		activeSkillDesc:
			'配置阶段可发动，二选一：若庄家「净市率」<0，将你的「净市率」改为0；若庄家「净市率」>0，改为4。',
		passiveSkillName: '被捡漏',
		passiveSkillDesc: '若「盈利收益」>0，净市率收益×1.5；否则净市率收益×0.9。'
	},
	{
		id: 6,
		name: '磐石',
		subtitle: '质量稳健',
		mainFactor: '盈利收益',
		subFactor: '杠杆',
		roleIntro: '质量与盈利收益为核心；主动按庄家盈利收益方向定档，被动在杠杆偏保守时强化盈利收益。',
		activeSkillName: '主避险',
		activeSkillDesc:
			'配置阶段可发动，二选一：若庄家「盈利收益」>0，将你的「盈利收益」改为5；若庄家「盈利收益」<0，改为0。',
		passiveSkillName: '被厚利',
		passiveSkillDesc: '若「杠杆」<0，盈利收益×1.5；否则盈利收益×0.9。'
	},
	{
		id: 7,
		name: '夹缝',
		subtitle: '中盘掘金',
		mainFactor: '非线性规模',
		subFactor: '成长',
		roleIntro: '中盘与非线性规模；主动按庄家非线性规模方向定档，被动由成长方向调节非线性规模收益。',
		activeSkillName: '主腾挪',
		activeSkillDesc:
			'配置阶段可发动，二选一：若庄家「非线性规模」>0，将你的「非线性规模」改为5；若庄家「非线性规模」<0，改为1。',
		passiveSkillName: '被中坚',
		passiveSkillDesc: '若「成长」>0，非线性规模收益×1.5；否则非线性规模收益×0.9。'
	},
	{
		id: 8,
		name: '秤砣',
		subtitle: 'GARP策略',
		mainFactor: '成长',
		subFactor: '净市率',
		roleIntro: '成长与净市率平衡（GARP）；主动按庄家成长方向定档，被动在净市率偏防御时强化成长收益。',
		activeSkillName: '主纠偏',
		activeSkillDesc:
			'配置阶段可发动，二选一：若庄家「成长」>0，将你的「成长」改为4；若庄家「成长」<0，改为1。',
		passiveSkillName: '被平衡',
		passiveSkillDesc: '若「净市率」<0，成长收益×1.5；否则成长收益×0.9。'
	},
	{
		id: 9,
		name: '刺猬',
		subtitle: '小盘防御',
		mainFactor: '规模',
		subFactor: '残差波动',
		roleIntro: '小盘与低波防守；主动按庄家规模方向定档，被动在残差波动偏防御时强化规模收益。',
		activeSkillName: '主缩壳',
		activeSkillDesc:
			'配置阶段可发动，二选一：若庄家「规模」>0，将你的「规模」改为3；若庄家「规模」<0，改为-3。',
		passiveSkillName: '被抱团',
		passiveSkillDesc: '若「残差波动」<0，规模收益×1.5；否则规模收益×0.9。'
	},
	{
		id: 10,
		name: '走钢丝',
		subtitle: '杠铃策略',
		mainFactor: '动量',
		subFactor: '净市率',
		roleIntro: '杠铃式动量与净市率；主动按庄家动量或净市率分支切换动量敞口，被动在净市率偏防御时强化动量收益。',
		activeSkillName: '主切换',
		activeSkillDesc:
			'配置阶段可发动，二选一：A 按庄家「动量」（>0 改为3，<0 改为-3）；B 按庄家「净市率」（>0 改为2，<0 改为-2）。',
		passiveSkillName: '被两端',
		passiveSkillDesc: '若「净市率」<0，动量收益×1.5；否则动量收益×0.9。'
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

/** 已被选中的角色展示图：如 yinghuo_1_gray.jpg */
export function f_gameRolePortraitGrayUrl(roleId) {
	const n = parseInt(roleId, 10)
	if (n === 11) {
		return `${F_CDN}/${F_SLUGS[0]}_1_gray.jpg`
	}
	const slug = Number.isFinite(n) && n >= 1 && n <= 10 ? F_SLUGS[n - 1] : F_SLUGS[0]
	const id = Number.isFinite(n) && n >= 1 && n <= 10 ? n : 1
	return `${F_CDN}/${slug}_${id}_gray.jpg`
}

/** @param {number} roleId @param {boolean} selected 是否已被某玩家选中 */
export function f_gameRolePortraitDisplayUrl(roleId, selected) {
	return selected ? f_gameRolePortraitGrayUrl(roleId) : f_gameRolePortraitUrl(roleId)
}
