<template>
	<view class="page">
		<view class="hero">
			<text class="brand">因子投资</text>
			<text class="sub">{{ stepSubTitle }}</text>
		</view>

		<view class="card">
			<!-- 第一步：仅 ID -->
			<view v-if="step === 'phone'" class="block">
				<view class="row">
					<text class="label">id</text>
					<input
						class="field"
						type="text"
						maxlength="40"
						:value="phone"
						placeholder="请输入你的 ID"
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
				<text class="tips">将查询云数据库表 f_user_profile 是否已有该 ID。</text>
			</view>

			<!-- 老用户：重传头像（wxfile 等无效地址） -->
			<view v-else-if="step === 'avatar-fix'" class="block">
				<view class="phone-bar">
					<text class="phone-fixed">ID {{ phone }}</text>
				</view>
				<text class="warn-tip">当前头像未上传到云存储，大屏无法显示。请重新选择头像。</text>
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
				<button
					class="btn enter"
					:disabled="!avatarUrl || saving"
					:loading="saving"
					@click="doUpdateAvatar"
				>
					保存头像
				</button>
			</view>

			<!-- 第二步：未注册时填写资料 -->
			<view v-else class="block">
				<view class="phone-bar">
					<text class="phone-fixed">ID {{ phone }}</text>
					<text class="link" @click="backToPhone">更换 ID</text>
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
		<f-factor-intro-fab />
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { f_getStoredUser, f_saveUserLocal } from '../../utils/f_userStorage.js'
import {
	f_lookupPhoneInCloud,
	f_saveProfileToCloud,
	f_ensureCloudAvatarUrl,
	f_isBrokenAvatarUrl,
	f_isCloudStoredAvatarUrl
} from '../../utils/f_profileApi.js'

const step = ref('phone')
const phone = ref('')
const avatarUrl = ref('')
const nickName = ref('')
const lookupLoading = ref(false)
const saving = ref(false)

const phoneOk = computed(() => !!String(phone.value || '').trim())

const canRegister = computed(() => {
	return !!(avatarUrl.value && nickName.value.trim() && phoneOk.value)
})

const stepSubTitle = computed(() => {
	if (step.value === 'phone') return '请输入ID'
	if (step.value === 'avatar-fix') return '重新上传头像到云存储'
	return '完善微信头像与昵称以完成注册'
})

onLoad((q) => {
	if (q && String(q.fix) === '1') {
		const u = f_getStoredUser()
		if (u && u.f_phone) {
			step.value = 'avatar-fix'
			phone.value = String(u.f_phone)
			nickName.value = String(u.f_nick_name || '')
			avatarUrl.value = ''
		}
	}
})

onShow(() => {
	const u = f_getStoredUser()
	if (u && u.f_phone && u.f_nick_name && u.f_avatar_url && !f_isBrokenAvatarUrl(u.f_avatar_url)) {
		if (step.value === 'phone') {
			uni.reLaunch({ url: '/pages/index/index' })
		}
	}
})

function onPhoneInput(e) {
	phone.value = String(e.detail.value || '').trim().slice(0, 40)
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
			if (f_isBrokenAvatarUrl(u.f_avatar_url)) {
				step.value = 'avatar-fix'
				nickName.value = u.f_nick_name || ''
				avatarUrl.value = ''
				uni.showToast({ title: '请重新上传头像', icon: 'none', duration: 2400 })
				return
			}
			f_saveUserLocal({
				f_uid: u.f_uid || '',
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
		const uploaded = await f_uploadAvatarForProfile(avatarUrl.value)
		if (!uploaded) return

		const payload = {
			f_avatar_url: uploaded,
			f_nick_name: nickName.value.trim(),
			f_phone: String(phone.value).trim()
		}

		await f_finishProfileSave(payload)
	} catch (err) {
		console.error('[doRegister]', err)
		uni.showToast({ title: '请检查 uniCloud 与云函数 f_save_profile', icon: 'none', duration: 2800 })
	} finally {
		saving.value = false
	}
}

async function doUpdateAvatar() {
	if (!avatarUrl.value || saving.value) return
	if (!nickName.value.trim()) {
		uni.showToast({ title: '缺少昵称，请重新登录', icon: 'none' })
		return
	}
	saving.value = true
	try {
		const uploaded = await f_uploadAvatarForProfile(avatarUrl.value)
		if (!uploaded) return

		const payload = {
			f_avatar_url: uploaded,
			f_nick_name: nickName.value.trim(),
			f_phone: String(phone.value).trim()
		}
		await f_finishProfileSave(payload)
	} catch (err) {
		console.error('[doUpdateAvatar]', err)
		uni.showToast({ title: '头像更新失败', icon: 'none' })
	} finally {
		saving.value = false
	}
}

async function f_uploadAvatarForProfile(localUrl) {
	const uploaded = await f_ensureCloudAvatarUrl(localUrl)
	if (!uploaded || !f_isCloudStoredAvatarUrl(uploaded)) {
		uni.showToast({
			title: '头像上传云存储失败，请重选',
			icon: 'none',
			duration: 2800
		})
		return ''
	}
	return uploaded
}

async function f_finishProfileSave(payload) {
	const res = await f_saveProfileToCloud(payload)
	const body = res.result || {}
	if (body.f_code !== 0) {
		uni.showToast({ title: body.f_message || '保存失败', icon: 'none' })
		return
	}
	const fd = body.f_data || {}
	f_saveUserLocal({
		...payload,
		f_uid: fd.f_uid || '',
		f_role: fd.f_role || 'player',
		f_cloud_id: fd.f_id,
		f_cloud_action: fd.f_action
	})
	uni.showToast({ title: '保存成功', icon: 'success' })
	setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 400)
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 48rpx 40rpx 80rpx;
	box-sizing: border-box;
	background: linear-gradient(180deg, #090909 0%, #111111 40%, #15120a 100%);
}

.hero {
	margin-bottom: 40rpx;
}

.brand {
	display: block;
	font-size: 44rpx;
	font-weight: 700;
	color: #f5e6b3;
	letter-spacing: 2rpx;
}

.sub {
	display: block;
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #bfa56a;
	line-height: 1.45;
}

.card {
	background: #161616;
	border: 1rpx solid #5b4a20;
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
	border-bottom: 1rpx solid #3f341a;
}

.phone-fixed {
	font-size: 28rpx;
	color: #f5e6b3;
	font-weight: 500;
}

.link {
	font-size: 26rpx;
	color: #d4af37;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #3f341a;
}

.avatar-row {
	align-items: flex-start;
}

.label {
	font-size: 28rpx;
	color: #dcc58a;
	width: 140rpx;
	flex-shrink: 0;
}

.field {
	flex: 1;
	font-size: 28rpx;
	color: #f5e6b3;
}

.avatar-btn {
	margin: 0;
	padding: 0;
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	overflow: hidden;
	background: #222;
	border: 2rpx solid #6d5825;
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
	background: #2a2415;
	color: #f5e6b3;
	border-radius: 12rpx;
}

.pick-btn::after {
	border: none;
}

.avatar-placeholder {
	font-size: 22rpx;
	color: #bfa56a;
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
	background: linear-gradient(135deg, #d4af37, #8f6b1e);
	color: #111;
}

.enter {
	background: #242424;
	color: #f5e6b3;
	border: 1rpx solid #6d5825;
}

.enter[disabled],
.primary[disabled] {
	opacity: 0.45;
}

.tips {
	display: block;
	margin-top: 28rpx;
	font-size: 22rpx;
	color: #bfa56a;
	line-height: 1.65;
}

.warn-tip {
	display: block;
	font-size: 24rpx;
	color: #e8b86d;
	line-height: 1.5;
	margin-bottom: 20rpx;
	padding: 16rpx 20rpx;
	background: rgba(232, 184, 109, 0.08);
	border-radius: 12rpx;
	border: 1rpx solid rgba(232, 184, 109, 0.25);
}
</style>
