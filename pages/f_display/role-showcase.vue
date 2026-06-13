<template>
	<view class="page">
		<view class="header">
			<text class="title">角色展示</text>
			<text v-if="roomOk" class="sub">房间 {{ roomCode }}</text>
		</view>

		<view v-if="!roomOk" class="err">
			<text class="err-t">请使用 ?code= 或 ?roomId= 四位房间号打开本页</text>
		</view>

		<view v-else class="showcase">
			<view class="role-rail">
				<text class="rail-label">十个角色</text>
				<scroll-view scroll-y class="rail-scroll" :show-scrollbar="false">
					<view
						v-for="r in mergedRoles"
						:key="r.id"
						class="role-chip"
						:class="{
							active: selectedId === r.id,
							locked: !!r.selectedByUid
						}"
						@click="selectRole(r.id)"
					>
						<view class="chip-thumb-wrap">
							<image class="chip-thumb" :src="r.image" mode="aspectFill" />
							<view v-if="r.selectedByUid" class="chip-lock">锁</view>
						</view>
						<view class="chip-text">
							<text class="chip-name">{{ r.name }}</text>
							<text class="chip-sub">{{ r.subtitle }}</text>
							<text v-if="r.selectedBy" class="chip-by">{{ r.selectedBy }}</text>
							<text v-else class="chip-free">待选</text>
						</view>
					</view>
				</scroll-view>
			</view>

			<view v-if="selectedRole" class="detail-panel">
				<view class="detail-head">
					<text class="detail-name">{{ selectedRole.name }}</text>
					<text class="detail-sub">{{ selectedRole.subtitle }}</text>
				</view>

				<!-- #ifdef H5 -->
				<view class="detail-scroll detail-scroll--h5">
					<image class="hero" :src="selectedRole.image" mode="widthFix" />
					<view class="tag-row">
						<text class="tag main">主：{{ selectedRole.mainFactor }}</text>
						<text class="tag sub">副：{{ selectedRole.subFactor }}</text>
					</view>
					<text v-if="selectedRole.selectedBy" class="lock-line">
						当前已被「{{ selectedRole.selectedBy }}」锁定
					</text>
					<text v-else class="lock-line dim">尚未被锁定</text>

					<text class="sec-label">角色介绍</text>
					<text class="sec-body">{{ selectedRole.roleIntro }}</text>

					<text class="sec-label">配置阶段 · {{ selectedRole.activeSkillName }}</text>
					<text class="sec-body">{{ selectedRole.activeSkillDesc }}</text>

					<text class="sec-label">运行阶段 · {{ selectedRole.passiveSkillName }}</text>
					<text class="sec-body">{{ selectedRole.passiveSkillDesc }}</text>
				</view>
				<!-- #endif -->
				<!-- #ifndef H5 -->
				<scroll-view scroll-y class="detail-scroll" :show-scrollbar="false">
					<image class="hero" :src="selectedRole.image" mode="widthFix" />
					<view class="tag-row">
						<text class="tag main">主：{{ selectedRole.mainFactor }}</text>
						<text class="tag sub">副：{{ selectedRole.subFactor }}</text>
					</view>
					<text v-if="selectedRole.selectedBy" class="lock-line">
						当前已被「{{ selectedRole.selectedBy }}」锁定
					</text>
					<text v-else class="lock-line dim">尚未被锁定</text>

					<text class="sec-label">角色介绍</text>
					<text class="sec-body">{{ selectedRole.roleIntro }}</text>

					<text class="sec-label">配置阶段 · {{ selectedRole.activeSkillName }}</text>
					<text class="sec-body">{{ selectedRole.activeSkillDesc }}</text>

					<text class="sec-label">运行阶段 · {{ selectedRole.passiveSkillName }}</text>
					<text class="sec-body">{{ selectedRole.passiveSkillDesc }}</text>
				</scroll-view>
				<!-- #endif -->
			</view>
		</view>

		<view v-if="roomOk" class="footer-bar">
			<button type="button" class="btn-back" @click="goBack">返回上一页</button>
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
const selectedId = ref(1)
let timer = null

const roomOk = computed(() => /^\d{4}$/.test(roomCode.value))

const mergedRoles = computed(() => {
	const map = new Map()
	for (const x of liveRoles.value || []) {
		map.set(x.id, x)
	}
	return F_GAME_ROLES.filter((meta) => meta.id >= 1 && meta.id <= 10).map((meta) => {
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

const selectedRole = computed(() => {
	return mergedRoles.value.find((r) => r.id === selectedId.value) || mergedRoles.value[0] || null
})

function selectRole(id) {
	selectedId.value = id
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
	const q = options && (options.roomId || options.code || options.room)
	roomCode.value = String(q || '')
		.replace(/\D/g, '')
		.slice(0, 4)
	selectedId.value = 1
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
	height: 100vh;
	display: flex;
	flex-direction: column;
	padding: 24rpx 24rpx 120rpx;
	background: linear-gradient(180deg, #12121a 0%, #0b0b0d 40%);
	box-sizing: border-box;
}

.header {
	flex-shrink: 0;
	margin-bottom: 20rpx;
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

.showcase {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: row;
	gap: 20rpx;
}

.role-rail {
	width: 280rpx;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	min-height: 0;
	background: rgba(22, 22, 30, 0.85);
	border: 2rpx solid #3a3220;
	border-radius: 16rpx;
	padding: 16rpx 12rpx;
	box-sizing: border-box;
}

.rail-label {
	font-size: 22rpx;
	color: #8a7a50;
	letter-spacing: 4rpx;
	text-align: center;
	margin-bottom: 12rpx;
	flex-shrink: 0;
}

.rail-scroll {
	flex: 1;
	min-height: 0;
	height: 0;
}

.role-chip {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
	padding: 10rpx;
	margin-bottom: 10rpx;
	border-radius: 12rpx;
	border: 2rpx solid transparent;
	background: #121218;
	transition: border-color 0.2s, background 0.2s;
}

.role-chip.active {
	border-color: #d4af37;
	background: rgba(212, 175, 55, 0.08);
	box-shadow: 0 0 16rpx rgba(212, 175, 55, 0.12);
}

.role-chip.locked:not(.active) {
	border-color: rgba(184, 134, 11, 0.45);
}

.chip-thumb-wrap {
	position: relative;
	width: 72rpx;
	height: 96rpx;
	flex-shrink: 0;
	border-radius: 8rpx;
	overflow: hidden;
	background: #0a0a10;
}

.chip-thumb {
	width: 100%;
	height: 100%;
}

.chip-lock {
	position: absolute;
	right: 0;
	bottom: 0;
	padding: 2rpx 8rpx;
	font-size: 18rpx;
	font-weight: 700;
	color: #111;
	background: #d4af37;
	border-top-left-radius: 6rpx;
}

.chip-text {
	flex: 1;
	min-width: 0;
	text-align: left;
}

.chip-name {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #f5e6b3;
	line-height: 1.2;
}

.chip-sub {
	display: block;
	font-size: 20rpx;
	color: #8a7a50;
	margin-top: 4rpx;
	line-height: 1.25;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chip-by {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	color: #d4af37;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chip-free {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	color: #666;
}

.detail-panel {
	flex: 1;
	min-width: 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
	background: #14141c;
	border: 2rpx solid #6d5825;
	border-radius: 16rpx;
	overflow: hidden;
}

.detail-head {
	flex-shrink: 0;
	padding: 20rpx 28rpx 16rpx;
	border-bottom: 1rpx solid #3f341a;
}

.detail-name {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	color: #f5e6b3;
	letter-spacing: 2rpx;
}

.detail-sub {
	display: block;
	margin-top: 8rpx;
	font-size: 26rpx;
	color: #a89460;
}

.detail-scroll {
	flex: 1;
	min-height: 0;
	height: 0;
	width: 100%;
	padding: 20rpx 28rpx 28rpx;
	box-sizing: border-box;
}

/* #ifdef H5 */
.detail-scroll--h5 {
	flex: 1;
	min-height: 0;
	overflow-x: hidden;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
	height: auto;
}
/* #endif */

.hero {
	width: 100%;
	max-width: 520px;
	margin: 0 auto;
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

.footer-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
	background: linear-gradient(180deg, transparent, #0b0b0d 30%);
	z-index: 10;
}

.btn-back {
	width: 100%;
	max-width: 480px;
	margin: 0 auto;
	display: block;
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

/* 大屏 H5：加宽左侧栏与间距 */
@media (min-width: 900px) {
	.showcase {
		gap: 24px;
		padding: 0 8px;
	}

	.role-rail {
		width: 220px;
		padding: 14px 10px;
		border-radius: 8px;
	}

	.role-chip {
		padding: 8px;
		margin-bottom: 8px;
		border-radius: 8px;
		cursor: pointer;
	}

	.chip-thumb-wrap {
		width: 48px;
		height: 64px;
		border-radius: 6px;
	}

	.chip-name {
		font-size: 15px;
	}

	.chip-sub,
	.chip-by,
	.chip-free {
		font-size: 12px;
	}

	.detail-name {
		font-size: 22px;
	}

	.detail-sub {
		font-size: 14px;
	}

	.sec-label,
	.sec-body,
	.lock-line,
	.tag {
		font-size: 14px;
	}
}
</style>
