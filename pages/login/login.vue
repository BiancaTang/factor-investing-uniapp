<template>
	<view class="page">
		<view class="hero">
			<text class="brand">因子投资</text>
			<text class="sub">{{ step === 'phone' ? '请输入手机号' : '完善微信头像与昵称以完成注册' }}</text>
		</view>

		<view class="card">
			<!-- 第一步：仅手机号 -->
			<view v-if="step === 'phone'" class="block">
				<view class="row">
					<text class="label">手机号</text>
					<input
						class="field"
						type="number"
						maxlength="11"
						:value="phone"
						placeholder="11 位中国大陆手机号"
						@input="onPhoneInput"
					/>
				</view>
				<button
					class="btn primary"
					:disabled="!phoneOk || lookupLoading"
					:loading="lookupLoading"
					@click="onPhoneConfirm"
				>
					确定
				</button>
				<text class="tips">将查询云数据库表 f_user_profile 是否已有该手机号。</text>
			</view>

			<!-- 第二步：未注册时填写资料 -->
			<view v-else class="block">
				<view class="phone-bar">
					<text class="phone-fixed">手机号 {{ phone }}</text>
					<text class="link" @click="backToPhone">更换手机号</text>
				</view>

				<view class="row avatar-row">
					<text class="label">头像</text>
					<!-- #ifdef MP-WEIXIN -->
					<button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
						<image v-if="avatarUrl" class="avatar" :src="avatarUrl" mode="aspectFill" />
						<text v-else class="avatar-placeholder">点击选择微信头像</text>
					</button>
					<!-- #endif -->
					<!-- #ifndef MP-WEIXIN -->
					<view class="avatar-side">
						<button class="pick-btn" @click="pickLocalImage">选择图片</button>
						<image v-if="avatarUrl" class="avatar large" :src="avatarUrl" mode="aspectFill" />
					</view>
					<!-- #endif -->
				</view>

				<view class="row">
					<text class="label">昵称</text>
					<!-- #ifdef MP-WEIXIN -->
					<input
						class="field"
						type="nickname"
						:value="nickName"
						placeholder="请输入昵称"
						@blur="onNickBlur"
						@input="onNickInput"
					/>
					<!-- #endif -->
					<!-- #ifndef MP-WEIXIN -->
					<input
						class="field"
						type="text"
						:value="nickName"
						placeholder="请输入昵称"
						@blur="onNickBlur"
						@input="onNickInput"
					/>
					<!-- #endif -->
				</view>

				<button
					class="btn enter"
					:disabled="!canRegister || saving"
					:loading="saving"
					@click="doRegister"
				>
					注册
				</button>
				<text class="tips">注册成功后将写入 f_user_profile，角色默认为玩家（player）。</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { f_getStoredUser, f_saveUserLocal } from '../../utils/f_userStorage.js'
import { f_lookupPhoneInCloud, f_saveProfileToCloud, f_ensureCloudAvatarUrl } from '../../utils/f_profileApi.js'

const step = ref('phone')
const phone = ref('')
const avatarUrl = ref('')
const nickName = ref('')
const lookupLoading = ref(false)
const saving = ref(false)

const phoneOk = computed(() => /^1\d{10}$/.test(String(phone.value || '').trim()))

const canRegister = computed(() => {
	return !!(avatarUrl.value && nickName.value.trim() && phoneOk.value)
})

onShow(() => {
	const u = f_getStoredUser()
	if (u && u.f_phone && u.f_nick_name && u.f_avatar_url) {
		uni.reLaunch({ url: '/pages/index/index' })
	}
})

function onPhoneInput(e) {
	phone.value = String(e.detail.value || '').replace(/\D/g, '').slice(0, 11)
}

function backToPhone() {
	step.value = 'phone'
	avatarUrl.value = ''
	nickName.value = ''
}

async function onPhoneConfirm() {
	if (!phoneOk.value || lookupLoading.value) return
	lookupLoading.value = true
	try {
		const f_phone = String(phone.value).trim()
		const res = await f_lookupPhoneInCloud({ f_phone })
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '查询失败', icon: 'none' })
			return
		}
		const fd = body.f_data || {}
		if (fd.f_exists && fd.f_user) {
			const u = fd.f_user
			f_saveUserLocal({
				f_avatar_url: u.f_avatar_url,
				f_nick_name: u.f_nick_name,
				f_phone: u.f_phone,
				f_role: u.f_role || 'player',
				f_cloud_id: u.f_id
			})
			uni.showToast({ title: '登录成功', icon: 'success' })
			setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 400)
			return
		}
		step.value = 'register'
		uni.showToast({ title: '请完善资料完成注册', icon: 'none' })
	} catch (err) {
		console.error('[onPhoneConfirm]', err)
		uni.showToast({ title: '网络异常，请检查云函数 f_lookup_phone', icon: 'none', duration: 2800 })
	} finally {
		lookupLoading.value = false
	}
}

function onChooseAvatar(e) {
	const url = e?.detail?.avatarUrl || ''
	avatarUrl.value = url
}

function pickLocalImage() {
	uni.chooseImage({
		count: 1,
		sizeType: ['compressed'],
		sourceType: ['album', 'camera'],
		success: (res) => {
			const p = res.tempFilePaths && res.tempFilePaths[0]
			if (p) avatarUrl.value = p
		}
	})
}

function onNickInput(e) {
	nickName.value = e.detail.value || ''
}

function onNickBlur(e) {
	const v = (e.detail.value || nickName.value || '').trim()
	nickName.value = v
}

async function doRegister() {
	if (!canRegister.value || saving.value) return
	saving.value = true
	try {
		let f_avatar_url = avatarUrl.value
		// #ifndef MP-WEIXIN
		f_avatar_url = await f_ensureCloudAvatarUrl(f_avatar_url)
		// #endif

		const payload = {
			f_avatar_url,
			f_nick_name: nickName.value.trim(),
			f_phone: String(phone.value).trim()
		}

		const res = await f_saveProfileToCloud(payload)
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '注册失败', icon: 'none' })
			return
		}

		const fd = body.f_data || {}
		f_saveUserLocal({
			...payload,
			f_role: fd.f_role || 'player',
			f_cloud_id: fd.f_id,
			f_cloud_action: fd.f_action
		})
		uni.showToast({ title: '注册成功', icon: 'success' })
		setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 400)
	} catch (err) {
		console.error('[doRegister]', err)
		uni.showToast({ title: '请检查 uniCloud 与云函数 f_save_profile', icon: 'none', duration: 2800 })
	} finally {
		saving.value = false
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 48rpx 40rpx 80rpx;
	box-sizing: border-box;
	background: linear-gradient(180deg, #e8f5e9 0%, #f5f7fa 35%, #f5f7fa 100%);
}

.hero {
	margin-bottom: 40rpx;
}

.brand {
	display: block;
	font-size: 44rpx;
	font-weight: 700;
	color: #1a1a1a;
	letter-spacing: 2rpx;
}

.sub {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #6b7280;
	line-height: 1.45;
}

.card {
	background: #fff;
	border-radius: 24rpx;
	padding: 36rpx 32rpx;
	box-shadow: 0 12rpx 40rpx rgba(15, 23, 42, 0.06);
}

.block {
	display: block;
}

.phone-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 24rpx;
	padding-bottom: 20rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.phone-fixed {
	font-size: 28rpx;
	color: #111827;
	font-weight: 500;
}

.link {
	font-size: 26rpx;
	color: #059669;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
}

.avatar-row {
	align-items: flex-start;
}

.label {
	font-size: 28rpx;
	color: #374151;
	width: 140rpx;
	flex-shrink: 0;
}

.field {
	flex: 1;
	font-size: 28rpx;
	color: #111827;
}

.avatar-btn {
	margin: 0;
	padding: 0;
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	overflow: hidden;
	background: #f3f4f6;
	border: 2rpx solid #e5e7eb;
	display: flex;
	align-items: center;
	justify-content: center;
}

.avatar-btn::after {
	border: none;
}

.avatar {
	width: 120rpx;
	height: 120rpx;
}

.avatar.large {
	width: 160rpx;
	height: 160rpx;
	border-radius: 16rpx;
	margin-top: 16rpx;
}

.avatar-side {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}

.pick-btn {
	margin: 0;
	font-size: 26rpx;
	padding: 12rpx 24rpx;
	background: #f3f4f6;
	color: #374151;
	border-radius: 12rpx;
}

.pick-btn::after {
	border: none;
}

.avatar-placeholder {
	font-size: 22rpx;
	color: #9ca3af;
	padding: 8rpx;
	text-align: center;
}

.btn {
	margin-top: 32rpx;
	border-radius: 999rpx;
	font-size: 30rpx;
	height: 88rpx;
	line-height: 88rpx;
}

.btn::after {
	border: none;
}

.primary {
	background: #07c160;
	color: #fff;
}

.enter {
	background: #111827;
	color: #fff;
}

.enter[disabled],
.primary[disabled] {
	opacity: 0.45;
}

.tips {
	display: block;
	margin-top: 28rpx;
	font-size: 22rpx;
	color: #9ca3af;
	line-height: 1.65;
}
</style>
