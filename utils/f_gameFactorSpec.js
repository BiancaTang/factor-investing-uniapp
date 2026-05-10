/**
 * 十因子定义：与 FastAPI 示例 DataFrame 列顺序一致（fac_*）。
 * 仿真 internal 键用于 f_factorEngine 与归因字段 `${internal}_return`。
 */

/** @typedef {{ key: string, internal: string, label: string, unitReturn: number, introTitle: string, introDesc: string }} FFactorDef */

/** @type {FFactorDef[]} */
export const F_FACTOR_DEFS = [
	{
		key: 'fac_size',
		internal: 'size',
		label: '规模',
		unitReturn: 0.05,
		introTitle: 'size - 市值因子',
		introDesc:
			'衡量公司规模。通常在 A 股中，小市值长期更容易出现超额收益，但波动也更大。'
	},
	{
		key: 'fac_beta',
		internal: 'beta',
		label: '贝塔',
		unitReturn: 0.02,
		introTitle: 'beta - 市场敏感度',
		introDesc: '衡量相对市场的弹性。贝塔高时对大盘波动更敏感，需结合方向与市场环境理解。'
	},
	{
		key: 'fac_momentum',
		internal: 'momentum',
		label: '动量',
		unitReturn: 0.02,
		introTitle: 'momentum - 动量因子',
		introDesc: '衡量近期趋势强弱。趋势更强通常打分更高，但过热后也可能出现反转。'
	},
	{
		key: 'fac_non_linear_size',
		internal: 'non_linear_size',
		label: '非线性规模',
		unitReturn: 0.02,
		introTitle: 'non_linear_size - 非线性规模',
		introDesc: '刻画规模与收益之间的非线性关系，常与纯规模因子配合使用。'
	},
	{
		key: 'fac_book_to_price',
		internal: 'book_to_price',
		label: '市净',
		unitReturn: 0.01,
		introTitle: 'book_to_price - 净市率因子',
		introDesc: '可理解为市净率（P/B）的倒数，越高表示估值相对更便宜。'
	},
	{
		key: 'fac_earnings_yield',
		internal: 'earnings_yield',
		label: '盈利收益',
		unitReturn: 0.01,
		introTitle: 'earnings_yield - 盈利收益率',
		introDesc: '与盈利相对价格相关，偏高常对应更「便宜」的盈利定价（需结合质量）。'
	},
	{
		key: 'fac_growth',
		internal: 'growth',
		label: '成长',
		unitReturn: 0.03,
		introTitle: 'growth - 成长因子',
		introDesc: '衡量公司成长性。成长越高一般打分越高，但也要警惕估值过贵带来的回撤。'
	},
	{
		key: 'fac_leverage',
		internal: 'leverage',
		label: '杠杆',
		unitReturn: 0.015,
		introTitle: 'leverage - 杠杆因子',
		introDesc: '反映财务杠杆水平。高杠杆可能放大收益与波动，对利率与信用环境更敏感。'
	},
	{
		key: 'fac_liquidity',
		internal: 'liquidity',
		label: '流动性',
		unitReturn: 0.01,
		introTitle: 'liquidity - 流动性因子',
		introDesc: '与成交活跃度、换手等相关；流动性差往往伴随更高溢价或更高波动。'
	},
	{
		key: 'fac_residual_volatility',
		internal: 'residual_volatility',
		label: '残差波动',
		unitReturn: 0.01,
		introTitle: 'residual_volatility - 残差波动因子',
		introDesc: '衡量个股特异性波动。低残差波动通常更稳健，高残差波动弹性更高。'
	}
]

export const F_FACTOR_INTERNAL_KEYS = F_FACTOR_DEFS.map((d) => d.internal)

/** 与云函数 f_game_round 文档字段一致，如 f_size_return */
export function f_navReturnDbKey(internal) {
	return `f_${internal}_return`
}
