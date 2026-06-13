import { computed, ref, shallowRef, watch, onMounted, onUnmounted } from 'vue'
import { f_buildChartDataFromHistory } from '../utils/f_factorEngine.js'

/** 大屏决策/复盘：每轮冻结一次因子累积收益曲线数据 */
export function useDisplayFactorChartSnapshot(getProps) {
	const frozenFactorChartData = shallowRef(null)
	let snapshotRound = null

	function buildFactorChartSnapshot() {
		const p = getProps()
		if (!p.simulationPlayers?.length) return null
		const allList = p.simulationPlayers.map((row) => ({
			player_id: row.player_id != null ? String(row.player_id) : '',
			history: Array.isArray(row.history) ? row.history : [],
			label: row.label != null ? String(row.label) : String(row.player_id || '')
		}))
		return f_buildChartDataFromHistory([], '', {
			if_banker: p.ifBanker,
			f_group_count: p.fGroupCount,
			f_admin_uid: p.roomAdminUid,
			allPlayerHistories: allList,
			roleIdByPlayerId: p.roleIdByPlayerId,
			role1_10ActiveRoundByPlayerId: p.role1_10ActiveRoundByPlayerId,
			roleActiveVariantByPlayerId: p.roleActiveVariantByPlayerId,
			role11ActiveRoundByPlayerId: p.role11ActiveRoundByPlayerId,
			roundEventFactorMultipliersByRound: p.roundEventFactorMultipliersByRound
		})
	}

	function captureFactorChartSnapshot() {
		const p = getProps()
		if (snapshotRound === p.roundIndex && frozenFactorChartData.value) return
		if (snapshotRound !== p.roundIndex) {
			snapshotRound = p.roundIndex
			frozenFactorChartData.value = null
		}
		const data = buildFactorChartSnapshot()
		const fc = data?.factor_cumulative
		if (Array.isArray(fc) && fc.length) {
			frozenFactorChartData.value = data
		}
	}

	watch(() => getProps().roundIndex, captureFactorChartSnapshot, { immediate: true })

	const viewportHeight = ref(800)

	function syncViewport() {
		if (typeof window !== 'undefined') viewportHeight.value = window.innerHeight
	}

	onMounted(() => {
		syncViewport()
		if (typeof window !== 'undefined') window.addEventListener('resize', syncViewport)
	})

	onUnmounted(() => {
		if (typeof window !== 'undefined') window.removeEventListener('resize', syncViewport)
	})

	const factorChartHeight = computed(() => {
		const h = viewportHeight.value
		return Math.max(260, Math.min(440, Math.floor(h * 0.44)))
	})

	return { frozenFactorChartData, factorChartHeight }
}
