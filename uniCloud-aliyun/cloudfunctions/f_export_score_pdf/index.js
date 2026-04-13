'use strict'

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib')

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

function emptyPlayer(nav) {
	const p = { nav }
	for (const f of FACTORS) p[f] = 0
	return p
}

/**
 * 与前端 utils/f_factorEngine.js、Python nz_gaming_process_server.py 一致：
 * if_banker 时用 player_nm 得 banker_nav0=floor(nm/3)，庄家暴露为 0 参与净值加权。
 */
function buildChartDataFromHistory(rows, playerId, roomOpts = {}) {
	const if_banker = !!roomOpts.if_banker
	const player_nm = Math.max(1, parseInt(roomOpts.f_group_count, 10) || 20)
	const banker_nav0 = Math.floor(player_nm / 3)

	const sorted = [...(rows || [])].sort((a, b) => a.f_round_index - b.f_round_index)
	const human = emptyPlayer(1.0)
	const banker = if_banker ? emptyPlayer(banker_nav0) : null
	const df_far_return = []
	const df_all_perf = []
	const bankerNavByRound = []

	for (const raw of sorted) {
		const round = Number(raw.f_round_index)
		for (const [facKey, internal] of Object.entries(FAC_TO_INTERNAL)) {
			human[internal] = f_clampInt(raw[facKey])
		}
		const factor_return = {}
		if (if_banker && banker) {
			const navSum = (banker.nav || 0) + (human.nav || 0)
			for (const f of FACTORS) {
				const num = (human[f] || 0) * (human.nav || 0)
				const wgt = navSum === 0 ? 0 : num / navSum
				factor_return[f] = wgt * (FACTOR_UNIT_RETURNS[f] / 10)
			}
		} else {
			const navSum = human.nav || 0
			for (const f of FACTORS) {
				const num = (human[f] || 0) * (human.nav || 0)
				const wgt = navSum === 0 ? 0 : num / navSum
				factor_return[f] = wgt * (FACTOR_UNIT_RETURNS[f] / 10)
			}
		}
		const rowFar = { round }
		for (const f of FACTORS) rowFar[f] = factor_return[f]
		df_far_return.push(rowFar)
		let totalReturn = 0
		const factorReturns = {}
		for (const f of FACTORS) {
			const exposure = human[f] || 0
			const fr = exposure * factor_return[f]
			factorReturns[f] = fr
			totalReturn += fr
		}
		human.nav = human.nav * (totalReturn + 1)
		const rowPerf = {
			Player_ID: 0,
			round,
			nav: human.nav,
			total_return: totalReturn
		}
		for (const f of FACTORS) {
			rowPerf[f] = human[f] || 0
			rowPerf[`${f}_return`] = factorReturns[f]
		}
		df_all_perf.push(rowPerf)
		if (if_banker && banker) {
			bankerNavByRound.push({ round, nav: banker.nav })
		}
	}

	const byPlayer = {}
	for (const row of df_all_perf) {
		const pid = row.Player_ID
		if (!byPlayer[pid]) byPlayer[pid] = []
		byPlayer[pid].push({ round: row.round, nav: row.nav })
	}
	const nav_series = []
	if (byPlayer[0] && byPlayer[0].length) {
		nav_series.push({
			player_id: String(playerId),
			points: [...byPlayer[0]].sort((a, b) => a.round - b.round)
		})
	}
	let banker_series = null
	if (if_banker && bankerNavByRound.length) {
		const pts = [...bankerNavByRound].sort((a, b) => a.round - b.round)
		const n0 = pts[0].nav
		banker_series = pts.map((p) => ({
			round: p.round,
			nav_norm: n0 === 0 ? 1 : p.nav / n0
		}))
	}
	const rounds = {}
	for (const row of df_all_perf) {
		if (row.Player_ID !== 0) continue
		const r = row.round
		if (!rounds[r]) rounds[r] = { round: r }
		for (const f of FACTORS) rounds[r][f] = row[`${f}_return`] || 0
	}
	const attribution = [
		{
			player_id: String(playerId),
			by_round: Object.values(rounds).sort((a, b) => a.round - b.round)
		}
	]
	let factor_cumulative = []
	if (df_far_return.length) {
		const sortedFar = [...df_far_return].sort((a, b) => a.round - b.round)
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
	return { nav_series, banker_series, attribution, factor_cumulative }
}

function maskPhone(p) {
	const s = String(p || '')
	if (s.length >= 7) return s.slice(0, 3) + '****' + s.slice(-4)
	return s
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
	const f_admin_phone = event.f_admin_phone != null ? String(event.f_admin_phone).trim() : ''
	const f_room_code = event.f_room_code != null ? String(event.f_room_code).trim() : ''

	if (!/^1\d{10}$/.test(f_admin_phone)) {
		return { f_code: 400, f_message: '管理员手机号无效', f_data: null }
	}
	if (!/^\d{4}$/.test(f_room_code)) {
		return { f_code: 400, f_message: '房间号须为 4 位', f_data: null }
	}

	const db = uniCloud.database()
	const fu = db.collection('f_user_profile')
	const ur = await fu.where({ f_phone: f_admin_phone }).limit(1).get()
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
	const phones = [...new Set((mem.data || []).map((m) => m.f_player_phone).filter(Boolean))]
	if (!phones.length) {
		return { f_code: 400, f_message: '房间内暂无玩家', f_data: null }
	}

	const requireAll = !!event.f_require_all_done
	if (requireAll) {
		for (const ph of phones) {
			const cr = await db
				.collection('f_game_round')
				.where({ f_room_code, f_player_phone: ph })
				.count()
			const n = (cr && cr.total) || 0
			if (n < maxR) {
				return {
					f_code: 400,
					f_message: `尚未全部完成：${maskPhone(ph)} 仅 ${n}/${maxR} 轮`,
					f_data: null
				}
			}
		}
	}

	const pdfDoc = await PDFDocument.create()
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

	const W = 595
	const H = 842
	const margin = 42
	let page = pdfDoc.addPage([W, H])
	let cy = H - margin

	page.drawText('Factor Game — Score Report (PDF)', { x: margin, y: cy, size: 16, font, color: rgb(0.1, 0.1, 0.1) })
	cy -= 28
	page.drawText(`Room: ${f_room_code}   Rounds(config): ${maxR}`, { x: margin, y: cy, size: 11, font })
	cy -= 16
	page.drawText(`Exported: ${new Date().toISOString()}`, { x: margin, y: cy, size: 9, font, color: rgb(0.4, 0.4, 0.4) })
	cy -= 28
	page.drawText(
		'Per player: final snapshot only (last submitted round). Chart1 NAV | Chart2 Factor cum | Chart3 Attribution',
		{ x: margin, y: cy, size: 8, font, color: rgb(0.35, 0.35, 0.35) }
	)
	cy -= 22

	const chartW = W - 2 * margin
	const chartH = 118
	const gap = 14

	for (const phone of [...phones].sort()) {
		const gr = await db
			.collection('f_game_round')
			.where({ f_room_code, f_player_phone: phone })
			.get()
		const rows = (gr.data || []).sort((a, b) => a.f_round_index - b.f_round_index)
		if (!rows.length) continue

		const roundSet = [...new Set(rows.map((r) => r.f_round_index))].sort((a, b) => a - b)
		const lastRound = roundSet.length ? roundSet[roundSet.length - 1] : 0
		const label = maskPhone(phone)

		const roomChartOpts = {
			if_banker: !!room.f_banker_intervene,
			f_group_count: room.f_group_count
		}

		const cd = buildChartDataFromHistory(rows, phone, roomChartOpts)

		if (cy < margin + chartH * 3 + gap * 2 + 80) {
			page = pdfDoc.addPage([W, H])
			cy = H - margin
		}

		page.drawText(`Player ${label}  |  Final (after round ${lastRound})`, { x: margin, y: cy, size: 11, font })
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
