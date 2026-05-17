<template>
	<view class="page">
		<view class="card">
			<view class="row">
				<text class="label">房间号</text>
				<input
					class="field"
					type="number"
					maxlength="4"
					:value="roomCode"
					placeholder="4 位数字，如 1001"
					@input="onRoomCode"
				/>
			</view>
			<view class="row">
				<text class="label">轮次</text>
				<text class="hint">默认无限轮（由管理员手动结束游戏）</text>
			</view>
			<view class="row switch-row">
				<text class="label">Banker 介入</text>
				<view class="switch-wrap">
					<text class="hint">{{ bankerIntervene ? '有后台控制局面' : '无' }}</text>
					<switch :checked="bankerIntervene" color="#07c160" @change="onBankerChange" />
				</view>
			</view>

			<button class="btn" :disabled="!canSubmit || saving" :loading="saving" @click="submit">
				保存房间
			</button>
			<text class="tips">数据写入集合 f_room；房间号全局不可重复。玩家席固定最多 10 人（不含庄家），满员或管理员锁定后不可再加入。</text>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { f_getStoredUser, f_saveUserLocal } from '../../utils/f_userStorage.js'
import { f_isAdmin } from '../../utils/f_role.js'
import { f_createRoomInCloud } from '../../utils/f_roomApi.js'

const roomCode = ref('')
const bankerIntervene = ref(false)
const saving = ref(false)

onLoad(() => {
	const u = f_getStoredUser()
	if (!u || !f_isAdmin(u)) {
		uni.showToast({ title: '仅管理员可访问', icon: 'none' })
		setTimeout(() => uni.navigateBack(), 800)
	}
})

const canSubmit = computed(() => {
	const code = String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)
	return code.length === 4
})

function onRoomCode(e) {
	roomCode.value = String(e.detail.value || '').replace(/\D/g, '').slice(0, 4)
}

function onBankerChange(e) {
	bankerIntervene.value = !!(e.detail && e.detail.value)
}

async function submit() {
	const u = f_getStoredUser()
	if (!u || !f_isAdmin(u) || !u.f_uid) {
		uni.showToast({ title: '请以管理员身份登录', icon: 'none' })
		return
	}
	if (!canSubmit.value || saving.value) return
	saving.value = true
	try {
		const f_room_code = String(roomCode.value).replace(/\D/g, '').slice(0, 4)
		const res = await f_createRoomInCloud({
			f_admin_uid: u.f_uid,
			f_room_code,
			f_round_count: 0,
			f_banker_intervene: bankerIntervene.value
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '保存失败', icon: 'none' })
			return
		}
		f_saveUserLocal({ f_current_room_code: f_room_code })
		uni.showToast({ title: '房间已创建', icon: 'success' })
		setTimeout(() => {
			uni.redirectTo({ url: '/pages/f_room/obs?code=' + encodeURIComponent(f_room_code) })
		}, 400)
	} catch (err) {
		console.error(err)
		uni.showToast({ title: '请上传云函数 f_create_room', icon: 'none' })
	} finally {
		saving.value = false
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 32rpx;
	background: #0b0b0d;
	box-sizing: border-box;
}

.card {
	background: #161616;
	border: 1rpx solid #5b4a20;
	border-radius: 20rpx;
	padding: 28rpx 24rpx;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 22rpx 0;
	border-bottom: 1rpx solid #3f341a;
}

.switch-row {
	align-items: center;
}

.label {
	width: 200rpx;
	font-size: 28rpx;
	color: #dcc58a;
	flex-shrink: 0;
}

.field {
	flex: 1;
	font-size: 28rpx;
	color: #f5e6b3;
}

.switch-wrap {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 16rpx;
}

.hint {
	font-size: 24rpx;
	color: #bfa56a;
}

.btn {
	margin-top: 40rpx;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #d4af37, #8f6b1e);
	color: #111;
	font-size: 30rpx;
}

.btn::after {
	border: none;
}

.btn[disabled] {
	opacity: 0.45;
}

.tips {
	display: block;
	margin-top: 24rpx;
	font-size: 22rpx;
	color: #bfa56a;
	line-height: 1.6;
}
</style>
