/**
 * 双数轮随机市场事件 → 各轮「市场因子收益率」乘数（作用于 f_factorEngine 中每轮全局 factor_return）。
 * 与云函数 f_control_room_round 写入的 f_round_random_event_snapshot.effects 一致。
 */
import { F_FACTOR_INTERNAL_KEYS } from './f_gameFactorSpec.js'

/** 叙事「上调 / 下调权重」对应的数值强度（可再调参） */
export const F_RANDOM_EVENT_FACTOR_UP_MULT = 1.18
export const F_RANDOM_EVENT_FACTOR_DOWN_MULT = 1 / F_RANDOM_EVENT_FACTOR_UP_MULT

/**
 * 合并 f_random_events_by_round 与旧版仅存的 f_round_random_event_snapshot（单条）为按轮快照表。
 * @param {Record<string, any>|null|undefined} roomLike 含 f_random_events_by_round 或 f_round_random_event_* 的对象
 */
export function f_normalizeRandomEventsByRound(roomLike) {
	const raw = roomLike && roomLike.f_random_events_by_round
	if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
		return { ...raw }
	}
	const rr = parseInt(roomLike && roomLike.f_round_random_event_round, 10)
	const snap = roomLike && roomLike.f_round_random_event_snapshot
	if (Number.isFinite(rr) && rr > 0 && rr % 2 === 0 && snap && typeof snap === 'object' && snap.name) {
		return { [String(rr)]: snap }
	}
	return {}
}

/**
 * @param {any} snap 单轮事件快照（含 effects: { internal, direction }[]）
 * @returns {Record<string, number>} internal -> 乘数，未列因子为 1
 */
export function f_factorsMultiplierRowFromSnapshot(snap) {
	const row = Object.fromEntries(F_FACTOR_INTERNAL_KEYS.map((f) => [f, 1]))
	if (!snap || !Array.isArray(snap.effects)) return row
	for (const e of snap.effects) {
		const int = e && e.internal
		if (!int || row[int] === undefined) continue
		row[int] = e.direction === 'up' ? F_RANDOM_EVENT_FACTOR_UP_MULT : F_RANDOM_EVENT_FACTOR_DOWN_MULT
	}
	return row
}

/**
 * @param {Record<string, any>} eventsByRound 轮次字符串 -> 快照
 * @returns {Record<number, Record<string, number>>} 轮次 -> internal -> 乘数
 */
export function f_roundEventFactorMultipliersByRoundFromRoomMap(eventsByRound) {
	const out = {}
	if (!eventsByRound || typeof eventsByRound !== 'object') return out
	for (const [rk, snap] of Object.entries(eventsByRound)) {
		const ri = parseInt(rk, 10)
		if (!Number.isFinite(ri) || ri < 1) continue
		if (snap && typeof snap === 'object' && snap.name) {
			out[ri] = f_factorsMultiplierRowFromSnapshot(snap)
		}
	}
	return out
}
