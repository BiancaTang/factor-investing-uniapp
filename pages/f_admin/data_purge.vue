<template>
	<view class="page">
		<view class="card danger-zone">
			<text class="h1">清空数据库（危险）</text>
			<text class="warn">
				将依次删除集合中的全部文档：f_game_round、f_room_member、f_room、f_user_profile。操作不可恢复，请先导出需要保留的数据。
			</text>
			<text class="lab">请在下方输入框输入：DELETE_ALL_DATA</text>
			<input
				class="inp"
				:value="confirmText"
				placeholder="DELETE_ALL_DATA"
				@input="onInput"
			/>
			<button
				class="btn purge"
				:disabled="loading || confirmText.trim() !== 'DELETE_ALL_DATA'"
				:loading="loading"
				@click="onPurgeAll"
			>
				确认清空全部业务数据
			</button>
			<text v-if="lastResult" class="result">{{ lastResult }}</text>
		</view>
		<f-factor-intro-fab />
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { f_getStoredUser } from '../../utils/f_userStorage.js'
import { f_isAdmin } from '../../utils/f_role.js'
import { f_purgeAllDataInCloud } from '../../utils/f_adminPurgeApi.js'

const confirmText = ref('')
const loading = ref(false)
const lastResult = ref('')

onLoad(() => {
	const u = f_getStoredUser()
	if (!u || !u.f_uid || !f_isAdmin(u)) {
		uni.showToast({ title: '仅管理员', icon: 'none' })
		setTimeout(() => uni.navigateBack(), 600)
	}
})

function onInput(e) {
	confirmText.value = String(e.detail.value || '')
}

async function onPurgeAll() {
	const u = f_getStoredUser()
	if (!u || !u.f_uid || !f_isAdmin(u)) return
	if (confirmText.value.trim() !== 'DELETE_ALL_DATA') return
	loading.value = true
	lastResult.value = ''
	try {
		const res = await f_purgeAllDataInCloud({
			f_admin_uid: u.f_uid,
			f_confirm: 'DELETE_ALL_DATA'
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			lastResult.value = '失败：' + (body.f_message || '未知错误')
			uni.showToast({ title: body.f_message || '失败', icon: 'none', duration: 3500 })
			return
		}
		const d = body.f_data || {}
		lastResult.value = JSON.stringify(d, null, 2)
		uni.showToast({ title: '已清空', icon: 'success' })
	} catch (e) {
		console.error(e)
		lastResult.value = String(e.message || e)
		uni.showToast({ title: '请上传云函数 f_admin_purge_collection', icon: 'none' })
	} finally {
		loading.value = false
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 24rpx;
	background: #0b0b0d;
	box-sizing: border-box;
}
.card {
	background: #161616;
	border-radius: 20rpx;
	padding: 28rpx 24rpx;
}
.danger-zone {
	border: 2rpx solid #7a3a2d;
}
.h1 {
	font-size: 32rpx;
	font-weight: 700;
	color: #f0c2a8;
	display: block;
	margin-bottom: 16rpx;
}
.warn {
	font-size: 26rpx;
	color: #dcc58a;
	line-height: 1.55;
	display: block;
	margin-bottom: 24rpx;
}
.lab {
	font-size: 24rpx;
	color: #bfa56a;
	display: block;
	margin-bottom: 12rpx;
}
.inp {
	width: 100%;
	height: 80rpx;
	padding: 0 20rpx;
	box-sizing: border-box;
	background: #222;
	border: 1rpx solid #6d5825;
	color: #f5e6b3;
	border-radius: 12rpx;
	font-size: 28rpx;
	margin-bottom: 24rpx;
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
.btn.purge {
	background: #3b1f1a;
	color: #f0c2a8;
	border: 1rpx solid #7a3a2d;
}
.result {
	display: block;
	margin-top: 20rpx;
	font-size: 22rpx;
	color: #dcc58a;
	white-space: pre-wrap;
	word-break: break-all;
}
</style>
