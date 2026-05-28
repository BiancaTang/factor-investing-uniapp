<template>
	<view class="ffif">
		<view v-if="!visible" class="ffif-fab" @click.stop="openModal">
			<text class="ffif-fab-text">因子</text>
		</view>

		<view v-if="visible" class="ffif-modal">
			<view class="ffif-mask" @click="closeModal" @touchmove.stop.prevent="noop" />
			<view class="ffif-panel" @click.stop>
				<view class="ffif-head">
					<text class="ffif-title">十个因子简介</text>
					<view class="ffif-close" @click="closeModal">
						<text class="ffif-close-text">×</text>
					</view>
				</view>
				<scroll-view scroll-y class="ffif-scroll" :show-scrollbar="false">
					<view v-for="item in introItems" :key="item.key" class="ffif-item">
						<view class="ffif-bar" :style="{ background: item.color }">
							<text class="ffif-bar-text">{{ item.title }}</text>
						</view>
						<text class="ffif-desc">{{ item.desc }}</text>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { F_FACTOR_DEFS } from '../../utils/f_gameFactorSpec.js'
import { F_FACTOR_COLOR_BY_FAC_KEY } from '../../utils/f_factorPalette.js'

const visible = ref(false)

const introItems = computed(() =>
	F_FACTOR_DEFS.map((d) => ({
		key: d.key,
		title: d.introTitle,
		desc: d.introDesc,
		color: F_FACTOR_COLOR_BY_FAC_KEY[d.key]
	}))
)

function openModal() {
	visible.value = true
}

function closeModal() {
	visible.value = false
}

function noop() {}
</script>

<style scoped>
.ffif {
	pointer-events: none;
}

.ffif-fab {
	pointer-events: auto;
	position: fixed;
	right: 28rpx;
	bottom: calc(48rpx + env(safe-area-inset-bottom));
	z-index: 10090;
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background: linear-gradient(145deg, #d4af37 0%, #8b6914 100%);
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
}

.ffif-fab-text {
	font-size: 28rpx;
	font-weight: 600;
	color: #1a1408;
}

.ffif-modal {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 10080;
	pointer-events: auto;
}

.ffif-mask {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.62);
}

.ffif-panel {
	position: absolute;
	left: 40rpx;
	right: 40rpx;
	top: 50%;
	transform: translateY(-50%);
	max-height: 78vh;
	background: #141218;
	border: 1rpx solid rgba(212, 175, 55, 0.35);
	border-radius: 20rpx;
	padding: 28rpx 24rpx 24rpx;
	box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.55);
	display: flex;
	flex-direction: column;
}

.ffif-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16rpx;
	flex-shrink: 0;
}

.ffif-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #f5e6b3;
}

.ffif-close {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.ffif-close-text {
	font-size: 44rpx;
	line-height: 1;
	color: #c9b87a;
}

.ffif-scroll {
	flex: 1;
	max-height: calc(78vh - 100rpx);
}

.ffif-item {
	margin-bottom: 20rpx;
}

.ffif-item:last-child {
	margin-bottom: 8rpx;
}

.ffif-bar {
	border-radius: 10rpx;
	padding: 12rpx 16rpx;
}

.ffif-bar-text {
	font-size: 26rpx;
	color: #fff;
}

.ffif-desc {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	line-height: 1.55;
	color: #dcc58a;
}
</style>
