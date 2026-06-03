/**
 * 角色 1～10 主动：按轮次在「写入槽位暴露」之后、「市场 factor_return」之前改写该玩家暴露。
 * 与角色技能手册 / f_gameRolesSpec 一致；本局每玩家主动至多发动 1 次（由 f_room_member.f_role_active_round 记录）。
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

function f_maxInt(rawByUid, internal) {
	const vals = f_valsFromRaw(rawByUid, internal)
	if (!vals.length) return 0
	return f_clampInt(Math.max(...vals))
}

/** 二选一文案（博弈页展示，角色 2～10） */
export const F_ROLE_ACTIVE_VARIANT_LABELS = {
	2: { A: '庄家贝塔>0：你的贝塔 +2', B: '庄家贝塔<0：你的贝塔 -2' },
	3: { A: '庄家残差波动<0：你的残差波动 = -4', B: '庄家残差波动>0：你的残差波动 = 1' },
	4: { A: '庄家动量>0：动量 = 场上最大 +1', B: '庄家动量≤0：保持原配置' },
	5: { A: '庄家净市率<0：你的净市率 = 0', B: '庄家净市率>0：你的净市率 = 4' },
	6: { A: '庄家盈利收益>0：你的盈利收益 = 5', B: '庄家盈利收益<0：你的盈利收益 = 0' },
	7: { A: '庄家非线性规模>0：你的 = 5', B: '庄家非线性规模<0：你的 = 1' },
	8: { A: '庄家成长>0：你的成长 = 4', B: '庄家成长<0：你的成长 = 1' },
	9: { A: '庄家规模>0：你的规模 = 3', B: '庄家规模<0：你的规模 = -3' },
	10: { A: '按庄家动量：动量 = 3 或 -3', B: '按庄家净市率：动量 = 2 或 -2' }
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
			if (bsz === 0) row.size = 0
			else if (bsz < 0) row.size = -5
			break
		}
		case 2: {
			const bb = bankNum('beta')
			if (v === 'A') {
				if (bb > 0) row.beta = f_clampInt(row.beta + 2)
			} else if (bb < 0) {
				row.beta = f_clampInt(row.beta - 2)
			}
			break
		}
		case 3: {
			const brv = bankNum('residual_volatility')
			if (v === 'A') {
				if (brv < 0) row.residual_volatility = -4
			} else if (brv > 0) {
				row.residual_volatility = 1
			}
			break
		}
		case 4: {
			if (bankNum('momentum') > 0) {
				row.momentum = f_clampInt(f_maxInt(rawByUid, 'momentum') + 1)
			}
			break
		}
		case 5: {
			const bbp = bankNum('book_to_price')
			if (v === 'A') {
				if (bbp < 0) row.book_to_price = 0
			} else if (bbp > 0) {
				row.book_to_price = 4
			}
			break
		}
		case 6: {
			const bey = bankNum('earnings_yield')
			if (v === 'A') {
				if (bey > 0) row.earnings_yield = 5
			} else if (bey < 0) {
				row.earnings_yield = 0
			}
			break
		}
		case 7: {
			const bnls = bankNum('non_linear_size')
			if (v === 'A') {
				if (bnls > 0) row.non_linear_size = 5
			} else if (bnls < 0) {
				row.non_linear_size = 1
			}
			break
		}
		case 8: {
			const bg = bankNum('growth')
			if (v === 'A') {
				if (bg > 0) row.growth = 4
			} else if (bg < 0) {
				row.growth = 1
			}
			break
		}
		case 9: {
			const bs = bankNum('size')
			if (v === 'A') {
				if (bs > 0) row.size = 3
			} else if (bs < 0) {
				row.size = -3
			}
			break
		}
		case 10: {
			if (v === 'A') {
				const bm = bankNum('momentum')
				if (bm > 0) row.momentum = 3
				else if (bm < 0) row.momentum = -3
			} else {
				const bbp = bankNum('book_to_price')
				if (bbp > 0) row.momentum = 2
				else if (bbp < 0) row.momentum = -2
			}
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
