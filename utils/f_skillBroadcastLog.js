/**
 * 从房间状态对象解析技能播报历史（兼容仅含 f_skill_broadcast 的旧数据）。
 * @param {object | null | undefined} data
 * @returns {Array<{ seq?: number, f_round_index?: number, lines: string[], f_at?: number }>}
 */
export function f_skillBroadcastLogFromRoomData(data) {
	if (!data || typeof data !== 'object') return []
	const raw = data.f_skill_broadcast_log
	if (Array.isArray(raw) && raw.length) {
		return raw.filter((e) => e && Array.isArray(e.lines) && e.lines.length)
	}
	const latest = data.f_skill_broadcast
	if (latest && typeof latest === 'object' && Array.isArray(latest.lines) && latest.lines.length) {
		return [latest]
	}
	return []
}

/**
 * 小程序 Toast：角色名 + 主动/被动，不附带轮次与数值说明。
 * @param {{ lines?: string[] } | null | undefined} entry
 * @returns {string}
 */
export function f_skillToastTitleFromEntry(entry) {
	const lines = entry && Array.isArray(entry.lines) ? entry.lines.filter(Boolean) : []
	if (!lines.length) return ''
	const line = String(lines[0])
	const activeM = line.match(/发动[「"]([^」"]+)[」"]主动/)
	if (activeM) return `${activeM[1]} · 主动技能`
	const passiveM = line.match(/被动[「"]([^」"]+)[」"]/)
	if (passiveM) return `${passiveM[1]} · 被动技能`
	return ''
}
