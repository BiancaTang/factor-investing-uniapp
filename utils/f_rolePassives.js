/**
 * 角色被动（运行阶段）：与角色技能手册一致。
 * 对指定因子当期贡献项 (exposure * 市场因子收益) 乘以 1.5 或 0.9。
 */
import { F_FACTOR_INTERNAL_KEYS } from './f_gameFactorSpec.js'

export const F_PASSIVE_MULT_UP = 1.5
export const F_PASSIVE_MULT_DOWN = 0.9

/** @type {Record<number, { target: string, cond: string, op: 'gt' | 'lt' }>} */
export const F_ROLE_PASSIVE_RULES = {
	1: { target: 'growth', cond: 'growth', op: 'gt' },
	2: { target: 'beta', cond: 'momentum', op: 'gt' },
	3: { target: 'residual_volatility', cond: 'book_to_price', op: 'gt' },
	4: { target: 'momentum', cond: 'liquidity', op: 'gt' },
	5: { target: 'book_to_price', cond: 'earnings_yield', op: 'gt' },
	6: { target: 'earnings_yield', cond: 'leverage', op: 'lt' },
	7: { target: 'non_linear_size', cond: 'growth', op: 'gt' },
	8: { target: 'growth', cond: 'book_to_price', op: 'lt' },
	9: { target: 'size', cond: 'residual_volatility', op: 'lt' },
	10: { target: 'momentum', cond: 'book_to_price', op: 'lt' }
}

/**
 * @param {Record<string, number>} expRow internal -> exposure
 * @param {Record<string, number>} factorReturns internal -> exposure * factor_return
 * @param {number} roleId 1..10
 */
export function f_applyPassiveToFactorReturns(expRow, factorReturns, roleId) {
	const rule = F_ROLE_PASSIVE_RULES[roleId]
	const out = { ...factorReturns }
	if (!rule) {
		let totalReturn = 0
		for (const f of F_FACTOR_INTERNAL_KEYS) totalReturn += out[f] || 0
		return { factorReturns: out, totalReturn }
	}
	const secVal = Number(expRow[rule.cond]) || 0
	const ok = rule.op === 'gt' ? secVal > 0 : secVal < 0
	const mult = ok ? F_PASSIVE_MULT_UP : F_PASSIVE_MULT_DOWN
	out[rule.target] = (out[rule.target] || 0) * mult
	let totalReturn = 0
	for (const f of F_FACTOR_INTERNAL_KEYS) totalReturn += out[f] || 0
	return { factorReturns: out, totalReturn }
}
