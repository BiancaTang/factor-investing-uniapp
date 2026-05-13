'use strict'

/**
 * 随机事件库（与需求文档「第四点：随机事件」一致）。
 * 仅用于管理员开启「双数轮」时写入 f_room 快照；前端只读快照展示。
 * effects.internal 须与十因子 internal 一致（见 f_gameFactorSpec）。
 */

const EVENTS = {
	1: {
		name: '监管层「窗口指导」',
		summary: '监管机构针对近期市场炒作过热现象，对机构投资者进行口头提醒，限制频繁交易与追涨行为。',
		lore: 'A股多次出现针对「妖股」炒作、高频交易的干预，旨在抑制投机泡沫，回归价值投资。',
		resultNarrative: '上调权重：市净、盈利收益（资金被迫回归价值）；下调权重：动量、流动性（投机活跃度受打压）。',
		sentiment: 'bad',
		effects: [
			{ internal: 'book_to_price', direction: 'up', short: '相对占优' },
			{ internal: 'earnings_yield', direction: 'up', short: '相对占优' },
			{ internal: 'momentum', direction: 'down', short: '承压' },
			{ internal: 'liquidity', direction: 'down', short: '承压' }
		]
	},
	2: {
		name: '地缘冲突引发「能源危机」',
		summary: '中东或重要资源产区突发冲突，导致原油、天然气价格短期内失控飙升。',
		lore: '1973年石油危机或2022年俄乌冲突爆发初期。',
		resultNarrative: '上调权重：贝塔、流动性；下调权重：杠杆、成长。',
		sentiment: 'bad',
		effects: [
			{ internal: 'beta', direction: 'up', short: '相对占优' },
			{ internal: 'liquidity', direction: 'up', short: '相对占优' },
			{ internal: 'leverage', direction: 'down', short: '承压' },
			{ internal: 'growth', direction: 'down', short: '承压' }
		]
	},
	3: {
		name: '美联储意外「超预期加息」',
		summary: '全球流动性总闸门收紧，无风险利率飙升，导致全球资产估值逻辑重构。',
		lore: '2022年「暴力加息」周期。',
		resultNarrative: '上调权重：盈利收益、市净；下调权重：成长、杠杆、非线性规模。',
		sentiment: 'bad',
		effects: [
			{ internal: 'earnings_yield', direction: 'up', short: '相对占优' },
			{ internal: 'book_to_price', direction: 'up', short: '相对占优' },
			{ internal: 'growth', direction: 'down', short: '承压' },
			{ internal: 'leverage', direction: 'down', short: '承压' },
			{ internal: 'non_linear_size', direction: 'down', short: '承压' }
		]
	},
	4: {
		name: '行业关税壁垒突然加码',
		summary: '本国优势产业在海外遭遇高额关税限制，出口预期瞬间反转。',
		lore: '2018年开始的全球贸易争端。',
		resultNarrative: '上调权重：残差波动、市净；下调权重：动量、贝塔。',
		sentiment: 'bad',
		effects: [
			{ internal: 'residual_volatility', direction: 'up', short: '相对占优' },
			{ internal: 'book_to_price', direction: 'up', short: '相对占优' },
			{ internal: 'momentum', direction: 'down', short: '承压' },
			{ internal: 'beta', direction: 'down', short: '承压' }
		]
	},
	5: {
		name: '量化监控与交易限制',
		summary: '监管层加强对程序化交易的审查，限制高频撤单，降低量化资金活跃度。',
		lore: '2024年初对量化私募基金的合规整顿。',
		resultNarrative: '上调权重：盈利收益；下调权重：流动性、规模。',
		sentiment: 'bad',
		effects: [
			{ internal: 'earnings_yield', direction: 'up', short: '相对占优' },
			{ internal: 'liquidity', direction: 'down', short: '承压' },
			{ internal: 'size', direction: 'down', short: '承压' }
		]
	},
	6: {
		name: '上市公司「减持潮」集体爆发',
		summary: '在指数反弹高点，大量公司股东集体宣布卖出股票，抽走市场存量资金。',
		lore: '每一轮行情高点的「减持负反馈」。',
		resultNarrative: '上调权重：残差波动；下调权重：动量、流动性、贝塔。',
		sentiment: 'bad',
		effects: [
			{ internal: 'residual_volatility', direction: 'up', short: '相对占优' },
			{ internal: 'momentum', direction: 'down', short: '承压' },
			{ internal: 'liquidity', direction: 'down', short: '承压' },
			{ internal: 'beta', direction: 'down', short: '承压' }
		]
	},
	7: {
		name: '颠覆性技术突破',
		summary: '类似ChatGPT或Sora的革命性产品发布，市场对未来产业变革充满幻想。',
		lore: '2023年全球AI科技浪潮。',
		resultNarrative: '上调权重：成长、动量、规模；下调权重：市净。',
		sentiment: 'good',
		effects: [
			{ internal: 'growth', direction: 'up', short: '相对占优' },
			{ internal: 'momentum', direction: 'up', short: '相对占优' },
			{ internal: 'size', direction: 'up', short: '相对占优' },
			{ internal: 'book_to_price', direction: 'down', short: '承压' }
		]
	},
	8: {
		name: '国家队「平准基金」入场',
		summary: '市场非理性连续下跌，官方资金通过大举买入ETF或蓝筹权重股来稳定军心。',
		lore: '2015年救市行动或2024年初汇金增持。',
		resultNarrative: '上调权重：非线性规模、残差波动；下调权重：规模、动量。',
		sentiment: 'good',
		effects: [
			{ internal: 'non_linear_size', direction: 'up', short: '相对占优' },
			{ internal: 'residual_volatility', direction: 'up', short: '相对占优' },
			{ internal: 'size', direction: 'down', short: '承压' },
			{ internal: 'momentum', direction: 'down', short: '承压' }
		]
	},
	9: {
		name: '央行意外「降准降息」',
		summary: '货币政策极度宽松，市场资金泛滥，借贷成本大幅下降。',
		lore: '疫情期间或经济衰退初期的流动性释放。',
		resultNarrative: '上调权重：贝塔、杠杆、成长；下调权重：市净。',
		sentiment: 'good',
		effects: [
			{ internal: 'beta', direction: 'up', short: '相对占优' },
			{ internal: 'leverage', direction: 'up', short: '相对占优' },
			{ internal: 'growth', direction: 'up', short: '相对占优' },
			{ internal: 'book_to_price', direction: 'down', short: '承压' }
		]
	},
	10: {
		name: '美联储进入「降息周期」确认',
		summary: '随着通胀回落，美联储宣布降息，全球风险资产定价压力释放，外资回流。',
		lore: '2024年下半年全球市场的降息预期交易。',
		resultNarrative: '上调权重：贝塔、成长、流动性；下调权重：盈利收益。',
		sentiment: 'good',
		effects: [
			{ internal: 'beta', direction: 'up', short: '相对占优' },
			{ internal: 'growth', direction: 'up', short: '相对占优' },
			{ internal: 'liquidity', direction: 'up', short: '相对占优' },
			{ internal: 'earnings_yield', direction: 'down', short: '承压' }
		]
	}
}

function f_snapshotForId(id) {
	const e = EVENTS[id]
	if (!e) return null
	const sentimentLabel = e.sentiment === 'good' ? '利好' : '利空'
	return {
		id,
		cardId: `EVT-${String(id).padStart(2, '0')}`,
		name: e.name,
		sentiment: e.sentiment,
		sentimentLabel,
		summary: e.summary,
		lore: e.lore,
		resultNarrative: e.resultNarrative,
		effects: (e.effects || []).map((x) => ({
			internal: x.internal,
			direction: x.direction,
			short: x.short || ''
		}))
	}
}

/** 等概率抽取 1～10，返回完整快照（写入房间） */
function f_rollRandomEventSnapshot() {
	const id = 1 + Math.floor(Math.random() * 10)
	return f_snapshotForId(id)
}

exports.EVENTS = EVENTS
exports.f_snapshotForId = f_snapshotForId
exports.f_rollRandomEventSnapshot = f_rollRandomEventSnapshot
