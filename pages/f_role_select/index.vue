<template>
	<view class="page">
		<view class="head">
			<text class="title">选择你的角色</text>
			<text class="hint-top">房间已锁定后可选角；管理员在观测页点击「开始博弈」前可随时改选。</text>
		</view>

		<view v-if="loading" class="loading">加载中…</view>

		<view v-else class="role-list">
			<view
				v-for="role in roles"
				:key="role.id"
				class="role-item"
				:class="{
					disabled: role.selectedByUid && role.selectedByUid !== myUid,
					mine: role.selectedByUid === myUid
				}"
				@click="selectRole(role)"
			>
				<view class="role-left">
					<image class="role-thumb" :src="role.image" mode="aspectFill" />
				</view>
				<view class="role-right">
					<view class="role-top">
						<text class="role-name">{{ role.name }}</text>
						<text class="role-subtitle">{{ role.subtitle }}</text>
					</view>
					<view class="factor-tags">
						<text class="factor-tag main">主:{{ role.mainFactor }}</text>
						<text class="factor-tag sub">副:{{ role.subFactor }}</text>
					</view>
					<view v-if="role.selectedByUid" class="taken-info">
						<text class="taken-text">已被 {{ role.selectedBy }} 选择</text>
					</view>
				</view>
			</view>
		</view>

		<view class="actions">
			<button
				class="btn random"
				:disabled="selecting || !canRandom"
				:loading="selecting && isRandom"
				@click="randomRole"
			>
				随机可用角色
			</button>
		</view>

		<view class="footer">
			<text class="footer-text">已选 {{ selectedCount }}/11 | 剩余 {{ remainingCount }}</text>
			<text v-if="myRoleName" class="my-role">当前角色: {{ myRoleName }}</text>
		</view>

		<button class="btn ghost wide" @click="backPlay">返回游戏页</button>
	</view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { f_getStoredUser } from '../../utils/f_userStorage.js'
import { F_GAME_ROLES, f_gameRolePortraitUrl } from '../../utils/f_gameRolesSpec.js'

const roomCode = ref('')
const loading = ref(true)
const selecting = ref(false)
const isRandom = ref(false)
const pollTimer = ref(null)
const myRoleId = ref(null)
const myRoleName = ref('')
const playingStarted = ref(false)

const myUid = computed(() => {
	const u = f_getStoredUser()
	return u && u.f_uid ? String(u.f_uid) : ''
})

const roles = ref(
	F_GAME_ROLES.map((r) => ({
		id: r.id,
		name: r.name,
		subtitle: r.subtitle,
		mainFactor: r.mainFactor,
		subFactor: r.subFactor,
		image: f_gameRolePortraitUrl(r.id),
		selectedBy: '',
		selectedByUid: ''
	}))
)

const selectedCount = computed(() => roles.value.filter((r) => r.selectedByUid).length)
const remainingCount = computed(() => roles.value.filter((r) => !r.selectedByUid).length)
const canRandom = computed(() => roles.value.some((r) => !r.selectedByUid || r.selectedByUid === myUid.value))

async function fetchRoleStatus() {
	try {
		const res = await uniCloud.callFunction({
			name: 'f_get_role_status',
			data: { f_room_code: roomCode.value }
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '加载失败', icon: 'none' })
			return
		}
		const data = body.f_data
		playingStarted.value = !!(data && data.f_playing_started)
		if (playingStarted.value && roomCode.value) {
			uni.showToast({ title: '管理员已开始博弈', icon: 'none' })
			setTimeout(() => {
				uni.redirectTo({ url: '/pages/f_game/play?code=' + encodeURIComponent(roomCode.value) })
			}, 400)
			return
		}
		if (data && data.f_roles) {
			roles.value = data.f_roles.map((sr) => ({
				id: sr.id,
				name: sr.name,
				subtitle: sr.subtitle,
				mainFactor: sr.mainFactor,
				subFactor: sr.subFactor,
				image: sr.image || f_gameRolePortraitUrl(sr.id),
				selectedBy: sr.selectedBy || '',
				selectedByUid: sr.selectedByUid || ''
			}))
		}
		const u = f_getStoredUser()
		if (u && data.f_selected_players) {
			const mine = data.f_selected_players.find((p) => p.f_player_uid === u.f_uid)
			if (mine) {
				myRoleId.value = mine.f_role_id
				myRoleName.value = mine.f_role_name || ''
			} else {
				myRoleId.value = null
				myRoleName.value = ''
			}
		}
	} catch (e) {
		console.error(e)
	}
}

async function selectRole(role) {
	if (playingStarted.value || selecting.value) return
	if (role.selectedByUid && role.selectedByUid !== myUid.value) return

	selecting.value = true
	isRandom.value = false
	try {
		const u = f_getStoredUser()
		if (!u || !u.f_uid) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			return
		}
		const res = await uniCloud.callFunction({
			name: 'f_select_role',
			data: {
				f_room_code: roomCode.value,
				f_player_uid: u.f_uid,
				f_role_id: role.id
			}
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '选择失败', icon: 'none' })
			return
		}
		myRoleId.value = body.f_data.f_role_id
		myRoleName.value = body.f_data.f_role_name
		uni.showToast({ title: `已选择 ${body.f_data.f_role_name}`, icon: 'success' })
		await fetchRoleStatus()
		goToPlayWaiting()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '选择失败', icon: 'none' })
	} finally {
		selecting.value = false
	}
}

async function randomRole() {
	if (playingStarted.value || selecting.value || !canRandom.value) return

	selecting.value = true
	isRandom.value = true
	try {
		const u = f_getStoredUser()
		if (!u || !u.f_uid) return
		const res = await uniCloud.callFunction({
			name: 'f_select_role',
			data: {
				f_room_code: roomCode.value,
				f_player_uid: u.f_uid,
				f_is_random: true
			}
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '随机失败', icon: 'none' })
			return
		}
		myRoleId.value = body.f_data.f_role_id
		myRoleName.value = body.f_data.f_role_name
		uni.showToast({ title: `随机到 ${body.f_data.f_role_name}`, icon: 'success' })
		await fetchRoleStatus()
		goToPlayWaiting()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '随机失败', icon: 'none' })
	} finally {
		selecting.value = false
	}
}

function startPolling() {
	pollTimer.value = setInterval(() => {
		fetchRoleStatus()
	}, 2000)
}

function goToPlayWaiting() {
	const rc = roomCode.value
	if (/^\d{4}$/.test(rc)) {
		uni.redirectTo({ url: '/pages/f_game/play?code=' + encodeURIComponent(rc) })
	} else {
		uni.navigateBack()
	}
}

function backPlay() {
	goToPlayWaiting()
}

onLoad((options) => {
	const rc = (options && (options.code || options.roomId)) || ''
	roomCode.value = String(rc).replace(/\D/g, '').slice(0, 4)
	if (!/^\d{4}$/.test(roomCode.value)) {
		uni.showToast({ title: '房间号无效', icon: 'none' })
		setTimeout(() => uni.navigateBack(), 800)
		return
	}
	loading.value = false
	fetchRoleStatus()
	startPolling()
})

onUnmounted(() => {
	if (pollTimer.value) clearInterval(pollTimer.value)
})
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 24rpx;
	padding-bottom: 48rpx;
	background: #0b0b0d;
	box-sizing: border-box;
}

.head {
	margin-bottom: 24rpx;
}

.title {
	font-size: 36rpx;
	font-weight: 700;
	color: #f5e6b3;
	display: block;
}

.hint-top {
	font-size: 24rpx;
	color: #bfa56a;
	margin-top: 12rpx;
	display: block;
	line-height: 1.5;
}

.loading {
	text-align: center;
	padding: 80rpx;
	color: #bfa56a;
}

.role-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.role-item {
	display: flex;
	align-items: center;
	gap: 20rpx;
	background: #161616;
	border: 1rpx solid #3f341a;
	border-radius: 16rpx;
	padding: 16rpx;
	transition: all 0.2s;
}

.role-item:active {
	background: #1e1e1e;
}

.role-item.mine {
	border-color: #d4af37;
}

.role-item.disabled {
	opacity: 0.45;
	pointer-events: none;
}

.role-left {
	flex-shrink: 0;
}

.role-thumb {
	width: 100rpx;
	height: 100rpx;
	border-radius: 12rpx;
	background: #0f0f1a;
}

.role-right {
	flex: 1;
	min-width: 0;
}

.role-top {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 8rpx;
}

.role-name {
	font-size: 32rpx;
	font-weight: 700;
	color: #f5e6b3;
}

.role-subtitle {
	font-size: 24rpx;
	color: #888;
}

.factor-tags {
	display: flex;
	gap: 10rpx;
}

.factor-tag {
	font-size: 20rpx;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	color: #fff;
}

.factor-tag.main {
	background: #e74c3c;
}

.factor-tag.sub {
	background: #3498db;
}

.taken-info {
	margin-top: 8rpx;
}

.taken-text {
	font-size: 22rpx;
	color: #ff6b6b;
}

.actions {
	margin-top: 32rpx;
}

.btn {
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 999rpx;
	font-size: 30rpx;
}

.btn::after {
	border: none;
}

.btn.random {
	background: linear-gradient(135deg, #d4af37, #8f6b1e);
	color: #111;
}

.btn[disabled] {
	opacity: 0.45;
}

.btn.ghost {
	margin-top: 24rpx;
	background: #2a2415;
	color: #f5e6b3;
	border: 1rpx solid #6d5825;
}

.btn.wide {
	width: 100%;
}

.footer {
	margin-top: 24rpx;
	text-align: center;
}

.footer-text {
	font-size: 26rpx;
	color: #888;
	display: block;
}

.my-role {
	font-size: 28rpx;
	color: #d4af37;
	font-weight: 600;
	margin-top: 8rpx;
	display: block;
}
</style>
