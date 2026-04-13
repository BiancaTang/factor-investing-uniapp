<template>

	<view class="content">

		<image v-if="user && user.f_avatar_url" class="avatar" :src="user.f_avatar_url" mode="aspectFill" />

		<image v-else class="logo" src="/static/logo.png" />

		<view class="text-area">

			<text class="title">{{ user ? user.f_nick_name || '已登录' : title }}</text>

			<text v-if="user && user.f_phone" class="sub">手机号 {{ user.f_phone }}</text>

			<text v-if="user" class="role">{{ roleLabel }}</text>

			<text v-if="user && user.f_current_room_code" class="room-hint">当前房间 {{ user.f_current_room_code }}</text>

		</view>



		<view v-if="user" class="actions">

			<button v-if="isAdmin" class="action primary" @click="goCreateRoom">创建房间</button>

			<button v-if="isAdmin" class="action pdf" @click="goScorePdf">导出评分 PDF</button>

			<button v-if="isAdmin" class="action obs" @click="goRoomObs">房间观测</button>

			<button v-if="isAdmin" class="action danger" @click="goDataPurge">清空数据库</button>

			<button class="action" :class="isAdmin ? 'secondary' : 'primary'" @click="goJoinRoom">加入房间</button>

			<button v-if="user.f_current_room_code" class="action game" @click="goGame">进入游戏</button>

		</view>



		<button v-if="user" class="out" @click="logout">退出并重新登录</button>

	</view>

</template>



<script>

	import { f_getStoredUser, f_clearUserLocal } from '../../utils/f_userStorage.js'

	import { f_roleLabel, f_isAdmin } from '../../utils/f_role.js'



	export default {

		data() {

			return {

				title: '因子投资',

				user: null

			}

		},

		computed: {

			roleLabel() {

				return f_roleLabel(this.user)

			},

			isAdmin() {

				return f_isAdmin(this.user)

			}

		},

		onShow() {

			this.user = f_getStoredUser()

		},

		methods: {

			goCreateRoom() {

				uni.navigateTo({ url: '/pages/f_room/create' })

			},

			goScorePdf() {

				const c = this.user && this.user.f_current_room_code

				const q = c ? '?code=' + encodeURIComponent(c) : ''

				uni.navigateTo({ url: '/pages/f_room/score_pdf' + q })

			},

			goRoomObs() {

				const c = this.user && this.user.f_current_room_code

				const q = c ? '?code=' + encodeURIComponent(c) : ''

				uni.navigateTo({ url: '/pages/f_room/obs' + q })

			},

			goDataPurge() {

				uni.navigateTo({ url: '/pages/f_admin/data_purge' })

			},

			goJoinRoom() {

				uni.navigateTo({ url: '/pages/f_room/join' })

			},

			goGame() {

				const c = this.user && this.user.f_current_room_code

				if (!c) return

				uni.navigateTo({ url: '/pages/f_game/play?code=' + encodeURIComponent(c) })

			},

			logout() {

				f_clearUserLocal()

				this.user = null

				uni.reLaunch({ url: '/pages/login/login' })

			}

		}

	}

</script>



<style>

	.content {

		display: flex;

		flex-direction: column;

		align-items: center;

		justify-content: center;

		min-height: 60vh;

		padding: 40rpx;

	}



	.logo {

		height: 200rpx;

		width: 200rpx;

		margin-top: 80rpx;

		margin-bottom: 40rpx;

	}



	.avatar {

		width: 160rpx;

		height: 160rpx;

		border-radius: 50%;

		margin-top: 80rpx;

		margin-bottom: 40rpx;

	}



	.text-area {

		display: flex;

		flex-direction: column;

		align-items: center;

		gap: 16rpx;

	}



	.title {

		font-size: 36rpx;

		color: #1f2937;

	}



	.sub {

		font-size: 24rpx;

		color: #6b7280;

		text-align: center;

	}



	.role {

		font-size: 26rpx;

		color: #111827;

		margin-top: 8rpx;

	}



	.room-hint {

		font-size: 24rpx;

		color: #059669;

		margin-top: 4rpx;

	}



	.actions {

		width: 100%;

		max-width: 560rpx;

		margin-top: 48rpx;

		display: flex;

		flex-direction: column;

		gap: 24rpx;

	}



	.action {

		height: 88rpx;

		line-height: 88rpx;

		border-radius: 999rpx;

		font-size: 30rpx;

	}



	.action::after {

		border: none;

	}



	.action.primary {

		background: #111827;

		color: #fff;

	}



	.action.secondary {

		background: #ecfdf5;

		color: #047857;

		border: 1rpx solid #a7f3d0;

	}

	.action.game {

		background: #fef3c7;

		color: #92400e;

		border: 1rpx solid #fcd34d;

	}

	.action.pdf {

		background: #ede9fe;

		color: #5b21b6;

		border: 1rpx solid #c4b5fd;

	}

	.action.obs {

		background: #e0f2fe;

		color: #0369a1;

		border: 1rpx solid #7dd3fc;

	}

	.action.danger {

		background: #fef2f2;

		color: #991b1b;

		border: 1rpx solid #fecaca;

	}



	.out {

		margin-top: 40rpx;

		font-size: 28rpx;

		color: #6b7280;

		background: #f3f4f6;

		border-radius: 999rpx;

		padding: 0 40rpx;

	}



	.out::after {

		border: none;

	}

</style>

