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
					placeholder="输入管理员提供的 4 位房间号"
					@input="onRoomCode"
				/>
			</view>
			<button class="btn" :disabled="!canSubmit || joining" :loading="joining" @click="submit">
				加入房间
			</button>
			<text class="tips">将写入集合 f_room_member，与 f_room 中房间号关联。</text>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { f_getStoredUser, f_saveUserLocal } from '../../utils/f_userStorage.js'
import { f_joinRoomInCloud } from '../../utils/f_roomApi.js'

const roomCode = ref('')
const joining = ref(false)

const canSubmit = computed(() => /^\d{4}$/.test(String(roomCode.value || '').replace(/\D/g, '').slice(0, 4)))

function onRoomCode(e) {
	roomCode.value = String(e.detail.value || '').replace(/\D/g, '').slice(0, 4)
}

async function submit() {
	const u = f_getStoredUser()
	if (!u || !u.f_uid) {
		uni.showToast({ title: '请先登录', icon: 'none' })
		return
	}
	if (!canSubmit.value || joining.value) return
	joining.value = true
	try {
		const f_room_code = String(roomCode.value).replace(/\D/g, '').slice(0, 4)
		const res = await f_joinRoomInCloud({
			f_room_code,
			f_player_uid: u.f_uid,
			f_nick_name: u.f_nick_name || ''
		})
		const body = res.result || {}
		if (body.f_code !== 0) {
			uni.showToast({ title: body.f_message || '加入失败', icon: 'none' })
			return
		}
		f_saveUserLocal({ f_current_room_code: f_room_code })
		const act = body.f_data && body.f_data.f_action
		uni.showToast({
			title: act === 'already_in' ? '已在该房间中' : '加入成功',
			icon: 'success'
		})
		setTimeout(
			() => uni.redirectTo({ url: '/pages/f_game/play?code=' + encodeURIComponent(f_room_code) }),
			350
		)
	} catch (err) {
		console.error(err)
		uni.showToast({ title: '请上传云函数 f_join_room', icon: 'none' })
	} finally {
		joining.value = false
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
	padding: 22rpx 0;
	border-bottom: 1rpx solid #3f341a;
}

.label {
	width: 160rpx;
	font-size: 28rpx;
	color: #dcc58a;
}

.field {
	flex: 1;
	font-size: 28rpx;
	color: #f5e6b3;
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
