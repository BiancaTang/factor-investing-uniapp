'use strict'

const { F_FACTOR_DEFS } = require('./f_gameFactorSpec.js')

/** 与 utils/f_rolePassives.js 一致（internal 键） */
const F_ROLE_PASSIVE_RULES = {
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

const F_ROLE_NAMES = {
	1: '萤火',
	2: '追风',
	3: '盾墙',
	4: '刀客',
	5: '掘墓人',
	6: '磐石',
	7: '夹缝',
	8: '秤砣',
	9: '刺猬',
	10: '走钢丝',
	11: '测试角色'
}

function f_roleName(rid) {
	const n = parseInt(rid, 10)
	return F_ROLE_NAMES[n] || `角色${n}`
}

function f_expInternalFromFacKeys(facByKey) {
	const o = {}
	for (const d of F_FACTOR_DEFS) {
		const v = parseInt(facByKey[d.key], 10)
		o[d.internal] = Number.isFinite(v) ? v : 0
	}
	return o
}

/** @returns {string|null} */
function f_passiveBranchLabel(expInternal, roleId) {
	const rule = F_ROLE_PASSIVE_RULES[roleId]
	if (!rule) return null
	const secVal = Number(expInternal[rule.cond]) || 0
	const ok = rule.op === 'gt' ? secVal > 0 : secVal < 0
	return ok ? '×1.5（顺风）' : '×0.9（逆风）'
}

/**
 * @param {{
 *   f_player_uid: string,
 *   f_round_index: number,
 *   memRoleId: number,
 *   facByKey: Record<string, number>,
 *   f_nick_name: string,
 *   f_apply_role11_active: boolean,
 *   f_apply_role_active: boolean,
 *   f_role_active_variant: string
 * }} ctx
 */
function f_buildSkillLinesFromSubmit(ctx) {
	const lines = []
	const uid = String(ctx.f_player_uid || '').trim()
	const nick =
		(ctx.f_nick_name && String(ctx.f_nick_name).trim()) || (uid.length >= 8 ? uid.slice(0, 8) : uid) || '玩家'
	const R = ctx.f_round_index
	const rid = parseInt(ctx.memRoleId, 10)

	if (ctx.f_apply_role11_active) {
		lines.push(`${nick} 第 ${R} 轮·发动「测试角色」主动（收益修型）`)
	}
	if (ctx.f_apply_role_active && Number.isFinite(rid) && rid >= 1 && rid <= 10) {
		const rn = f_roleName(rid)
		const vb = rid >= 2 && String(ctx.f_role_active_variant || '').toUpperCase() === 'B' ? 'B' : 'A'
		const br = rid >= 2 ? `（分支 ${vb}）` : ''
		lines.push(`${nick} 第 ${R} 轮·发动「${rn}」主动${br}`)
	}

	if (Number.isFinite(rid) && rid >= 1 && rid <= 10) {
		const expInt = f_expInternalFromFacKeys(ctx.facByKey || {})
		const pl = f_passiveBranchLabel(expInt, rid)
		if (pl) {
			lines.push(`${nick} 第 ${R} 轮·被动「${f_roleName(rid)}」：因子收益 ${pl}`)
		}
	}
	if (rid === 11 && R === 2) {
		lines.push(`${nick} 第 2 轮·被动「测试角色」：净值步长 ×2`)
	}

	return lines
}

/**
 * @param {any} roomCol uniCloud f_room collection
 * @param {string} roomDocId
 * @param {number} roundIdx
 * @param {string[]} lines
 */
const F_SKILL_LOG_MAX = 80

function f_skillLogFromRoomRow(row) {
	if (!row || typeof row !== 'object') return []
	const raw = row.f_skill_broadcast_log
	if (Array.isArray(raw) && raw.length) {
		return raw.filter((e) => e && Array.isArray(e.lines) && e.lines.length)
	}
	const latest = row.f_skill_broadcast
	if (latest && typeof latest === 'object' && Array.isArray(latest.lines) && latest.lines.length) {
		return [latest]
	}
	return []
}

async function f_publishSkillBroadcast(roomCol, roomDocId, roundIdx, lines) {
	if (!roomDocId || !lines || !lines.length) return
	const snap = await roomCol.doc(roomDocId).get()
	const cur = snap.data && snap.data[0] ? snap.data[0] : {}
	const prev = parseInt(cur.f_skill_broadcast_seq, 10)
	const next = Number.isFinite(prev) && prev >= 1 ? prev + 1 : 1
	const f_now = Date.now()
	const entry = {
		seq: next,
		f_round_index: roundIdx,
		lines: [...lines],
		f_at: f_now
	}
	const prevLog = f_skillLogFromRoomRow(cur)
	prevLog.push(entry)
	const trimmed = prevLog.length > F_SKILL_LOG_MAX ? prevLog.slice(-F_SKILL_LOG_MAX) : prevLog
	await roomCol.doc(roomDocId).update({
		f_skill_broadcast_seq: next,
		f_skill_broadcast: entry,
		f_skill_broadcast_log: trimmed,
		f_updated_at: f_now
	})
}

module.exports = {
	f_buildSkillLinesFromSubmit,
	f_publishSkillBroadcast,
	f_skillLogFromRoomRow
}
