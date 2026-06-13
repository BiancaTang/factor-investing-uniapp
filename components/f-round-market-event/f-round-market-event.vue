<template>
	<view v-if="snapshot && snapshot.name" class="rme" :class="variant">
		<view class="rme-head">
			<text class="rme-kicker">第 {{ openRound }} 轮 · 随机事件</text>
			<text :class="['rme-sent', snapshot.sentiment === 'good' ? 'good' : 'bad']">
				{{ snapshot.sentimentLabel || (snapshot.sentiment === 'good' ? '利好' : '利空') }}
			</text>
		</view>
		<text class="rme-title">{{ snapshot.name }}</text>

		<view v-if="effectsRows.length" class="rme-fx">
			<text class="rme-fx-title">因子倾向</text>
			<view class="rme-fx-row">
				<view v-for="(row, i) in effectsRows" :key="i" class="rme-chip" :class="row.direction">
					<text class="rme-chip-lab">{{ row.label }}</text>
					<text class="rme-chip-val">{{ row.multiplierText }}</text>
				</view>
			</view>
		</view>

		<view v-if="snapshot.lore" class="rme-lore">
			<text class="rme-lore-label">历史背景</text>
			<text class="rme-lore-text">{{ snapshot.lore }}</text>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'
import { f_eventEffectRowsFromSnapshot } from '../../utils/f_roundRandomEventDisplay.js'

const props = defineProps({
	/** 云函数写入的 f_round_random_event_snapshot */
	snapshot: { type: Object, default: null },
	/** 当前开放轮次（须为双数且与快照登记轮次一致时由父组件传入） */
	openRound: { type: Number, default: 0 },
	/** display：大屏；displayPanel：大屏三栏内嵌；compact：小程序 / 观测页 */
	variant: { type: String, default: 'compact' }
})

const effectsRows = computed(() => f_eventEffectRowsFromSnapshot(props.snapshot))
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
	justify-content: space-between;
	gap: 12rpx;
	margin-bottom: 10rpx;
}

.display .rme-head {
	gap: 10px;
	margin-bottom: 8px;
}

.rme-kicker {
	font-size: 22rpx;
	color: #a89460;
}

.display .rme-kicker {
	font-size: 13px;
}

.rme-sent {
	font-size: 22rpx;
	font-weight: 700;
	padding: 4rpx 14rpx;
	border-radius: 999rpx;
	flex-shrink: 0;
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
	margin-bottom: 16rpx;
}

.display .rme-title {
	font-size: 22px;
	margin-bottom: 14px;
}

.rme-fx {
	margin-bottom: 14rpx;
}

.display .rme-fx {
	margin-bottom: 12px;
}

.rme-fx-title {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #e6c86a;
	margin-bottom: 12rpx;
}

.display .rme-fx-title {
	font-size: 15px;
	margin-bottom: 10px;
}

.rme-fx-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.display .rme-fx-row {
	gap: 10px;
}

.rme-chip {
	display: inline-flex;
	align-items: center;
	justify-content: space-between;
	gap: 10rpx;
	min-width: 148rpx;
	padding: 10rpx 16rpx;
	border-radius: 10rpx;
	border: 1rpx solid rgba(255, 255, 255, 0.08);
	box-sizing: border-box;
}

.display .rme-chip {
	min-width: 108px;
	padding: 8px 14px;
	border-radius: 8px;
}

.rme-chip.up {
	background: rgba(76, 175, 80, 0.14);
	border-color: rgba(129, 199, 132, 0.35);
}

.rme-chip.down {
	background: rgba(229, 115, 115, 0.12);
	border-color: rgba(255, 171, 145, 0.28);
}

.rme-chip-lab {
	font-size: 24rpx;
	font-weight: 700;
	color: #f5e6b3;
}

.display .rme-chip-lab {
	font-size: 14px;
}

.rme-chip-val {
	font-size: 26rpx;
	font-weight: 800;
	font-variant-numeric: tabular-nums;
}

.display .rme-chip-val {
	font-size: 15px;
}

.rme-chip.up .rme-chip-val {
	color: #a5d6a7;
}

.rme-chip.down .rme-chip-val {
	color: #ffab91;
}

.rme-lore {
	padding-top: 12rpx;
	border-top: 1rpx solid rgba(212, 175, 55, 0.15);
}

.display .rme-lore {
	padding-top: 10px;
}

.rme-lore-label {
	display: block;
	font-size: 20rpx;
	color: #8a7a50;
	margin-bottom: 6rpx;
	letter-spacing: 1rpx;
}

.display .rme-lore-label {
	font-size: 11px;
	margin-bottom: 4px;
}

.rme-lore-text {
	display: block;
	font-size: 22rpx;
	color: #9a8a68;
	line-height: 1.5;
}

.display .rme-lore-text {
	font-size: 13px;
	line-height: 1.55;
}

.rme.displayPanel {
	border-radius: 0;
	border: none;
	background: transparent;
	padding: 0;
	max-width: none;
	margin: 0;
	height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.displayPanel .rme-head {
	margin-bottom: 10px;
}

.displayPanel .rme-kicker {
	font-size: 13px;
}

.displayPanel .rme-sent {
	font-size: 12px;
	padding: 4px 10px;
}

.displayPanel .rme-title {
	font-size: 20px;
	margin-bottom: 12px;
	line-height: 1.35;
}

.displayPanel .rme-fx {
	margin-bottom: 12px;
	flex-shrink: 0;
}

.displayPanel .rme-fx-title {
	font-size: 14px;
	margin-bottom: 8px;
}

.displayPanel .rme-fx-row {
	gap: 8px;
}

.displayPanel .rme-chip {
	min-width: 0;
	flex: 1 1 calc(50% - 8px);
	padding: 10px 12px;
	border-radius: 6px;
}

.displayPanel .rme-chip-lab {
	font-size: 14px;
}

.displayPanel .rme-chip-val {
	font-size: 16px;
}

.displayPanel .rme-lore {
	padding-top: 10px;
	flex: 1;
	min-height: 0;
	overflow-y: auto;
}

.displayPanel .rme-lore-label {
	font-size: 12px;
}

.displayPanel .rme-lore-text {
	font-size: 13px;
	line-height: 1.55;
}
</style>
