import { F_FACTOR_DEFS } from './f_gameFactorSpec.js'

/** 十因子统一配色：配置说明、收益曲线、收益归因共用（键为 internal） */
export const F_FACTOR_COLORS = {
	size: '#e98a2f',
	beta: '#9b7ed9',
	momentum: '#f2c30c',
	non_linear_size: '#6eb5e8',
	book_to_price: '#7bbc43',
	earnings_yield: '#5cdb9b',
	growth: '#37bdb5',
	leverage: '#c97cff',
	liquidity: '#8a9bb0',
	residual_volatility: '#e14c65'
}

export const F_FACTOR_COLOR_BY_FAC_KEY = Object.fromEntries(
	F_FACTOR_DEFS.map((d) => [d.key, F_FACTOR_COLORS[d.internal]])
)

export const F_FACTOR_COLOR_LIST = F_FACTOR_DEFS.map((d) => F_FACTOR_COLORS[d.internal])
