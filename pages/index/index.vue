<template>

	<view class="content">

		<image v-if="user && user.f_avatar_url" class="avatar" :src="user.f_avatar_url" mode="aspectFill" />

		<image v-else class="logo" src="/static/logo.png" />

		<view class="text-area">

			<text class="title">{{ user ? user.f_nick_name || '已登录' : title }}</text>


			<text v-if="user" class="role">{{ roleLabel }}</text>

			<text v-if="user && user.f_current_room_code" class="room-hint">当前房间 {{ user.f_current_room_code }}</text>

		</view>



		<view v-if="user" class="actions">

			<button v-if="isAdmin" class="action primary" @click="goCreateRoom">创建房间</button>

			<button v-if="isAdmin" class="action pdf" @click="goScorePdf">导出评分 PDF</button>

			<button v-if="isAdmin" class="action obs" @click="goRoomObs">房间观测</button>

			<button v-if="user && user.f_current_room_code" class="action secondary" @click="goRoleSelect">选择角色</button>

			<button v-if="user && user.f_current_room_code" class="action game" @click="goPlayDirect">{{ isAdmin ? '直接进入游戏' : '进入游戏' }}</button>

			<button v-if="isAdmin" class="action danger" @click="goDataPurge">清空数据库</button>

			<button class="action" :class="isAdmin ? 'secondary' : 'primary'" @click="goJoinRoom">加入房间</button>

		</view>



		<button v-if="user" class="out" @click="logout">退出并重新登录</button>

		<f-factor-intro-fab />
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

			goRoleSelect() {
				const c = this.user && this.user.f_current_room_code
				if (!c) {
					uni.showToast({ title: '请先加入房间', icon: 'none' })
					return
				}
				const q = '?code=' + encodeURIComponent(c)
				uni.navigateTo({ url: '/pages/f_role_select/index' + q })
			},

			goPlayDirect() {

				const c = this.user && this.user.f_current_room_code
				if (!c) {
					uni.showToast({ title: '请先加入房间', icon: 'none' })
					return
				}
				const q = '?code=' + encodeURIComponent(c)
				uni.navigateTo({ url: '/pages/f_game/play' + q })

			},

			goDataPurge() {

				uni.navigateTo({ url: '/pages/f_admin/data_purge' })

			},

			goJoinRoom() {

				uni.navigateTo({ url: '/pages/f_room/join' })

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

		color: #f5e6b3;

	}



	.sub {

		font-size: 24rpx;

		color: #bfa56a;

		text-align: center;

	}



	.role {

		font-size: 26rpx;

		color: #e8d7a2;

		margin-top: 8rpx;

	}



	.room-hint {

		font-size: 24rpx;

		color: #d4af37;

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

		background: linear-gradient(135deg, #d4af37, #8f6b1e);
		color: #111;

	}



	.action.secondary {

		background: #2a2415;
		color: #f5e6b3;
		border: 1rpx solid #6d5825;

	}

	.action.game {

		background: #201b10;
		color: #f3d87a;
		border: 1rpx solid #7f6630;

	}

	.action.pdf {

		background: #201b10;
		color: #f3d87a;
		border: 1rpx solid #7f6630;

	}

	.action.obs {

		background: #201b10;
		color: #f3d87a;
		border: 1rpx solid #7f6630;

	}

	.action.danger {

		background: #2a1515;
		color: #f0c2a8;
		border: 1rpx solid #7a3a2d;

	}



	.out {

		margin-top: 40rpx;

		font-size: 28rpx;

		color: #d8c083;
		background: #2a2415;
		border: 1rpx solid #6d5825;

		border-radius: 999rpx;

		padding: 0 40rpx;

	}



	.out::after {

		border: none;

	}

</style>

