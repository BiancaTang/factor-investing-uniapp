'use strict'

/**
 * 与 utils/f_gameFactorSpec.js 保持键名、顺序、unitReturn 一致（云函数无法直接 import 前端目录）。
 */

const F_FACTOR_DEFS = [
	{ key: 'fac_size', internal: 'size', unitReturn: 0.05 },
	{ key: 'fac_beta', internal: 'beta', unitReturn: 0.02 },
	{ key: 'fac_momentum', internal: 'momentum', unitReturn: 0.02 },
	{ key: 'fac_non_linear_size', internal: 'non_linear_size', unitReturn: 0.02 },
	{ key: 'fac_book_to_price', internal: 'book_to_price', unitReturn: 0.01 },
	{ key: 'fac_earnings_yield', internal: 'earnings_yield', unitReturn: 0.01 },
	{ key: 'fac_growth', internal: 'growth', unitReturn: 0.03 },
	{ key: 'fac_leverage', internal: 'leverage', unitReturn: 0.015 },
	{ key: 'fac_liquidity', internal: 'liquidity', unitReturn: 0.01 },
	{ key: 'fac_residual_volatility', internal: 'residual_volatility', unitReturn: 0.01 }
]

const FACTORS = F_FACTOR_DEFS.map((d) => d.internal)
const FAC_TO_INTERNAL = Object.fromEntries(F_FACTOR_DEFS.map((d) => [d.key, d.internal]))
const FACTOR_UNIT_RETURNS = Object.fromEntries(F_FACTOR_DEFS.map((d) => [d.internal, d.unitReturn]))

function f_navReturnDbKey(internal) {
	return `f_${internal}_return`
}

function f_pickFacFromRow(g) {
	const o = {}
	for (const d of F_FACTOR_DEFS) {
		o[d.key] = g[d.key]
	}
	return o
}

function f_pickReturnFromRow(g) {
	const o = {}
	for (const d of F_FACTOR_DEFS) {
		const k = f_navReturnDbKey(d.internal)
		o[k] = g[k]
	}
	return o
}

module.exports = {
	F_FACTOR_DEFS,
	FACTORS,
	FAC_TO_INTERNAL,
	FACTOR_UNIT_RETURNS,
	f_navReturnDbKey,
	f_pickFacFromRow,
	f_pickReturnFromRow
}
