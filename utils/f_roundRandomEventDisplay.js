import { F_FACTOR_DEFS } from './f_gameFactorSpec.js'
import {
	F_RANDOM_EVENT_FACTOR_UP_MULT,
	F_RANDOM_EVENT_FACTOR_DOWN_MULT
} from './f_roundRandomEventMultipliers.js'

const LABEL_BY_INTERNAL = Object.fromEntries(F_FACTOR_DEFS.map((d) => [d.internal, d.label]))

export function f_eventMultiplierForDirection(direction) {
	return direction === 'up' ? F_RANDOM_EVENT_FACTOR_UP_MULT : F_RANDOM_EVENT_FACTOR_DOWN_MULT
}

export function f_formatEventMultiplier(direction) {
	const mult = f_eventMultiplierForDirection(direction)
	return `×${mult.toFixed(2)}`
}

/**
 * @param {Array<{ internal?: string, factor?: string, direction?: string, type?: string, multiplier?: number }>} effects
 */
export function f_eventEffectRowsFromEffects(effects) {
	const list = Array.isArray(effects) ? effects : []
	return list.map((e) => {
		const internal = e.internal || e.factor || ''
		const direction =
			e.direction === 'up' || e.direction === 'down'
				? e.direction
				: e.type === '↑'
					? 'up'
					: 'down'
		const mult =
			e.multiplier != null && Number.isFinite(Number(e.multiplier))
				? Number(e.multiplier)
				: f_eventMultiplierForDirection(direction)
		return {
			internal,
			label: LABEL_BY_INTERNAL[internal] || internal,
			direction,
			multiplier: mult,
			multiplierText: `×${mult.toFixed(2)}`
		}
	})
}

export function f_eventEffectRowsFromSnapshot(snapshot) {
	return f_eventEffectRowsFromEffects(snapshot && snapshot.effects)
}
