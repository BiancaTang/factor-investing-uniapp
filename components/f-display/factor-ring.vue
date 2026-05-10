<template>
	<view class="factor-ring">
		<view class="ring-container" :style="containerStyle">
			<!-- 中心标签 -->
			<view class="ring-center">
				<text class="center-label">因子市场</text>
				<text class="center-round">R{{ currentRound }}</text>
			</view>

			<!-- 10因子扇区 -->
			<view
				v-for="(item, index) in layout"
				:key="item.key"
				class="sector"
				:style="getSectorStyle(item, index)"
			>
				<view class="sector-content">
					<text class="sector-label">{{ item.label }}</text>
					<text class="sector-value" :style="{ color: colors[item.internal] }">
						{{ formatExposure(item.key) }}
					</text>
				</view>
			</view>

			<!-- 连接线（从中心到每个因子） -->
			<view
				v-for="item in layout"
				:key="'line-'+item.key"
				class="connector"
				:style="getConnectorStyle(item)"
			/>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue'
import { F_FACTOR_COLORS } from '@/utils/f_factorPalette.js'
import { computeFactorRingLayout } from '@/utils/f_displayEngine.js'

const props = defineProps({
	exposure: { type: Object, default: () => ({}) },
	currentRound: { type: Number, default: 0 },
	size: { type: Number, default: 400 }
})

const colors = F_FACTOR_COLORS

const containerStyle = computed(() => ({
	width: props.size + 'px',
	height: props.size + 'px'
}))

const layout = computed(() =>
	computeFactorRingLayout(props.size * 0.35, props.size / 2, props.size / 2)
)

function formatExposure(key) {
	const val = props.exposure[key]
	if (val == null) return '0'
	const n = Number(val)
	return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

function getSectorStyle(item, index) {
	const val = Number(props.exposure[item.key] || 0)
	const intensity = Math.min(Math.abs(val) / 5, 1) // 0~1
	const baseColor = colors[item.internal] || '#888'

	// 计算位置：从中心向外偏移
	const offset = 25 + intensity * 30 // 25~55px 偏移
	const rad = item.angle
	const x = Math.cos(rad) * offset
	const y = Math.sin(rad) * offset

	return {
		transform: `translate(${x}px, ${y}px)`,
		borderColor: baseColor,
		backgroundColor: `${baseColor}${Math.round(intensity * 40).toString(16).padStart(2, '0')}`,
		boxShadow: intensity > 0.3 ? `0 0 ${intensity * 20}px ${baseColor}40` : 'none'
	}
}

function getConnectorStyle(item) {
	const length = 50
	const rad = item.angle
	return {
		width: length + 'px',
		left: (props.size / 2) + 'px',
		top: (props.size / 2) + 'px',
		transform: `rotate(${(rad * 180 / Math.PI)}deg)`,
		transformOrigin: 'left center',
		backgroundColor: colors[item.internal] || '#444'
	}
}
</script>

<style scoped>
.factor-ring {
	display: flex;
	justify-content: center;
	align-items: center;
}

.ring-container {
	position: relative;
	border-radius: 50%;
	border: 2px solid #333;
	background: radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 70%);
}

.ring-center {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	text-align: center;
	z-index: 10;
}

.center-label {
	font-size: 14px;
	color: #888;
	display: block;
}

.center-round {
	font-size: 24px;
	font-weight: bold;
	color: #d4af37;
	display: block;
	margin-top: 4px;
}

.sector {
	position: absolute;
	left: 50%;
	top: 50%;
	width: 72px;
	height: 72px;
	margin-left: -36px;
	margin-top: -36px;
	border-radius: 12px;
	border: 2px solid;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.6s ease;
	z-index: 5;
}

.sector-content {
	text-align: center;
}

.sector-label {
	font-size: 11px;
	color: #aaa;
	display: block;
}

.sector-value {
	font-size: 14px;
	font-weight: bold;
	display: block;
	margin-top: 2px;
}

.connector {
	position: absolute;
	height: 1px;
	opacity: 0.3;
	z-index: 1;
}
</style>
