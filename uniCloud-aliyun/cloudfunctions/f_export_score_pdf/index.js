'use strict'

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib')
const fs = require('fs')
const path = require('path')

function f_safeWinAnsiText(s) {
	const str = String(s == null ? '' : s)
	// Helvetica(StandardFonts) 仅 WinAnsi；为避免云函数直接抛异常，降级为可编码字符
	return str.replace(/[^\x20-\x7E]/g, '?')
}

async function f_loadPdfFont(pdfDoc) {
	// 优先使用云函数目录内的中文字体文件（你需要自行放入）
	// 推荐：uniCloud-aliyun/cloudfunctions/f_export_score_pdf/fonts/NotoSansSC-Regular.otf（或 .ttf）
	const candidates = [
		path.join(__dirname, 'fonts', 'NotoSansSC-Regular.otf'),
		path.join(__dirname, 'fonts', 'NotoSansSC-Regular.ttf'),
		path.join(__dirname, 'fonts', 'SourceHanSansCN-Regular.otf'),
		path.join(__dirname, 'fonts', 'SourceHanSansCN-Regular.ttf')
	]
	for (const p of candidates) {
		try {
			if (!fs.existsSync(p)) continue
			const fontkit = require('fontkit')
			pdfDoc.registerFontkit(fontkit)
			const bytes = fs.readFileSync(p)
			const f = await pdfDoc.embedFont(bytes, { subset: true })
			console.log('[f_export_score_pdf] using CJK font:', p)
			return { font: f, safeText: (x) => String(x == null ? '' : x) }
		} catch (e) {
			console.error('[f_export_score_pdf] load font failed:', p, e && e.message ? e.message : e)
		}
	}
	// 无字体文件时回退到 Helvetica，并对文本做 WinAnsi 安全处理
	const f = await pdfDoc.embedFont(StandardFonts.Helvetica)
	console.log('[f_export_score_pdf] using StandardFonts.Helvetica (WinAnsi fallback)')
	return { font: f, safeText: f_safeWinAnsiText }
}

const FACTORS = ['size', 'momentum', 'book_to_price', 'growth', 'residual_volatility']
const FAC_TO_INTERNAL = {
	fac_size: 'size',
	fac_momentum: 'momentum',
	fac_book_to_price: 'book_to_price',
	fac_growth: 'growth',
	fac_residual_volatility: 'residual_volatility'
}
const FACTOR_UNIT_RETURNS = {
	size: 0.05,
	momentum: 0.02,
	book_to_price: 0.01,
	growth: 0.03,
	residual_volatility: 0.01
}

const LINE_COLORS = [
	rgb(0.33, 0.44, 0.78),
	rgb(0.57, 0.8, 0.45),
	rgb(0.99, 0.76, 0.35),
	rgb(0.93, 0.4, 0.4),
	rgb(0.45, 0.75, 0.87)
]

function f_clampInt(v) {
	const n = Math.round(Number(v))
	if (!Number.isFinite(n)) return 0
	return Math.max(-5, Math.min(5, n))
}

function f_emptyExposureRow() {
	const o = {}
	for (const f of FACTORS) o[f] = 0
	return o
}

/**
 * 与 utils/f_factorEngine.js、FastAPI FactorTradingGameAPI 一致：player_nm 槽位 + NAV 加权因子收益。
 */
function simulatePythonFactorGame(allPlayerHistories, roomOpts) {
	const if_banker = !!roomOpts.if_banker
	const player_nm = Math.max(1, parseInt(roomOpts.f_group_count, 10) || 20)
	const banker_nav0 = Math.floor(player_nm / 3)
	const adminUid =
		if_banker && roomOpts.f_admin_uid != null && String(roomOpts.f_admin_uid).trim() !== ''
			? String(roomOpts.f_admin_uid).trim()
			: ''

	const roundSet = new Set()
	for (const p of allPlayerHistories || []) {
		for (const r of p.history || []) {
			const ri = parseInt(r.f_round_index, 10)
			if (Number.isFinite(ri)) roundSet.add(ri)
		}
	}
	const rounds = [...roundSet].sort((a, b) => a - b)

	const nav = new Array(player_nm).fill(1)
	if (if_banker) nav[0] = banker_nav0

	const uidBySlot = new Array(player_nm).fill(null)
	const slotByUid = new Map()
	const startSlot = if_banker ? 1 : 0

	if (if_banker) {
		if (adminUid) {
			uidBySlot[0] = adminUid
			slotByUid.set(adminUid, 0)
		} else {
			uidBySlot[0] = '__banker__'
		}
	}

	function assignSlot(uid) {
		if (slotByUid.has(uid)) return slotByUid.get(uid)
		for (let s = startSlot; s < player_nm; s++) {
			if (uidBySlot[s] == null) {
				uidBySlot[s] = uid
				slotByUid.set(uid, s)
				return s
			}
		}
		return -1
	}

	const df_far_return = []
	const navByPlayerId = new Map()
	const bankerNavByRound = if_banker ? [] : null
	const attributionRowsByPlayerId = new Map()

	const playersOrdered = [...(allPlayerHistories || [])]

	for (const round of rounds) {
		const exp = Array.from({ length: player_nm }, () => f_emptyExposureRow())

		for (const p of playersOrdered) {
			const row = (p.history || []).find((h) => parseInt(h.f_round_index, 10) === round)
			if (!row) continue
			const uid = String(p.player_id)
			const s = assignSlot(uid)
			if (s < 0) continue
			for (const [facKey, internal] of Object.entries(FAC_TO_INTERNAL)) {
				exp[s][internal] = f_clampInt(row[facKey])
			}
		}

		let sumNav = 0
		for (let i = 0; i < player_nm; i++) sumNav += nav[i]
		const factor_return = {}
		for (const f of FACTORS) {
			let num = 0
			for (let i = 0; i < player_nm; i++) num += exp[i][f] * nav[i]
			const wgt = sumNav === 0 ? 0 : num / sumNav
			factor_return[f] = wgt * (FACTOR_UNIT_RETURNS[f] / 10)
		}

		const rowFar = { round }
		for (const f of FACTORS) rowFar[f] = factor_return[f]
		df_far_return.push(rowFar)

		const nextNav = new Array(player_nm)
		const slotTotalReturn = new Array(player_nm)
		const slotFactorRet = Array.from({ length: player_nm }, () => ({}))

		for (let i = 0; i < player_nm; i++) {
			let totalReturn = 0
			const factorReturns = {}
			for (const f of FACTORS) {
				const exposure = exp[i][f] || 0
				const fr = exposure * factor_return[f]
				factorReturns[f] = fr
				totalReturn += fr
			}
			slotTotalReturn[i] = totalReturn
			for (const f of FACTORS) slotFactorRet[i][f] = factorReturns[f]
			nextNav[i] = nav[i] * (totalReturn + 1)
		}

		// 对齐 gaming_process.py：Banker 的 nav 不做“首轮后重置为 1”，仅在展示时可归一化

		for (let i = 0; i < player_nm; i++) {
			nav[i] = nextNav[i]
			const uid = uidBySlot[i]
			if (!uid || uid === '__banker__') continue

			if (!navByPlayerId.has(uid)) navByPlayerId.set(uid, [])
			navByPlayerId.get(uid).push({ round, nav: nav[i] })

			const tr = slotTotalReturn[i]
			const attRow = { round, nav: nav[i], total_return: tr }
			for (const f of FACTORS) {
				attRow[f] = exp[i][f] || 0
				attRow[`${f}_return`] = slotFactorRet[i][f]
			}
			if (!attributionRowsByPlayerId.has(uid)) attributionRowsByPlayerId.set(uid, [])
			attributionRowsByPlayerId.get(uid).push(attRow)
		}

		if (if_banker && bankerNavByRound) {
			bankerNavByRound.push({ round, nav: nav[0] })
		}
	}

	return { df_far_return, navByPlayerId, bankerNavByRound, attributionRowsByPlayerId }
}

function buildChartDataForTarget(allPlayerHistories, targetUid, displayLabel, roomOpts) {
	const sim = simulatePythonFactorGame(allPlayerHistories, roomOpts)
	const uid = String(targetUid)
	const adm = roomOpts.f_admin_uid != null ? String(roomOpts.f_admin_uid).trim() : ''
	const strId =
		!!roomOpts.if_banker && adm && uid === adm ? '庄家' : String(displayLabel || uid)
	const pts = sim.navByPlayerId.get(uid)
	const nav_series = []
	if (pts && pts.length) {
		nav_series.push({
			player_id: strId,
			points: [...pts].sort((a, b) => a.round - b.round)
		})
	}
	let banker_series = null
	if (sim.bankerNavByRound && sim.bankerNavByRound.length) {
		const ptsb = [...sim.bankerNavByRound].sort((a, b) => a.round - b.round)
		const n0 = ptsb[0].nav
		banker_series = ptsb.map((p) => ({
			round: p.round,
			nav_norm: n0 === 0 ? 1 : p.nav / n0
		}))
	}
	const attRows = sim.attributionRowsByPlayerId.get(uid) || []
	const rounds = {}
	for (const row of attRows) {
		const r = row.round
		if (!rounds[r]) rounds[r] = { round: r }
		for (const f of FACTORS) {
			rounds[r][f] = row[`${f}_return`] || 0
		}
	}
	const attribution = [
		{
			player_id: strId,
			by_round: Object.values(rounds).sort((a, b) => a.round - b.round)
		}
	]
	let factor_cumulative = []
	if (sim.df_far_return.length) {
		const sortedFar = [...sim.df_far_return].sort((a, b) => a.round - b.round)
		const cum = {}
		for (const f of FACTORS) cum[f] = 0
		factor_cumulative = sortedFar.map((row) => {
			const out = { round: row.round }
			for (const f of FACTORS) {
				cum[f] += row[f] || 0
				out[f] = cum[f]
			}
			return out
		})
	}
	if (!!roomOpts.if_banker && adm && uid === adm) {
		banker_series = null
	}
	return { nav_series, banker_series, attribution, factor_cumulative }
}

function f_isPlayerUid(s) {
	return /^u[a-f0-9]{16}$/.test(String(s || '').trim())
}

function boundsFromSeries(seriesList) {
	if (!seriesList || !seriesList.length) {
		return { minX: 0, maxX: 1, minY: 0, maxY: 1 }
	}
	let minX = Infinity
	let maxX = -Infinity
	let minY = Infinity
	let maxY = -Infinity
	for (const s of seriesList) {
		for (const p of s.points) {
			if (p.x < minX) minX = p.x
			if (p.x > maxX) maxX = p.x
			if (p.y < minY) minY = p.y
			if (p.y > maxY) maxY = p.y
		}
	}
	if (!Number.isFinite(minX)) minX = 0
	if (!Number.isFinite(maxX)) maxX = 1
	if (!Number.isFinite(minY)) minY = 0
	if (!Number.isFinite(maxY)) maxY = 1
	if (minX === maxX) {
		minX -= 0.5
		maxX += 0.5
	}
	if (minY === maxY) {
		minY -= 0.0001
		maxY += 0.0001
	}
	return { minX, maxX, minY, maxY }
}

function drawLineSeries(page, font, seriesList, x0, y0, w, h) {
	const b = boundsFromSeries(seriesList)
	let idx = 0
	for (const s of seriesList) {
		let pts = s.points || []
		if (pts.length === 1) {
			pts = [pts[0], { x: pts[0].x + 0.01, y: pts[0].y }]
		}
		if (pts.length < 2) continue
		const color = LINE_COLORS[idx % LINE_COLORS.length]
		idx++
		for (let i = 0; i < pts.length - 1; i++) {
			const sx = (pts[i].x - b.minX) / (b.maxX - b.minX)
			const sy = (pts[i].y - b.minY) / (b.maxY - b.minY)
			const ex = (pts[i + 1].x - b.minX) / (b.maxX - b.minX)
			const ey = (pts[i + 1].y - b.minY) / (b.maxY - b.minY)
			page.drawLine({
				start: { x: x0 + sx * w, y: y0 + h - sy * h },
				end: { x: x0 + ex * w, y: y0 + h - ey * h },
				thickness: 0.6,
				color
			})
		}
	}
	page.drawRectangle({ x: x0, y: y0, width: w, height: h, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5 })
	const fs = 7
	page.drawText(String(b.minX.toFixed(0)), { x: x0, y: y0 - 10, size: fs, font, color: rgb(0.3, 0.3, 0.3) })
	page.drawText(String(b.maxX.toFixed(0)), { x: Math.min(x0 + w - 24, x0 + w), y: y0 - 10, size: fs, font, color: rgb(0.3, 0.3, 0.3) })
	page.drawText(String(b.minY.toFixed(4)), { x: x0 + 2, y: y0 + 2, size: fs, font, color: rgb(0.45, 0.45, 0.45) })
	page.drawText(String(b.maxY.toFixed(4)), { x: x0 + 2, y: y0 + h - 10, size: fs, font, color: rgb(0.45, 0.45, 0.45) })
}

exports.main = async (event, context) => {
	const f_admin_uid = event.f_admin_uid != null ? String(event.f_admin_uid).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''

	if (!f_isPlayerUid(f_admin_uid)) {
		return { f_code: 400, f_message: '管理员标识无效', f_data: null }
	}
	if (!/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '房间号须为 4 位', f_data: null }
	}

	const db = uniCloud.database()
	const fu = db.collection('f_user_profile')
	const ur = await fu.where({ f_uid: f_admin_uid }).limit(1).get()
	const urow = ur.data && ur.data[0]
	if (!urow || urow.f_role !== 'admin') {
		return { f_code: 403, f_message: '仅管理员可导出', f_data: null }
	}

	const fr = await db.collection('f_room').where({ f_room_code }).limit(1).get()
	if (!fr.data || !fr.data.length) {
		return { f_code: 404, f_message: '房间不存在', f_data: null }
	}
	const room = fr.data[0]
	const maxR = Math.max(1, parseInt(room.f_round_count, 10) || 1)

	const mem = await db.collection('f_room_member').where({ f_room_code }).get()
	const memRows = [...(mem.data || [])].sort((a, b) => {
		const ta = typeof a.f_joined_at === 'number' ? a.f_joined_at : new Date(a.f_joined_at || 0).getTime()
		const tb = typeof b.f_joined_at === 'number' ? b.f_joined_at : new Date(b.f_joined_at || 0).getTime()
		return ta - tb
	})
	const uids = []
	const uidSeen = new Set()
	for (const m of memRows) {
		const id = m.f_player_uid
		if (id && !uidSeen.has(id)) {
			uidSeen.add(id)
			uids.push(id)
		}
	}
	const labelByUid = {}
	for (const m of memRows) {
		if (m.f_player_uid) {
			const nick = (m.f_nick_name && String(m.f_nick_name).trim()) || ''
			labelByUid[m.f_player_uid] = nick || String(m.f_player_uid).slice(0, 10)
		}
	}
	if (!uids.length) {
		return { f_code: 400, f_message: '房间内暂无玩家', f_data: null }
	}

	const requireAll = !!event.f_require_all_done
	if (requireAll) {
		for (const uid of uids) {
			const cr = await db
				.collection('f_game_round')
				.where({ f_room_code, f_player_uid: uid })
				.count()
			const n = (cr && cr.total) || 0
			if (n < maxR) {
				return {
					f_code: 400,
					// 这里也可能含中文昵称；避免前端展示/日志编码问题
					f_message: `尚未全部完成：${String(labelByUid[uid] || uid)} 仅 ${n}/${maxR} 轮`,
					f_data: null
				}
			}
		}
	}

	const pdfDoc = await PDFDocument.create()
	const { font, safeText } = await f_loadPdfFont(pdfDoc)

	const W = 595
	const H = 842
	const margin = 42
	let page = pdfDoc.addPage([W, H])
	let cy = H - margin

	page.drawText(safeText('Factor Game — Score Report (PDF)'), {
		x: margin,
		y: cy,
		size: 16,
		font,
		color: rgb(0.1, 0.1, 0.1)
	})
	cy -= 28
	page.drawText(safeText(`Room: ${f_room_code}   Rounds(config): ${maxR}`), {
		x: margin,
		y: cy,
		size: 11,
		font
	})
	cy -= 16
	page.drawText(safeText(`Exported: ${new Date().toISOString()}`), {
		x: margin,
		y: cy,
		size: 9,
		font,
		color: rgb(0.4, 0.4, 0.4)
	})
	cy -= 28
	page.drawText(
		safeText(
			'Per player: final snapshot only (last submitted round). Chart1 NAV | Chart2 Factor cum | Chart3 Attribution'
		),
		{ x: margin, y: cy, size: 8, font, color: rgb(0.35, 0.35, 0.35) }
	)
	cy -= 22

	const chartW = W - 2 * margin
	const chartH = 118
	const gap = 14

	const allPlayerHistories = []
	for (const uid of uids) {
		const gr = await db.collection('f_game_round').where({ f_room_code, f_player_uid: uid }).get()
		const rows = (gr.data || []).sort((a, b) => a.f_round_index - b.f_round_index)
		if (rows.length) {
			allPlayerHistories.push({ player_id: uid, history: rows })
		}
	}

	const roomChartOpts = {
		if_banker: !!room.f_banker_intervene,
		f_group_count: room.f_group_count,
		f_admin_uid: room.f_admin_uid != null ? String(room.f_admin_uid).trim() : ''
	}

	for (const uid of [...uids].sort()) {
		const rows = (allPlayerHistories.find((p) => p.player_id === uid) || {}).history || []
		if (!rows.length) continue

		const roundSet = [...new Set(rows.map((r) => r.f_round_index))].sort((a, b) => a - b)
		const lastRound = roundSet.length ? roundSet[roundSet.length - 1] : 0
		const label = labelByUid[uid] || String(uid).slice(0, 10)

		const cd = buildChartDataForTarget(allPlayerHistories, uid, label, roomChartOpts)

		if (cy < margin + chartH * 3 + gap * 2 + 80) {
			page = pdfDoc.addPage([W, H])
			cy = H - margin
		}

		page.drawText(safeText(`Player ${label}  |  Final (after round ${lastRound})`), {
			x: margin,
			y: cy,
			size: 11,
			font
		})
		cy -= 18

		const navPts = (cd.nav_series[0] && cd.nav_series[0].points) || []
		const sNav = [{ name: 'nav', points: navPts.map((p) => ({ x: p.round, y: p.nav })) }]
		if (cd.banker_series && cd.banker_series.length) {
			sNav.push({
				name: 'banker_norm',
				points: cd.banker_series.map((b) => ({ x: b.round, y: b.nav_norm }))
			})
		}
		page.drawText('1) NAV' + (cd.banker_series && cd.banker_series.length ? ' (+ banker norm)' : ''), {
			x: margin,
			y: cy,
			size: 9,
			font
		})
		cy -= 12
		drawLineSeries(page, font, sNav, margin, cy - chartH, chartW, chartH)
		cy -= chartH + gap

		const fc = cd.factor_cumulative || []
		const sFc = FACTORS.map((f) => ({
			name: f,
			points: fc.map((row) => ({ x: row.round, y: row[f] != null ? row[f] : 0 }))
		}))
		page.drawText('2) Factor cumulative return', { x: margin, y: cy, size: 9, font })
		cy -= 12
		drawLineSeries(page, font, sFc, margin, cy - chartH, chartW, chartH)
		cy -= chartH + gap

		const br = (cd.attribution[0] && cd.attribution[0].by_round) || []
		const sAtt = FACTORS.map((f) => ({
			name: f,
			points: br.map((row) => ({ x: row.round, y: row[f] != null ? row[f] : 0 }))
		}))
		page.drawText('3) Return attribution (per-factor)', { x: margin, y: cy, size: 9, font })
		cy -= 12
		drawLineSeries(page, font, sAtt, margin, cy - chartH, chartW, chartH)
		cy -= chartH + gap + 18
	}

	const pdfBytes = await pdfDoc.save()
	const buf = Buffer.from(pdfBytes)
	const cloudPath = `f_score_pdf/${f_room_code}_${Date.now()}.pdf`

	let upload
	try {
		upload = await uniCloud.uploadFile({
			cloudPath,
			fileContent: buf
		})
	} catch (e) {
		console.error(e)
		return { f_code: 500, f_message: '上传 PDF 失败: ' + (e.message || ''), f_data: null }
	}

	let tempUrl = ''
	try {
		const tu = await uniCloud.getTempFileURL({ fileList: [upload.fileID] })
		if (tu.fileList && tu.fileList[0]) tempUrl = tu.fileList[0].tempFileURL || ''
	} catch (e) {}

	const out = {
		f_file_id: upload.fileID,
		f_temp_url: tempUrl,
		f_cloud_path: cloudPath
	}
	console.log('[f_export_score_pdf] f_temp_url:', tempUrl, 'f_file_id:', upload.fileID)

	return {
		f_code: 0,
		f_message: 'ok',
		f_data: out
	}
}
