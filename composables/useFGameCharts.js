/**
 * 三张折线图：净值 / 因子累积收益 / 收益归因（与 uniapp useFactorGame 中图表部分一致）
 *
 * 注意：小程序端必须在 setup 里同步传入 getCurrentInstance()，
 * 异步回调里再 getCurrentInstance() 会为 null，导致 selector 查不到 canvas。
 */
import { ref, nextTick, onUnmounted } from 'vue'
import { buildNavOption, buildFactorCumOption, buildAttributionOption } from '../utils/f_factorChartOptions.js'
import { echarts } from '../utils/echartsRegister.js'
import { patchCanvasForEcharts } from '../utils/echartsWxCanvasPatch.js'

/**
 * @param {() => any} getChartData
 * @param {import('vue').ComponentInternalInstance | null} vueInstance setup 内同步取得的 getCurrentInstance()，勿在异步里取
 * @param {{ onlyNav?: boolean, getOnlyNav?: () => boolean, getRenderMode?: () => 'all' | 'onlyNav' | 'factorOnly' | 'attributionOnly', getStaticChart?: () => boolean, getChartLarge?: () => boolean }} options
 *        仅净值模式请传 getOnlyNav（与 props 同步）；onlyNav 为兼容旧用法
 */
export function useFGameCharts(getChartData, vueInstance = null, options = {}) {
	const getOnlyNav =
		typeof options.getOnlyNav === 'function' ? options.getOnlyNav : () => options.onlyNav === true
	const getRenderMode =
		typeof options.getRenderMode === 'function'
			? options.getRenderMode
			: () => (getOnlyNav() ? 'onlyNav' : 'all')
	const getStaticChart =
		typeof options.getStaticChart === 'function' ? options.getStaticChart : () => false
	const getChartLarge =
		typeof options.getChartLarge === 'function' ? options.getChartLarge : () => false

	function fcOption(data) {
		return buildFactorCumOption(data, { static: getStaticChart(), large: getChartLarge() })
	}

	function attOption(data) {
		return buildAttributionOption(data, { static: getStaticChart(), large: getChartLarge() })
	}
	const componentScope = vueInstance && vueInstance.proxy ? vueInstance.proxy : null
	const chartUid = Math.random().toString(36).slice(2)
	const idNav = ref(`fchart-nav-${chartUid}`)
	const idFc = ref(`fchart-fc-${chartUid}`)
	const idAtt = ref(`fchart-att-${chartUid}`)

	let chartNav = null
	let chartFc = null
	let chartAtt = null

	function getRenderFlags() {
		const mode = getRenderMode()
		if (mode === 'onlyNav') return { nav: true, fc: false, att: false }
		if (mode === 'factorOnly') return { nav: false, fc: true, att: false }
		if (mode === 'attributionOnly') return { nav: false, fc: false, att: true }
		return { nav: true, fc: true, att: true }
	}

	function disposeAllCharts() {
		;[chartNav, chartFc, chartAtt].forEach((c) => {
			try {
				if (c && !c.isDisposed()) c.dispose()
			} catch (e) {}
		})
		chartNav = chartFc = chartAtt = null
	}

	function getFallbackCanvasSize() {
		// #ifdef MP-WEIXIN
		if (typeof wx !== 'undefined' && wx.getWindowInfo) {
			const win = wx.getWindowInfo()
			const windowW = win.windowWidth || 375
			const h = typeof uni.upx2px === 'function' ? uni.upx2px(560) : (560 * windowW) / 750
			return {
				width: Math.max(windowW - 48, 200),
				height: Math.max(h, 200),
				dpr: win.pixelRatio || 2
			}
		}
		// #endif
		const sys = uni.getSystemInfoSync()
		const windowW = sys.windowWidth || 375
		const h = typeof uni.upx2px === 'function' ? uni.upx2px(560) : (560 * windowW) / 750
		return {
			width: Math.max(windowW - 48, 200),
			height: Math.max(h, 200),
			dpr: sys.pixelRatio || 2
		}
	}

	function getPageVm() {
		try {
			const pages = getCurrentPages()
			const page = pages && pages.length ? pages[pages.length - 1] : null
			if (!page) return null
			return page.$vm || page
		} catch (e) {
			return null
		}
	}

	function sleep(ms) {
		return new Promise((r) => setTimeout(r, ms))
	}

	function queryOneSel(selector, ctx) {
		return new Promise((resolve) => {
			const exec = () => {
				const base = uni.createSelectorQuery()
				const chain = ctx ? base.in(ctx) : base
				chain
					.select(selector)
					.fields({ node: true, size: true })
					.exec((res) => {
						const r0 = res && res[0]
						resolve(r0 || null)
					})
			}
			// #ifdef MP-WEIXIN
			if (typeof wx !== 'undefined' && wx.nextTick) {
				wx.nextTick(exec)
			} else {
				nextTick(exec)
			}
			// #endif
			// #ifndef MP-WEIXIN
			nextTick(exec)
			// #endif
		})
	}

	async function queryCanvasRect(domId) {
		const pageVm = getPageVm()
		const selectors = ['#' + domId, `canvas[canvas-id="${domId}"]`]
		const ctxs = []
		if (componentScope) ctxs.push(componentScope)
		if (pageVm) ctxs.push(pageVm)
		ctxs.push(null)

		for (let attempt = 0; attempt < 18; attempt++) {
			if (attempt > 0) await sleep(50 + attempt * 45)

			for (const sel of selectors) {
				for (const ctx of ctxs) {
					const r = await queryOneSel(sel, ctx)
					if (r && r.node) return r
				}
			}
		}
		console.warn('[f-game-charts] 未取到 canvas node:', domId)
		return null
	}

	function initChartsH5(d) {
		if (!d) return
		if (typeof echarts.init !== 'function') return
		disposeAllCharts()
		const flags = getRenderFlags()
		const elNav = document.getElementById(idNav.value)
		const elFc = document.getElementById(idFc.value)
		const elAtt = document.getElementById(idAtt.value)
		if (flags.nav) {
			if (!elNav) return
			chartNav = echarts.init(elNav)
			chartNav.setOption(buildNavOption(d), true)
		}
		if (flags.fc) {
			if (!elFc) return
			chartFc = echarts.init(elFc)
			chartFc.setOption(fcOption(d), true)
		}
		if (flags.att) {
			if (!elAtt) return
			chartAtt = echarts.init(elAtt)
			chartAtt.setOption(attOption(d), true)
		}
	}

	async function initChartsMpOnce(d) {
		if (!d) return
		if (typeof echarts.init !== 'function') return
		disposeAllCharts()

		const fb = getFallbackCanvasSize()

		const run = async (domId, buildOpt) => {
			const r0 = await queryCanvasRect(domId)
			if (!r0 || !r0.node) return null
			const canvas = patchCanvasForEcharts(r0.node)
			let w = Number(r0.width)
			let h = Number(r0.height)
			if (!w || w <= 0 || !h || h <= 0) {
				w = fb.width
				h = fb.height
			}
			const dpr = fb.dpr
			try {
				const chart = echarts.init(canvas, null, {
					width: w,
					height: h,
					devicePixelRatio: dpr,
					renderer: 'canvas'
				})
				chart.setOption(buildOpt(d), { notMerge: true, lazyUpdate: false })
				chart.resize({ width: w, height: h })
				return chart
			} catch (e) {
				console.error('[f-game-charts]', domId, e)
				return null
			}
		}

		const flags = getRenderFlags()
		if (flags.nav) {
			chartNav = await run(idNav.value, buildNavOption)
		}
		if (flags.fc) {
			await sleep(100)
			chartFc = await run(idFc.value, fcOption)
		}
		if (flags.att) {
			await sleep(100)
			chartAtt = await run(idAtt.value, attOption)
		}
	}

	async function initChartsMp(d) {
		await initChartsMpOnce(d)
		if (chartNav || chartFc || chartAtt) return
		await sleep(500)
		await initChartsMpOnce(d)
	}

	function renderCharts() {
		const d = typeof getChartData === 'function' ? getChartData() : null
		if (!d) return
		nextTick(() => {
			// #ifdef H5
			const delay = 120
			// #endif
			// #ifndef H5
			const delay = 900
			// #endif
			setTimeout(() => {
				try {
					// #ifdef H5
					initChartsH5(d)
					// #endif
					// #ifndef H5
					initChartsMp(d).catch((e) => console.error('[f-game-charts]', e))
					// #endif
				} catch (e) {
					console.error('[f-game-charts] renderCharts', e)
				}
			}, delay)
		})
	}

	onUnmounted(() => {
		disposeAllCharts()
	})

	return {
		idNav,
		idFc,
		idAtt,
		renderCharts,
		disposeAllCharts
	}
}
