<template>
	<view class="page">
		<view class="head">
			<text class="title">选择你的角色</text>
			<view class="countdown">
				<text class="countdown-label">剩余时间</text>
				<text class="countdown-time">{{ countdown }}s</text>
			</view>
		</view>

		<view v-if="loading" class="loading">加载中…</view>

		<view v-else class="role-list">
			<view
				v-for="role in roles"
				:key="role.id"
				class="role-item"
				:class="{ 'selected': role.selected, 'disabled': role.selected }"
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
					<view v-if="role.selected" class="taken-info">
						<text class="taken-text">已被 {{ role.selectedBy }} 选择</text>
					</view>
				</view>
			</view>
		</view>

		<view class="actions">
			<button
				class="btn random"
				:disabled="randomCount >= 3 || hasSelected || selecting"
				:loading="selecting && isRandom"
				@click="randomRole"
			>
				随机选择 ({{ randomCount }}/3)
			</button>
		</view>

		<view class="footer">
			<text class="footer-text">已选 {{ selectedCount }}/10 | 剩余 {{ remainingCount }}</text>
			<text v-if="hasSelected" class="my-role">你的角色: {{ myRoleName }}</text>
		</view>

		<!-- 倒计时结束或已选角色后自动跳转 -->
		<view v-if="(countdown <= 0 || hasSelected) && !autoNavigating" class="auto-nav">
			<text class="auto-nav-text">{{ countdown <= 0 ? '时间到，正在进入游戏...' : '选择完成，正在进入游戏...' }}</text>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { f_getStoredUser } from '../../utils/f_userStorage.js'

const roomCode = ref('')
const loading = ref(true)
const selecting = ref(false)
const isRandom = ref(false)
const countdown = ref(60)
const timer = ref(null)
const pollTimer = ref(null)
const hasSelected = ref(false)
const myRoleId = ref(null)
const myRoleName = ref('')
const randomCount = ref(0)
const autoNavigating = ref(false)

const roles = ref([
	{ id: 1, name: '萤火', subtitle: '小市值成长', mainFactor: '规模', subFactor: '成长', image: '/static/roles/no1.png', selected: false, selectedBy: '' },
	{ id: 2, name: '追风', subtitle: '牛市猎手', mainFactor: '贝塔', subFactor: '动量', image: '/static/roles/no2.png', selected: false, selectedBy: '' },
	{ id: 3, name: '盾墙', subtitle: '熊市防守', mainFactor: '残差波动', subFactor: '市净', image: '/static/roles/no3.png', selected: false, selectedBy: '' },
	{ id: 4, name: '刀客', subtitle: '涨停敢死队', mainFactor: '动量', subFactor: '流动性', image: '/static/roles/no4.png', selected: false, selectedBy: '' },
	{ id: 5, name: '掘墓人', subtitle: '深度价值', mainFactor: '市净', subFactor: '盈利收益', image: '/static/roles/no5.png', selected: false, selectedBy: '' },
	{ id: 6, name: '磐石', subtitle: '质量稳健', mainFactor: '盈利收益', subFactor: '杠杆', image: '/static/roles/no6.png', selected: false, selectedBy: '' },
	{ id: 7, name: '夹缝', subtitle: '中盘掘金', mainFactor: '非线性规模', subFactor: '成长', image: '/static/roles/no7.png', selected: false, selectedBy: '' },
	{ id: 8, name: '秤砣', subtitle: 'GARP策略', mainFactor: '成长', subFactor: '市净', image: '/static/roles/no8.png', selected: false, selectedBy: '' },
	{ id: 9, name: '刺猬', subtitle: '小盘防御', mainFactor: '规模', subFactor: '残差波动', image: '/static/roles/no9.png', selected: false, selectedBy: '' },
	{ id: 10, name: '走钢丝', subtitle: '杠铃策略', mainFactor: '动量', subFactor: '市净', image: '/static/roles/no10.png', selected: false, selectedBy: '' }
])

const selectedCount = computed(() => roles.value.filter(r => r.selected).length)
const remainingCount = computed(() => roles.value.filter(r => !r.selected).length)

async function fetchRoleStatus() {
	try {
		const res = await uniCloud.callFunction({
			name: 'f_get_role_status',
			data: { f_room_code: roomCode.value }
		})
		const body = res.result || {}
		if (body.f_code !== 0) return

		const data = body.f_data
		if (data && data.f_roles) {
			roles.value = roles.value.map(r => {
				const serverRole = data.f_roles.find(sr => sr.id === r.id)
				if (serverRole) {
					return {
						...r,
						selected: serverRole.selected,
						selectedBy: serverRole.selectedBy || ''
					}
				}
				return r
			})
		}

		// 检查自己是否已选
		const u = f_getStoredUser()
		if (u && data.f_selected_players) {
			const mySelection = data.f_selected_players.find(p => p.f_player_uid === u.f_uid)
			if (mySelection) {
				hasSelected.value = true
				myRoleId.value = mySelection.f_role_id
				myRoleName.value = mySelection.f_role_name
			}
		}
	} catch (e) {
		console.error(e)
	}
}

async function selectRole(role) {
	if (role.selected || hasSelected.value || selecting.value) return

	selecting.value = true
	isRandom.value = false
	try {
		const u = f_getStoredUser()
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
		hasSelected.value = true
		myRoleId.value = body.f_data.f_role_id
		myRoleName.value = body.f_data.f_role_name
		uni.showToast({ title: `选择了 ${body.f_data.f_role_name}`, icon: 'success' })
		await fetchRoleStatus()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '选择失败', icon: 'none' })
	} finally {
		selecting.value = false
	}
}

async function randomRole() {
	if (hasSelected.value || selecting.value || randomCount.value >= 3) return

	selecting.value = true
	isRandom.value = true
	try {
		const u = f_getStoredUser()
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
		hasSelected.value = true
		myRoleId.value = body.f_data.f_role_id
		myRoleName.value = body.f_data.f_role_name
		randomCount.value = body.f_data.f_random_count || 0
		uni.showToast({ title: `随机到 ${body.f_data.f_role_name}`, icon: 'success' })
		await fetchRoleStatus()
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '随机失败', icon: 'none' })
	} finally {
		selecting.value = false
	}
}

function startCountdown() {
	timer.value = setInterval(() => {
		if (countdown.value > 0) {
			countdown.value--
		} else {
			clearInterval(timer.value)
			autoNavigate()
		}
	}, 1000)
}

function startPolling() {
	pollTimer.value = setInterval(() => {
		fetchRoleStatus()
	}, 2000)
}

function autoNavigate() {
	if (autoNavigating.value) return
	autoNavigating.value = true
	clearInterval(timer.value)
	clearInterval(pollTimer.value)
	setTimeout(() => {
		uni.redirectTo({ url: '/pages/f_game/play?code=' + encodeURIComponent(roomCode.value) })
	}, 1500)
}

watch(hasSelected, (val) => {
	if (val) {
		autoNavigate()
	}
})

onLoad((options) => {
	const rc = (options && options.code) || ''
	roomCode.value = rc
	if (!/^\d{4}$/.test(rc)) {
		uni.showToast({ title: '房间号无效', icon: 'none' })
		setTimeout(() => uni.navigateBack(), 800)
		return
	}
	loading.value = false
	fetchRoleStatus()
	startCountdown()
	startPolling()
})

onUnmounted(() => {
	clearInterval(timer.value)
	clearInterval(pollTimer.value)
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
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24rpx;
}

.title {
	font-size: 36rpx;
	font-weight: 700;
	color: #f5e6b3;
}

.countdown {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.countdown-label {
	font-size: 24rpx;
	color: #bfa56a;
}

.countdown-time {
	font-size: 32rpx;
	font-weight: 700;
	color: #ff6b6b;
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

.role-item.selected {
	opacity: 0.5;
	border-color: #444;
}

.role-item.disabled {
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

.auto-nav {
	margin-top: 40rpx;
	text-align: center;
}

.auto-nav-text {
	font-size: 28rpx;
	color: #bfa56a;
}
</style>
