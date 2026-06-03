<template>
	<view class="page">
		<view class="header">
			<text class="title">角色展示</text>
			<text class="sub">房间 {{ roomCode || '-' }} · 选角实况约每 1.2 秒刷新</text>
		</view>

		<view v-if="!roomOk" class="err">
			<text class="err-t">请使用 ?code= 或 ?roomId= 四位房间号打开本页</text>
		</view>

		<view v-else class="grid">
			<view
				v-for="r in mergedRoles"
				:key="r.id"
				class="cell"
				:class="{ locked: !!r.selectedByUid }"
				@click="openDetail(r)"
			>
				<view class="thumb-wrap">
					<image class="thumb" :src="r.image" mode="aspectFill" />
					<view v-if="r.selectedByUid" class="lock-ribbon">已锁定</view>
				</view>
				<text class="name">{{ r.name }}</text>
				<text class="subline">{{ r.subtitle }}</text>
				<text v-if="r.selectedBy" class="by">{{ r.selectedBy }}</text>
				<text v-else class="free">待选</text>
			</view>
		</view>

		<view v-if="roomOk" class="footer-bar">
			<button type="button" class="btn-back" @click="goBack">返回上一页</button>
		</view>

		<view v-if="detail" class="modal-mask" @click="closeDetail">
			<view class="modal-panel" @click.stop>
				<view class="modal-head">
					<text class="modal-title">{{ detail.name }} · {{ detail.subtitle }}</text>
					<button type="button" class="modal-close" @click="closeDetail">×</button>
				</view>
				<!-- #ifdef H5 -->
				<view class="modal-scroll modal-scroll--h5" :style="{ maxHeight: modalScrollPx + 'px' }">
					<image class="hero" :src="detail.image" mode="widthFix" />
					<view class="tag-row">
						<text class="tag main">主：{{ detail.mainFactor }}</text>
						<text class="tag sub">副：{{ detail.subFactor }}</text>
					</view>
					<text v-if="detail.selectedBy" class="lock-line">当前已被「{{ detail.selectedBy }}」锁定</text>
					<text v-else class="lock-line dim">尚未被锁定</text>

					<text class="sec-label">角色介绍</text>
					<text class="sec-body">{{ detail.roleIntro }}</text>

					<text class="sec-label">配置阶段 · {{ detail.activeSkillName }}</text>
					<text class="sec-body">{{ detail.activeSkillDesc }}</text>

					<text class="sec-label">运行阶段 · {{ detail.passiveSkillName }}</text>
					<text class="sec-body">{{ detail.passiveSkillDesc }}</text>
				</view>
				<!-- #endif -->
				<!-- #ifndef H5 -->
				<scroll-view
					scroll-y
					class="modal-scroll"
					:show-scrollbar="false"
					:enable-flex="true"
					:style="{ height: modalScrollPx + 'px' }"
				>
					<image class="hero" :src="detail.image" mode="widthFix" />
					<view class="tag-row">
						<text class="tag main">主：{{ detail.mainFactor }}</text>
						<text class="tag sub">副：{{ detail.subFactor }}</text>
					</view>
					<text v-if="detail.selectedBy" class="lock-line">当前已被「{{ detail.selectedBy }}」锁定</text>
					<text v-else class="lock-line dim">尚未被锁定</text>

					<text class="sec-label">角色介绍</text>
					<text class="sec-body">{{ detail.roleIntro }}</text>

					<text class="sec-label">配置阶段 · {{ detail.activeSkillName }}</text>
					<text class="sec-body">{{ detail.activeSkillDesc }}</text>

					<text class="sec-label">运行阶段 · {{ detail.passiveSkillName }}</text>
					<text class="sec-body">{{ detail.passiveSkillDesc }}</text>
				</scroll-view>
				<!-- #endif -->
			</view>
		</view>
		<f-factor-intro-fab />
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { F_GAME_ROLES, f_gameRolePortraitDisplayUrl } from '@/utils/f_gameRolesSpec.js'

const roomCode = ref('')
const liveRoles = ref([])
const detailId = ref(null)
/** 小程序 scroll-y 须明确像素高度，否则无法滚动 */
const modalScrollPx = ref(420)
let timer = null

function f_updateModalScrollHeight() {
	try {
		let wh = 600
		if (typeof window !== 'undefined' && Number(window.innerHeight)) {
			wh = window.innerHeight
		} else {
			const sys = typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()
			wh = Number(sys.windowHeight) || 600
		}
		const headPx = uni.upx2px ? uni.upx2px(120) : 60
		const padPx = uni.upx2px ? uni.upx2px(64) : 32
		modalScrollPx.value = Math.max(240, Math.floor(wh * 0.82 - headPx - padPx))
	} catch (_) {
		modalScrollPx.value = 420
	}
}

const roomOk = computed(() => /^\d{4}$/.test(roomCode.value))

const mergedRoles = computed(() => {
	const map = new Map()
	for (const x of liveRoles.value || []) {
		map.set(x.id, x)
	}
	return F_GAME_ROLES.map((meta) => {
		const live = map.get(meta.id)
		const selectedByUid = (live && live.selectedByUid) || ''
		return {
			...meta,
			image: f_gameRolePortraitDisplayUrl(meta.id, !!selectedByUid),
			selectedBy: (live && live.selectedBy) || '',
			selectedByUid
		}
	})
})

const detail = computed(() => {
	if (!detailId.value) return null
	return mergedRoles.value.find((r) => r.id === detailId.value) || null
})

function openDetail(r) {
	f_updateModalScrollHeight()
	detailId.value = r.id
}

function closeDetail() {
	detailId.value = null
}

function goBack() {
	uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/index/index' }) })
}

async function pollOnce() {
	if (!roomOk.value) return
	try {
		const res = await uniCloud.callFunction({
			name: 'f_get_role_status',
			data: { f_room_code: roomCode.value }
		})
		const body = res.result || {}
		if (body.f_code !== 0 || !body.f_data || !body.f_data.f_roles) return
		liveRoles.value = body.f_data.f_roles
	} catch (e) {
		console.error(e)
	}
}

function startPoll() {
	pollOnce()
	if (timer) clearInterval(timer)
	timer = setInterval(pollOnce, 1200)
}

onLoad((options) => {
	f_updateModalScrollHeight()
	const q = options && (options.roomId || options.code || options.room)
	roomCode.value = String(q || '')
		.replace(/\D/g, '')
		.slice(0, 4)
	if (roomOk.value) startPoll()
	else {
		uni.showToast({ title: '缺少四位房间号', icon: 'none' })
	}
})

onUnload(() => {
	if (timer) clearInterval(timer)
	timer = null
})
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 28rpx 24rpx 120rpx;
	background: linear-gradient(180deg, #12121a 0%, #0b0b0d 40%);
	box-sizing: border-box;
}

.header {
	margin-bottom: 28rpx;
}

.title {
	font-size: 40rpx;
	font-weight: 700;
	color: #f5e6b3;
	display: block;
	letter-spacing: 2rpx;
}

.sub {
	font-size: 24rpx;
	color: #a89460;
	margin-top: 10rpx;
	display: block;
}

.err {
	padding: 80rpx 24rpx;
	text-align: center;
}

.err-t {
	font-size: 28rpx;
	color: #c9a227;
}

.grid {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 16rpx;
}

.cell {
	width: auto;
	max-width: none;
	background: #16161e;
	border: 2rpx solid #3a3220;
	border-radius: 16rpx;
	padding: 12rpx 8rpx 16rpx;
	box-sizing: border-box;
	text-align: center;
	transition: border-color 0.2s, transform 0.15s;
}

.cell:active {
	transform: scale(0.98);
}

.cell.locked {
	border-color: #b8860b;
	box-shadow: 0 0 20rpx rgba(212, 175, 55, 0.15);
}

.thumb-wrap {
	position: relative;
	width: 100%;
	aspect-ratio: 3 / 4;
	border-radius: 12rpx;
	overflow: hidden;
	background: #0a0a10;
}

.thumb {
	width: 100%;
	height: 100%;
}

.lock-ribbon {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 6rpx 0;
	font-size: 20rpx;
	color: #111;
	background: linear-gradient(90deg, #d4af37, #f0d78c);
	font-weight: 700;
}

.name {
	display: block;
	margin-top: 10rpx;
	font-size: 26rpx;
	font-weight: 700;
	color: #f5e6b3;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.subline {
	display: block;
	font-size: 20rpx;
	color: #8a7a50;
	margin-top: 4rpx;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.by {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: #d4af37;
	font-weight: 600;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.free {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: #666;
}

.footer-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
	background: linear-gradient(180deg, transparent, #0b0b0d 30%);
}

.btn-back {
	width: 100%;
	height: 80rpx;
	line-height: 80rpx;
	border-radius: 999rpx;
	background: #2a2418;
	color: #dcc58a;
	font-size: 28rpx;
	border: 1rpx solid #5b4a20;
}

.btn-back::after {
	border: none;
}

.modal-mask {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.72);
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 32rpx;
	box-sizing: border-box;
}

.modal-panel {
	width: 100%;
	max-width: 720px;
	max-height: 90vh;
	background: #14141c;
	border: 2rpx solid #6d5825;
	border-radius: 24rpx;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.modal-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 24rpx;
	border-bottom: 1rpx solid #3f341a;
	flex-shrink: 0;
}

.modal-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #f5e6b3;
	flex: 1;
	padding-right: 16rpx;
}

.modal-close {
	width: 64rpx;
	height: 64rpx;
	line-height: 60rpx;
	text-align: center;
	font-size: 44rpx;
	color: #999;
	background: transparent;
	border: none;
	padding: 0;
}

.modal-close::after {
	border: none;
}

.modal-scroll {
	flex: 1;
	min-height: 0;
	width: 100%;
	padding: 20rpx 28rpx calc(36rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

/* #ifdef H5 */
/* Chrome / 大屏：uni scroll-view 常无法滚轮滚动；用原生 overflow */
.modal-scroll--h5 {
	overflow-x: hidden;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
	overscroll-behavior: contain;
	flex: 1 1 auto;
	min-height: 0;
	width: 100%;
	padding: 20rpx 28rpx calc(36rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}
/* #endif */

.hero {
	width: 100%;
	border-radius: 16rpx;
	display: block;
	background: #0a0a10;
}

.tag-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 20rpx;
}

.tag {
	padding: 8rpx 20rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
	font-weight: 600;
}

.tag.main {
	background: #2c3e50;
	color: #fff;
}

.tag.sub {
	background: #2a2620;
	color: #c9b896;
}

.lock-line {
	display: block;
	margin-top: 16rpx;
	font-size: 26rpx;
	color: #d4af37;
	font-weight: 600;
}

.lock-line.dim {
	color: #777;
	font-weight: 400;
}

.sec-label {
	display: block;
	margin-top: 28rpx;
	font-size: 26rpx;
	font-weight: 700;
	color: #c9a227;
}

.sec-body {
	display: block;
	margin-top: 10rpx;
	font-size: 26rpx;
	color: #d8d0c0;
	line-height: 1.55;
}
</style>
