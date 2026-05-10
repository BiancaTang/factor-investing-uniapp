/**
 * 大屏动画编排引擎
 * 缓动函数、颜色工具、状态机辅助
 */

/** 缓动函数 */
export const Easing = {
	easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
	easeOutBounce: (t) => {
		const n1 = 7.5625, d1 = 2.75
		if (t < 1 / d1) return n1 * t * t
		if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
		if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
		return n1 * (t -= 2.625 / d1) * t + 0.984375
	},
	easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
	linear: (t) => t
}

/**
 * 数字渐变动画
 * @param {number} from - 起始值
 * @param {number} to - 目标值
 * @param {number} duration - 动画时长(ms)
 * @param {Function} onUpdate - 每帧回调
 * @param {string} easing - 缓动函数名
 */
export function animateNumber(from, to, duration, onUpdate, easing = 'easeOutCubic') {
	const startTime = performance.now()
	const easeFn = Easing[easing] || Easing.easeOutCubic
	const diff = to - from

	function tick(now) {
		const elapsed = now - startTime
		const progress = Math.min(elapsed / duration, 1)
		const eased = easeFn(progress)
		const current = from + diff * eased
		onUpdate(current)
		if (progress < 1) {
			requestAnimationFrame(tick)
		}
	}
	requestAnimationFrame(tick)
}

/**
 * 10因子环形图布局计算
 * 每个因子在圆环上的角度和坐标
 */
export function computeFactorRingLayout(radius, centerX, centerY) {
	const factors = [
		{ key: 'fac_size', internal: 'size', label: '规模' },
		{ key: 'fac_beta', internal: 'beta', label: '贝塔' },
		{ key: 'fac_momentum', internal: 'momentum', label: '动量' },
		{ key: 'fac_non_linear_size', internal: 'non_linear_size', label: '非线性规模' },
		{ key: 'fac_book_to_price', internal: 'book_to_price', label: '市净' },
		{ key: 'fac_earnings_yield', internal: 'earnings_yield', label: '盈利收益' },
		{ key: 'fac_growth', internal: 'growth', label: '成长' },
		{ key: 'fac_leverage', internal: 'leverage', label: '杠杆' },
		{ key: 'fac_liquidity', internal: 'liquidity', label: '流动性' },
		{ key: 'fac_residual_volatility', internal: 'residual_volatility', label: '残差波动' }
	]

	const angleStep = (Math.PI * 2) / factors.length
	const startAngle = -Math.PI / 2 // 从顶部开始

	return factors.map((f, i) => {
		const angle = startAngle + i * angleStep
		return {
			...f,
			angle,
			x: centerX + Math.cos(angle) * radius,
			y: centerY + Math.sin(angle) * radius,
			// 扇区起始角度（用于环形图）
			sectorStart: (angle * 180 / Math.PI) - (angleStep * 180 / Math.PI / 2),
			sectorEnd: (angle * 180 / Math.PI) + (angleStep * 180 / Math.PI / 2)
		}
	})
}

/** 粒子系统 */
export class ParticleSystem {
	constructor(canvas) {
		this.canvas = canvas
		this.ctx = canvas.getContext('2d')
		this.particles = []
		this.running = false
		this.resize()
		window.addEventListener('resize', () => this.resize())
	}

	resize() {
		const rect = this.canvas.parentElement?.getBoundingClientRect()
		if (rect) {
			this.canvas.width = rect.width
			this.canvas.height = rect.height
		}
	}

	emit(x, y, count = 30, options = {}) {
		const {
			color = '#d4af37',
			minSpeed = 2,
			maxSpeed = 6,
			life = 1000,
			gravity = 0.05,
			spread = Math.PI * 2
		} = options

		for (let i = 0; i < count; i++) {
			const angle = Math.random() * spread - spread / 2 - Math.PI / 2
			const speed = minSpeed + Math.random() * (maxSpeed - minSpeed)
			this.particles.push({
				x, y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				life: life + Math.random() * 200,
				maxLife: life,
				color,
				gravity,
				size: 2 + Math.random() * 3,
				alpha: 1
			})
		}
	}

	burst(x, y, color, count = 50) {
		this.emit(x, y, count, { color, minSpeed: 3, maxSpeed: 8, life: 1200 })
	}

	drift(x, y, color, count = 30) {
		this.emit(x, y, count, {
			color,
			minSpeed: 0.5,
			maxSpeed: 2,
			life: 2000,
			gravity: -0.02,
			spread: Math.PI
		})
	}

	start() {
		if (this.running) return
		this.running = true
		this.loop()
	}

	stop() {
		this.running = false
	}

	loop() {
		if (!this.running) return
		const { ctx, canvas } = this
		ctx.clearRect(0, 0, canvas.width, canvas.height)

		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i]
			p.x += p.vx
			p.y += p.vy
			p.vy += p.gravity
			p.life -= 16
			p.alpha = Math.max(0, p.life / p.maxLife)

			if (p.life <= 0) {
				this.particles.splice(i, 1)
				continue
			}

			ctx.globalAlpha = p.alpha
			ctx.fillStyle = p.color
			ctx.beginPath()
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
			ctx.fill()
		}

		ctx.globalAlpha = 1
		requestAnimationFrame(() => this.loop())
	}

	clear() {
		this.particles = []
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
	}
}

/** 格式化净值显示 */
export function formatNav(nav) {
	const n = Number(nav)
	if (n >= 10) return n.toFixed(2)
	if (n >= 1) return n.toFixed(4)
	return n.toFixed(4)
}

/** 排名变化方向 */
export function rankChangeArrow(current, previous) {
	if (previous == null) return ''
	if (current < previous) return '↑'
	if (current > previous) return '↓'
	return '→'
}

/** 排名变化颜色 */
export function rankChangeColor(current, previous) {
	if (previous == null) return '#888'
	if (current < previous) return '#4caf50'
	if (current > previous) return '#f44336'
	return '#888'
}
