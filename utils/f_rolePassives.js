/**
 * 角色被动（运行阶段）：与 docs/factor_game_roles.html 一致。
 * 对「主因子」当期贡献项 (exposure * 市场因子收益) 乘以 2 或 0.5。
 */
import { F_FACTOR_INTERNAL_KEYS } from './f_gameFactorSpec.js'

/** @type {Record<number, { primary: string, secondary: string, op: 'gt' | 'lt' }>} */
export const F_ROLE_PASSIVE_RULES = {
	1: { primary: 'size', secondary: 'growth', op: 'gt' },
	2: { primary: 'beta', secondary: 'momentum', op: 'gt' },
	3: { primary: 'residual_volatility', secondary: 'book_to_price', op: 'gt' },
	4: { primary: 'momentum', secondary: 'liquidity', op: 'gt' },
	5: { primary: 'book_to_price', secondary: 'earnings_yield', op: 'gt' },
	6: { primary: 'earnings_yield', secondary: 'leverage', op: 'lt' },
	7: { primary: 'non_linear_size', secondary: 'growth', op: 'gt' },
	8: { primary: 'growth', secondary: 'book_to_price', op: 'gt' },
	9: { primary: 'size', secondary: 'residual_volatility', op: 'lt' },
	10: { primary: 'momentum', secondary: 'book_to_price', op: 'gt' }
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
	const secVal = Number(expRow[rule.secondary]) || 0
	const ok = rule.op === 'gt' ? secVal > 0 : secVal < 0
	const mult = ok ? 2 : 0.5
	out[rule.primary] = (out[rule.primary] || 0) * mult
	let totalReturn = 0
	for (const f of F_FACTOR_INTERNAL_KEYS) totalReturn += out[f] || 0
	return { factorReturns: out, totalReturn }
}
