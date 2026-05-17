<template>
	<view v-if="flatLines.length" class="fsb" :class="variant">
		<view class="fsb-head" @click="toggleExpand">
			<text class="fsb-kicker">技能播报</text>
			<text class="fsb-meta">{{ headMeta }}</text>
			<text class="fsb-toggle">{{ expanded ? '收起' : '展开全部' }}</text>
		</view>
		<view v-if="!expanded" class="fsb-body">
			<text v-for="(ln, i) in previewLines" :key="'p-' + i" class="fsb-line">{{ ln }}</text>
			<text v-if="hiddenCount > 0" class="fsb-more">还有 {{ hiddenCount }} 条…</text>
		</view>
		<scroll-view v-else scroll-y class="fsb-scroll" :show-scrollbar="false">
			<view v-for="(block, bi) in displayBlocks" :key="'b-' + bi" class="fsb-block">
				<text v-if="block.roundLabel" class="fsb-block-round">{{ block.roundLabel }}</text>
				<text v-for="(ln, li) in block.lines" :key="'b-' + bi + '-' + li" class="fsb-line">{{ ln }}</text>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
	/** 房间技能播报历史 [{ seq, f_round_index, lines, f_at }, ...] */
	log: {
		type: Array,
		default: () => []
	},
	variant: {
		type: String,
		default: 'compact'
	},
	/** 折叠时预览条数 */
	previewCount: {
		type: Number,
		default: 2
	}
})

const expanded = ref(false)

function toggleExpand() {
	expanded.value = !expanded.value
}

const normalizedLog = computed(() => {
	const raw = props.log || []
	return raw
		.map((e) => {
			const lines = Array.isArray(e.lines) ? e.lines.filter(Boolean) : []
			if (!lines.length) return null
			const ri = parseInt(e.f_round_index, 10)
			return {
				seq: parseInt(e.seq, 10) || 0,
				f_round_index: Number.isFinite(ri) ? ri : 0,
				lines,
				f_at: e.f_at || 0
			}
		})
		.filter(Boolean)
		.sort((a, b) => a.seq - b.seq)
})

const flatLines = computed(() => {
	const out = []
	for (const e of normalizedLog.value) {
		for (const ln of e.lines) out.push(ln)
	}
	return out
})

const displayBlocks = computed(() =>
	normalizedLog.value.map((e) => ({
		roundLabel: e.f_round_index >= 1 ? `第 ${e.f_round_index} 轮` : '',
		lines: e.lines
	}))
)

const previewLines = computed(() => flatLines.value.slice(-Math.max(1, props.previewCount)))

const hiddenCount = computed(() => Math.max(0, flatLines.value.length - previewLines.value.length))

const headMeta = computed(() => {
	const n = flatLines.value.length
	if (!n) return ''
	return `${n} 条`
})
</script>

<style scoped>
.fsb {
	border-radius: 16rpx;
	border: 1rpx solid #6b5a28;
	background: linear-gradient(155deg, #221c12 0%, #14110c 100%);
	padding: 18rpx 20rpx 20rpx;
	box-sizing: border-box;
	margin-bottom: 16rpx;
}
.fsb.display {
	border-radius: 12px;
	padding: 14px 18px 16px;
	margin-bottom: 12px;
}
.fsb-head {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 10rpx;
}
.fsb.display .fsb-head {
	margin-bottom: 8px;
}
.fsb-kicker {
	font-size: 24rpx;
	font-weight: 700;
	color: #e8c76b;
	letter-spacing: 0.06em;
	flex-shrink: 0;
}
.fsb.display .fsb-kicker {
	font-size: 15px;
}
.fsb-meta {
	font-size: 22rpx;
	color: #b89a5a;
	flex: 1;
}
.fsb.display .fsb-meta {
	font-size: 13px;
}
.fsb-toggle {
	font-size: 22rpx;
	color: #7ec99a;
	flex-shrink: 0;
}
.fsb.display .fsb-toggle {
	font-size: 13px;
}
.fsb-body {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}
.fsb-scroll {
	max-height: 360rpx;
}
.fsb.display .fsb-scroll {
	max-height: 220px;
}
.fsb-block {
	margin-bottom: 14rpx;
	padding-bottom: 10rpx;
	border-bottom: 1rpx solid rgba(107, 90, 40, 0.35);
}
.fsb-block:last-child {
	border-bottom: none;
	margin-bottom: 0;
}
.fsb-block-round {
	display: block;
	font-size: 22rpx;
	color: #c9a84a;
	margin-bottom: 6rpx;
}
.fsb.display .fsb-block-round {
	font-size: 12px;
}
.fsb-line {
	font-size: 24rpx;
	line-height: 1.45;
	color: #f0e4c8;
}
.fsb.display .fsb-line {
	font-size: 15px;
	line-height: 1.5;
}
.fsb-more {
	font-size: 22rpx;
	color: #9a8a60;
	margin-top: 4rpx;
}
</style>
