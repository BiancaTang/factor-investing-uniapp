/**
 * 第 11 号「测试角色」：仅用于联调，不参与正式平衡。
 * 主动：每轮自动将当期因子收益贡献最低的一项改为与最高项相同。
 * 被动：仅第 2 轮，净值步长 ×2（等价于该轮 (1+total_return)×2）。
 */
import { F_FACTOR_INTERNAL_KEYS } from './f_gameFactorSpec.js'

export const F_TEST_ROLE_ID = 11

/**
 * @param {Record<string, number>} factorReturns internal -> exposure * factor_return
 */
export function f_applyTestRoleActiveToFactorReturns(factorReturns) {
	const keys = F_FACTOR_INTERNAL_KEYS
	const out = { ...factorReturns }
	if (!keys.length) {
		let totalReturn = 0
		for (const k of Object.keys(out)) totalReturn += out[k] || 0
		return { factorReturns: out, totalReturn }
	}
	let minK = keys[0]
	let maxK = keys[0]
	let minV = Number(out[minK]) || 0
	let maxV = minV
	for (const k of keys) {
		const v = Number(out[k]) || 0
		if (v < minV) {
			minV = v
			minK = k
		}
		if (v > maxV) {
			maxV = v
			maxK = k
		}
	}
	out[minK] = maxV
	let totalReturn = 0
	for (const k of keys) totalReturn += out[k] || 0
	return { factorReturns: out, totalReturn }
}
