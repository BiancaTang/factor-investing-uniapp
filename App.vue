<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/* 全局黑金主题 */
	page {
		background: #0b0b0d;
		color: #f5e6b3;
	}

	view,
	text {
		color: inherit;
	}

	button {
		border-radius: 999rpx;
	}
</style>
