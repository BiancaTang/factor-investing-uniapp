<template>
	<view class="page">
		<view class="header">
			<text class="title">选角实况</text>
			<text class="sub">房间 {{ roomCode || '-' }} · 每 2 秒刷新</text>
		</view>
		<view class="grid">
			<view v-for="r in roles" :key="r.id" class="card" :class="{ taken: r.selectedByUid }">
				<image class="img" :src="r.image" mode="aspectFill" />
				<text class="name">{{ r.name }}</text>
				<text v-if="r.selectedBy" class="by">{{ r.selectedBy }}</text>
				<text v-else class="free">待选</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			roomCode: '',
			roles: [],
			timer: null
		}
	},
	onLoad(options) {
		const q = (options && (options.roomId || options.code)) || ''
		this.roomCode = String(q || '')
			.replace(/\D/g, '')
			.slice(0, 4)
		if (!/^\d{4}$/.test(this.roomCode)) {
			uni.showToast({ title: '请使用 ?code=四位房间号', icon: 'none' })
			return
		}
		this.tick()
		this.timer = setInterval(() => this.tick(), 2000)
	},
	onUnload() {
		if (this.timer) clearInterval(this.timer)
	},
	methods: {
		async tick() {
			if (!/^\d{4}$/.test(this.roomCode)) return
			try {
				const res = await uniCloud.callFunction({
					name: 'f_get_role_status',
					data: { f_room_code: this.roomCode }
				})
				const body = res.result || {}
				if (body.f_code !== 0 || !body.f_data || !body.f_data.f_roles) return
				this.roles = body.f_data.f_roles
			} catch (e) {
				console.error(e)
			}
		}
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
.header {
	margin-bottom: 24rpx;
}
.title {
	font-size: 36rpx;
	font-weight: 700;
	color: #f5e6b3;
	display: block;
}
.sub {
	font-size: 24rpx;
	color: #bfa56a;
	margin-top: 8rpx;
	display: block;
}
.grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 20rpx;
}
.card {
	background: #161616;
	border: 1rpx solid #3f341a;
	border-radius: 16rpx;
	padding: 16rpx;
	text-align: center;
}
.card.taken {
	border-color: #6d5825;
}
.img {
	width: 100%;
	height: 280rpx;
	border-radius: 12rpx;
	background: #0f0f1a;
}
.name {
	display: block;
	margin-top: 12rpx;
	font-size: 28rpx;
	font-weight: 600;
	color: #f5e6b3;
}
.by {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: #d4af37;
}
.free {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: #888;
}
</style>
