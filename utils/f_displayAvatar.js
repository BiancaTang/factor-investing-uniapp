/**
 * 大屏 H5：将 cloud:// fileID 转为可加载的 HTTPS 临时链接。
 * @param {Array<{ uid?: string, avatar?: string, [k: string]: any }>} players
 * @returns {Promise<Array>}
 */
export async function f_resolveDisplayPlayerAvatars(players) {
	if (!Array.isArray(players) || !players.length) return players
	if (typeof uniCloud === 'undefined' || typeof uniCloud.getTempFileURL !== 'function') {
		return players
	}

	const cloudIds = []
	const playerIndexes = []
	players.forEach((p, i) => {
		const av = String((p && p.avatar) || '').trim()
		if (!av) return
		if (av.startsWith('cloud://') || f_needsTempResolveFileId(av)) {
			cloudIds.push(av)
			playerIndexes.push(i)
		}
	})

	if (!cloudIds.length) return players

	try {
		const res = await uniCloud.getTempFileURL({ fileList: cloudIds })
		const byId = {}
		for (const item of res.fileList || []) {
			if (item && item.fileID && item.tempFileURL) {
				byId[item.fileID] = item.tempFileURL
			}
		}
		return players.map((p, i) => {
			const idx = playerIndexes.indexOf(i)
			if (idx < 0) return p
			const fid = cloudIds[idx]
			const url = byId[fid]
			return url ? { ...p, avatar: url } : p
		})
	} catch (err) {
		console.warn('[f_resolveDisplayPlayerAvatars]', err)
		return players
	}
}

function f_needsTempResolveFileId(s) {
	return /^https?:\/\//i.test(s) === false && s.length > 8 && !s.startsWith('wxfile://')
}
