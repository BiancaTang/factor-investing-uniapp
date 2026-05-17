/**
 * 角色 1～10 主动：按轮次在「写入槽位暴露」之后、「市场 factor_return」之前改写该玩家暴露。
 * 与 docs/factor_game_roles.html / f_gameRolesSpec 文案一致；本局每玩家主动至多发动 1 次（由 f_room_member.f_role_active_round 记录）。
 */
function f_clampInt(v) {
	const n = Math.round(Number(v))
	if (!Number.isFinite(n)) return 0
	return Math.max(-5, Math.min(5, n))
}

function f_valsFromRaw(rawByUid, internal) {
	return Object.values(rawByUid || {})
		.map((e) => Number(e && e[internal]) || 0)
		.filter((n) => Number.isFinite(n))
}

function f_avgInt(rawByUid, internal) {
	const vals = f_valsFromRaw(rawByUid, internal)
	if (!vals.length) return 0
	return f_clampInt(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function f_maxInt(rawByUid, internal) {
	const vals = f_valsFromRaw(rawByUid, internal)
	if (!vals.length) return 0
	return f_clampInt(Math.max(...vals))
}

function f_minInt(rawByUid, internal) {
	const vals = f_valsFromRaw(rawByUid, internal)
	if (!vals.length) return 0
	return f_clampInt(Math.min(...vals))
}

/** 二选一文案（博弈页展示） */
export const F_ROLE_ACTIVE_VARIANT_LABELS = {
	2: { A: '贝塔 = 场上平均 + 2', B: '贝塔 = 场上最大' },
	3: { A: '残差波动 = -4', B: '残差波动 = 场上最低 − 1（下限 −5）' },
	4: { A: '动量 = 场上最大 + 1（上限 5）', B: '动量 = 庄家动量 + 2（上限 5）' },
	5: { A: '市净 = +4', B: '市净 = +5' },
	6: { A: '盈利收益 = 场上平均 + 1', B: '盈利收益 = 场上平均 + 2' },
	7: { A: '非线性规模 = 0', B: '非线性规模 = 庄家相反数' },
	8: { A: '成长 = 场上平均', B: '成长 = 庄家' },
	9: { A: '规模 = −3', B: '规模 = −4' },
	10: { A: '动量 = 场上最大', B: '动量 = 场上最小' }
}

/**
 * @param {Record<string, Record<string, number>>} rawByUid 本轮各玩家原始暴露（发动前快照）
 * @param {Array<Array<Record<string, number>>>} exp player_nm × internal
 * @param {number} slotIndex
 * @param {number} rid 1..10
 * @param {string} variant 'A' | 'B'
 * @param {{ if_banker: boolean, adminUid: string }} ctx
 */
export function f_applyOneRoleActiveToSlot(rawByUid, exp, slotIndex, rid, variant, ctx) {
	const row = exp[slotIndex]
	if (!row) return
	const v = String(variant || 'A').toUpperCase() === 'B' ? 'B' : 'A'
	const adm = ctx.adminUid && String(ctx.adminUid).trim() !== '' ? String(ctx.adminUid).trim() : ''
	const bank = adm && rawByUid[adm] ? rawByUid[adm] : null

	const bankNum = (k) => (bank && Number.isFinite(Number(bank[k])) ? Number(bank[k]) : 0)

	switch (rid) {
		case 1: {
			const bsz = bankNum('size')
			row.size = bsz >= 0 ? -5 : -3
			break
		}
		case 2: {
			const avg = f_avgInt(rawByUid, 'beta')
			row.beta = v === 'A' ? f_clampInt(avg + 2) : f_maxInt(rawByUid, 'beta')
			break
		}
		case 3: {
			if (v === 'A') {
				row.residual_volatility = -4
			} else {
				const mn = f_minInt(rawByUid, 'residual_volatility')
				row.residual_volatility = f_clampInt(mn - 1)
			}
			break
		}
		case 4: {
			if (v === 'A') {
				row.momentum = f_clampInt(f_maxInt(rawByUid, 'momentum') + 1)
			} else {
				row.momentum = f_clampInt(bankNum('momentum') + 2)
			}
			break
		}
		case 5: {
			row.book_to_price = v === 'A' ? 4 : 5
			break
		}
		case 6: {
			const avg = f_avgInt(rawByUid, 'earnings_yield')
			row.earnings_yield = v === 'A' ? f_clampInt(avg + 1) : f_clampInt(avg + 2)
			break
		}
		case 7: {
			if (v === 'A') {
				row.non_linear_size = 0
			} else {
				row.non_linear_size = f_clampInt(-bankNum('non_linear_size'))
			}
			break
		}
		case 8: {
			if (v === 'A') {
				row.growth = f_avgInt(rawByUid, 'growth')
			} else {
				row.growth = f_clampInt(bankNum('growth'))
			}
			break
		}
		case 9: {
			row.size = v === 'A' ? -3 : -4
			break
		}
		case 10: {
			row.momentum = v === 'A' ? f_maxInt(rawByUid, 'momentum') : f_minInt(rawByUid, 'momentum')
			break
		}
		default:
			break
	}
}

/**
 * @param {{
 *   round: number,
 *   exp: Array<Record<string, number>>,
 *   uidBySlot: Array<string|null>,
 *   player_nm: number,
 *   if_banker: boolean,
 *   adminUid: string,
 *   roleIdByPlayerId: Record<string, number> | null,
 *   role1_10ActiveRoundByPlayerId: Record<string, number> | null,
 *   roleActiveVariantByPlayerId: Record<string, string> | null
 * }} p
 */
export function f_applyRole1To10ActivesToExposure(p) {
	const {
		round,
		exp,
		uidBySlot,
		player_nm,
		if_banker,
		adminUid,
		roleIdByPlayerId,
		role1_10ActiveRoundByPlayerId,
		roleActiveVariantByPlayerId
	} = p
	if (!roleIdByPlayerId || !role1_10ActiveRoundByPlayerId) return

	const rawByUid = {}
	for (let i = 0; i < player_nm; i++) {
		const uid = uidBySlot[i]
		if (!uid || uid === '__banker__') continue
		rawByUid[uid] = { ...exp[i] }
	}

	const ctx = { if_banker: !!if_banker, adminUid: adminUid != null ? String(adminUid).trim() : '' }
	const start = if_banker ? 1 : 0

	for (let i = start; i < player_nm; i++) {
		const uid = uidBySlot[i]
		if (!uid || uid === '__banker__') continue
		const rid = roleIdByPlayerId[uid]
		if (!Number.isFinite(rid) || rid < 1 || rid > 10) continue
		const ar = role1_10ActiveRoundByPlayerId[uid]
		if (!Number.isFinite(ar) || ar !== round) continue
		const variant =
			roleActiveVariantByPlayerId && roleActiveVariantByPlayerId[uid] != null
				? String(roleActiveVariantByPlayerId[uid])
				: 'A'
		f_applyOneRoleActiveToSlot(rawByUid, exp, i, rid, variant, ctx)
	}
}
