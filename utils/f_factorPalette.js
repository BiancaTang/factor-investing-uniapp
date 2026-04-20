/** 五因子统一配色：配置说明、收益曲线、收益归因共用 */
export const F_FACTOR_COLORS = {
	size: '#e98a2f',
	momentum: '#f2c30c',
	book_to_price: '#7bbc43',
	growth: '#37bdb5',
	residual_volatility: '#e14c65'
}

export const F_FACTOR_COLOR_BY_FAC_KEY = {
	fac_size: F_FACTOR_COLORS.size,
	fac_momentum: F_FACTOR_COLORS.momentum,
	fac_book_to_price: F_FACTOR_COLORS.book_to_price,
	fac_growth: F_FACTOR_COLORS.growth,
	fac_residual_volatility: F_FACTOR_COLORS.residual_volatility
}

export const F_FACTOR_COLOR_LIST = [
	F_FACTOR_COLORS.size,
	F_FACTOR_COLORS.momentum,
	F_FACTOR_COLORS.book_to_price,
	F_FACTOR_COLORS.growth,
	F_FACTOR_COLORS.residual_volatility
]
