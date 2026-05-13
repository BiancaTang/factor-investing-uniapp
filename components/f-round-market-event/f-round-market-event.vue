<template>
	<view v-if="snapshot && snapshot.name" class="rme" :class="variant">
		<view class="rme-head">
			<text class="rme-kicker">随机事件 · 第 {{ openRound }} 轮</text>
			<text class="rme-id">{{ snapshot.cardId || '' }}</text>
			<text :class="['rme-sent', snapshot.sentiment === 'good' ? 'good' : 'bad']">
				{{ snapshot.sentimentLabel || (snapshot.sentiment === 'good' ? '利好' : '利空') }}
			</text>
		</view>
		<text class="rme-title">{{ snapshot.name }}</text>
		<!-- #ifdef H5 -->
		<view class="rme-body rme-body--scroll">
			<text class="rme-block">{{ snapshot.summary }}</text>
			<text v-if="snapshot.lore" class="rme-block dim">历史背景：{{ snapshot.lore }}</text>
			<text v-if="snapshot.resultNarrative" class="rme-block strong">市场影响：{{ snapshot.resultNarrative }}</text>
		</view>
		<!-- #endif -->
		<!-- #ifndef H5 -->
		<scroll-view scroll-y class="rme-body" :show-scrollbar="false">
			<text class="rme-block">{{ snapshot.summary }}</text>
			<text v-if="snapshot.lore" class="rme-block dim">历史背景：{{ snapshot.lore }}</text>
			<text v-if="snapshot.resultNarrative" class="rme-block strong">市场影响：{{ snapshot.resultNarrative }}</text>
		</scroll-view>
		<!-- #endif -->
		<view v-if="effectsRows.length" class="rme-fx">
			<text class="rme-fx-title">因子倾向（已作用于本轮市场因子收益率：↑×{{ upMult }} / ↓×{{ downMult }}）</text>
			<view class="rme-fx-row">
				<view v-for="(row, i) in effectsRows" :key="i" class="rme-chip" :class="row.dir">
					<text class="rme-chip-lab">{{ row.label }}</text>
					<text class="rme-chip-arr">{{ row.arrow }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'
import { F_FACTOR_DEFS } from '../../utils/f_gameFactorSpec.js'
import {
	F_RANDOM_EVENT_FACTOR_UP_MULT,
	F_RANDOM_EVENT_FACTOR_DOWN_MULT
} from '../../utils/f_roundRandomEventMultipliers.js'

const props = defineProps({
	/** 云函数写入的 f_round_random_event_snapshot */
	snapshot: { type: Object, default: null },
	/** 当前开放轮次（须为双数且与快照登记轮次一致时由父组件传入） */
	openRound: { type: Number, default: 0 },
	/** display：大屏；compact：小程序 / 观测页 */
	variant: { type: String, default: 'compact' }
})

const upMult = computed(() => F_RANDOM_EVENT_FACTOR_UP_MULT.toFixed(2))
const downMult = computed(() => F_RANDOM_EVENT_FACTOR_DOWN_MULT.toFixed(2))

const labelByInternal = computed(() =>
	Object.fromEntries(F_FACTOR_DEFS.map((d) => [d.internal, d.label]))
)

const effectsRows = computed(() => {
	const list = (props.snapshot && props.snapshot.effects) || []
	return list.map((e) => ({
		label: labelByInternal.value[e.internal] || e.internal,
		arrow: e.direction === 'up' ? '↑' : '↓',
		dir: e.direction === 'up' ? 'up' : 'down'
	}))
})
</script>

<style scoped>
.rme {
	border-radius: 16rpx;
	border: 1rpx solid #5b4a20;
	background: linear-gradient(145deg, #1a1810 0%, #12100c 100%);
	padding: 20rpx 22rpx 22rpx;
	box-sizing: border-box;
}
.rme.display {
	border-radius: 12px;
	padding: 16px 20px 20px;
	max-width: 960px;
	margin: 0 auto 16px;
}
.rme-head {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 12rpx;
}
.display .rme-head {
	gap: 10px;
	margin-bottom: 10px;
}
.rme-kicker {
	font-size: 22rpx;
	color: #a89460;
	flex: 1;
	min-width: 0;
}
.display .rme-kicker {
	font-size: 13px;
}
.rme-id {
	font-size: 20rpx;
	color: #555;
	letter-spacing: 1rpx;
}
.display .rme-id {
	font-size: 11px;
}
.rme-sent {
	font-size: 22rpx;
	font-weight: 700;
	padding: 4rpx 14rpx;
	border-radius: 999rpx;
}
.display .rme-sent {
	font-size: 12px;
	padding: 3px 12px;
	border-radius: 999px;
}
.rme-sent.good {
	background: rgba(76, 175, 80, 0.15);
	color: #81c784;
	border: 1rpx solid rgba(76, 175, 80, 0.35);
}
.rme-sent.bad {
	background: rgba(244, 67, 54, 0.12);
	color: #e57373;
	border: 1rpx solid rgba(244, 67, 54, 0.35);
}
.rme-title {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: #f5e6b3;
	line-height: 1.35;
	margin-bottom: 12rpx;
}
.display .rme-title {
	font-size: 22px;
	margin-bottom: 12px;
}
.rme-body {
	max-height: 360rpx;
	width: 100%;
	box-sizing: border-box;
}
.rme-body--scroll {
	max-height: 220px;
	overflow-x: hidden;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
}
.display .rme-body {
	max-height: 200px;
}
.display .rme-body--scroll {
	max-height: 240px;
}
.rme-block {
	display: block;
	font-size: 26rpx;
	color: #d8d0c0;
	line-height: 1.55;
	margin-bottom: 14rpx;
}
.display .rme-block {
	font-size: 14px;
	margin-bottom: 12px;
}
.rme-block.dim {
	color: #9a8a68;
	font-size: 24rpx;
}
.display .rme-block.dim {
	font-size: 13px;
}
.rme-block.strong {
	color: #e6c86a;
	font-weight: 600;
}
.rme-fx {
	margin-top: 8rpx;
	padding-top: 12rpx;
	border-top: 1rpx solid rgba(212, 175, 55, 0.2);
}
.display .rme-fx {
	margin-top: 6px;
	padding-top: 12px;
}
.rme-fx-title {
	display: block;
	font-size: 22rpx;
	color: #bfa56a;
	margin-bottom: 10rpx;
}
.display .rme-fx-title {
	font-size: 12px;
	margin-bottom: 8px;
}
.rme-fx-row {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
}
.display .rme-fx-row {
	gap: 8px;
}
.rme-chip {
	display: inline-flex;
	align-items: center;
	gap: 6rpx;
	padding: 6rpx 14rpx;
	border-radius: 8rpx;
	font-size: 22rpx;
	border: 1rpx solid rgba(255, 255, 255, 0.08);
}
.display .rme-chip {
	padding: 4px 10px;
	font-size: 12px;
	border-radius: 6px;
}
.rme-chip.up {
	background: rgba(76, 175, 80, 0.1);
	color: #a5d6a7;
}
.rme-chip.down {
	background: rgba(229, 115, 115, 0.1);
	color: #ffab91;
}
.rme-chip-lab {
	font-weight: 600;
}
.rme-chip-arr {
	font-weight: 700;
	opacity: 0.9;
}
</style>
