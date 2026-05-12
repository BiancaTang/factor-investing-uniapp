<template>
	<view class="page" />
</template>

<script>
/** 兼容旧链接：选角实况已合并到「角色展示」页 */
export default {
	onLoad(options) {
		const q = (options && (options.roomId || options.code || options.room)) || ''
		const code = String(q || '')
			.replace(/\D/g, '')
			.slice(0, 4)
		if (!/^\d{4}$/.test(code)) {
			uni.showToast({ title: '请使用 ?code=四位房间号', icon: 'none' })
			return
		}
		uni.redirectTo({
			url: '/pages/f_display/role-showcase?code=' + encodeURIComponent(code)
		})
	}
}
</script>

<style scoped>
.page {
	min-height: 10vh;
	background: #0b0b0d;
}
</style>
