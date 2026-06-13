<template>
	<view class="factor-ring">
		<view class="ring-container" :style="containerStyle">
			<!-- 中心标签 -->
			<view class="ring-center">
				<text class="center-label">因子市场</text>
				<text class="center-round">R{{ currentRound }}</text>
			</view>

			<!-- 10因子扇区：按布局圆上的坐标摆放，避免全部堆在圆心 -->
			<view
				v-for="item in layout"
				:key="item.key"
				class="sector"
				:style="[getSectorLayoutStyle(item), getSectorVisualStyle(item)]"
			>
				<view class="sector-content">
					<text class="sector-label">{{ item.label }}</text>
					<text class="sector-value" :style="{ color: colors[item.internal] }">
						{{ formatExposure(item.key) }}
					</text>
				</view>
			</view>

			<view
				v-for="item in layout"
				:key="'line-' + item.key"
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

/** 因子块相对圆心的半径（与 computeFactorRingLayout 使用同一半径） */
const ringRadius = computed(() => props.size * 0.38)

const containerStyle = computed(() => ({
	width: props.size + 'px',
	height: props.size + 'px'
}))

const layout = computed(() =>
	computeFactorRingLayout(ringRadius.value, props.size / 2, props.size / 2)
)

function formatExposure(key) {
	const val = props.exposure[key]
	if (val == null) return '0'
	const n = Number(val)
	return n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

/** 扇区中心落在布局计算出的圆上 */
function getSectorLayoutStyle(item) {
	return {
		left: item.x + 'px',
		top: item.y + 'px',
		transform: 'translate(-50%, -50%)'
	}
}

/** 随暴露强度微调描边与背景，不再用极小 translate 挤在中间 */
function getSectorVisualStyle(item) {
	const val = Number(props.exposure[item.key] || 0)
	const intensity = Math.min(Math.abs(val) / 5, 1)
	const baseColor = colors[item.internal] || '#555'
	const alphaHex = Math.round(intensity * 34 + 8)
		.toString(16)
		.padStart(2, '0')

	return {
		borderColor: `${baseColor}55`,
		backgroundColor: `${baseColor}${alphaHex}`,
		boxShadow: intensity > 0.25 ? `0 0 ${8 + intensity * 14}px ${baseColor}28` : 'none'
	}
}

function getConnectorStyle(item) {
	const cx = props.size / 2
	const cy = props.size / 2
	const len = Math.max(24, ringRadius.value - 36)
	const deg = (item.angle * 180) / Math.PI
	return {
		width: len + 'px',
		left: cx + 'px',
		top: cy + 'px',
		transform: `translate(0, -50%) rotate(${deg}deg)`,
		transformOrigin: 'left center',
		backgroundColor: colors[item.internal] || '#222',
		opacity: 0.25
	}
}
</script>

<style scoped>
.factor-ring {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 0;
	box-sizing: border-box;
	max-width: 100%;
}

.ring-container {
	position: relative;
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.06);
	background: radial-gradient(circle at center, rgba(201, 168, 76, 0.04) 0%, transparent 72%);
	box-sizing: border-box;
}

.ring-center {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	text-align: center;
	z-index: 10;
	pointer-events: none;
}

.center-label {
	font-size: 12px;
	color: #6a6358;
	display: block;
	letter-spacing: 3px;
}

.center-round {
	font-size: 26px;
	font-weight: 300;
	color: #c9a84c;
	display: block;
	margin-top: 6px;
	letter-spacing: 2px;
}

.sector {
	position: absolute;
	min-width: 72px;
	max-width: 88px;
	padding: 8px 6px;
	box-sizing: border-box;
	border-radius: 4px;
	border: 1px solid;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: border-color 0.4s ease, background-color 0.4s ease, box-shadow 0.4s ease;
	z-index: 5;
}

.sector-content {
	text-align: center;
	width: 100%;
}

.sector-label {
	font-size: 10px;
	color: #8a8275;
	display: block;
	letter-spacing: 0.5px;
	line-height: 1.25;
	word-break: keep-all;
}

.sector-value {
	font-size: 13px;
	font-weight: 500;
	display: block;
	margin-top: 4px;
	letter-spacing: 0.5px;
}

.connector {
	position: absolute;
	height: 1px;
	z-index: 1;
	pointer-events: none;
}
</style>
