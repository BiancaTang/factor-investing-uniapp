<template>
	<view class="page">
		<view class="card">
			<text class="h1">导出评分 PDF</text>
			<text class="tip">
				生成 PDF：房间内每位玩家、每一轮结束时的三张折线图（净值 / 因子累积收益 / 收益归因），便于批改。需管理员权限；请先上传云函数
				f_export_score_pdf 并安装依赖 pdf-lib。
			</text>
			<view class="field">
				<text class="lab">房间号（4 位）</text>
				<input class="inp" v-model="roomCode" type="number" maxlength="4" placeholder="如与当前房间一致可自动填入" />
			</view>
			<view class="row-check">
				<switch :checked="requireAllDone" color="#111827" @change="onSwitch" />
				<text class="ck">仅当所有玩家都完成全部轮次后才允许导出</text>
			</view>
			<button class="btn" type="primary" :loading="loading" :disabled="loading" @click="onExport">生成并打开 PDF</button>
			<text class="hint">
				若无法下载：请在微信公众平台 → 开发 → 开发管理 → 服务器域名 → downloadFile 合法域名 中添加 uniCloud 文件下载域名。
			</text>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { f_getStoredUser } from '../../utils/f_userStorage.js'
import { f_isAdmin } from '../../utils/f_role.js'
import { f_exportScorePdfInCloud } from '../../utils/f_scorePdfApi.js'

const roomCode = ref('')
const requireAllDone = ref(false)
const loading = ref(false)

function onSwitch(e) {
	requireAllDone.value = !!(e.detail && e.detail.value)
}

onLoad((q) => {
	const u = f_getStoredUser()
	if (!u || !f_isAdmin(u)) {
		uni.showToast({ title: '仅管理员', icon: 'none' })
		setTimeout(() => uni.navigateBack(), 600)
		return
	}
	if (q && q.code) roomCode.value = String(q.code)
	else if (u.f_current_room_code) roomCode.value = u.f_current_room_code
})

async function onExport() {
	const u = f_getStoredUser()
	if (!u || !u.f_phone || !f_isAdmin(u)) return
	const rc = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
	if (!/^\d{4}$/.test(rc)) {
		uni.showToast({ title: '请输入 4 位房间号', icon: 'none' })
		return
	}
	loading.value = true
	try {
		const res = await f_exportScorePdfInCloud({
			f_admin_phone: u.f_phone,
			f_room_code: rc,
			f_require_all_done: requireAllDone.value
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '失败', icon: 'none', duration: 3500 })
			return
		}
		const fd = body.f_data || {}
		const url = fd.f_temp_url
		console.log('[score_pdf] f_data:', fd)
		console.log('[score_pdf] f_temp_url:', url)
		if (!url) {
			uni.showToast({ title: '未拿到下载地址', icon: 'none' })
			return
		}
		uni.showLoading({ title: '下载中' })
		uni.downloadFile({
			url,
			success: (dr) => {
				uni.hideLoading()
				if (dr.statusCode === 200 && dr.tempFilePath) {
					uni.openDocument({
						filePath: dr.tempFilePath,
						showMenu: true
					})
				} else {
					uni.showToast({ title: '下载失败', icon: 'none' })
				}
			},
			fail: () => {
				uni.hideLoading()
				uni.showToast({ title: 'downloadFile 失败，请检查域名白名单', icon: 'none' })
			}
		})
	} catch (e) {
		console.error(e)
		uni.showToast({ title: '云函数未上传或异常', icon: 'none' })
	} finally {
		loading.value = false
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 24rpx;
	background: #f3f4f6;
	box-sizing: border-box;
}
.card {
	background: #fff;
	border-radius: 16rpx;
	padding: 28rpx;
}
.h1 {
	font-size: 34rpx;
	font-weight: 600;
	display: block;
	margin-bottom: 16rpx;
}
.tip {
	font-size: 24rpx;
	color: #6b7280;
	line-height: 1.55;
	display: block;
	margin-bottom: 24rpx;
}
.field {
	margin-bottom: 20rpx;
}
.lab {
	font-size: 28rpx;
	color: #374151;
	display: block;
	margin-bottom: 8rpx;
}
.inp {
	border: 1rpx solid #e5e7eb;
	border-radius: 12rpx;
	padding: 20rpx;
	font-size: 28rpx;
}
.row-check {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 28rpx;
}
.ck {
	font-size: 24rpx;
	color: #4b5563;
}
.btn {
	margin-bottom: 20rpx;
}
.hint {
	font-size: 22rpx;
	color: #9ca3af;
	line-height: 1.5;
}
</style>
