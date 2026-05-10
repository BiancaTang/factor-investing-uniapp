'use strict'

const db = uniCloud.database()
const dbCmd = db.command

/**
 * 大屏展示状态同步云函数
 * 聚合房间当前完整状态，供大屏页轮询使用
 */

exports.main = async (event, context) => {
	const { f_room_id } = event
	if (!f_room_id) {
		return { code: -1, message: '缺少 f_room_id' }
	}

	try {
		// 1. 获取房间基本信息
		const roomRes = await db.collection('f_room')
			.where({ f_room_id })
			.limit(1)
			.get()

		if (!roomRes.data || roomRes.data.length === 0) {
			return { code: -1, message: '房间不存在' }
		}

		const room = roomRes.data[0]

		// 2. 获取玩家列表（含角色信息）
		const membersRes = await db.collection('f_room_member')
			.where({ f_room_id })
			.orderBy('f_nav', 'desc')
			.get()

		const players = (membersRes.data || []).map((m, idx) => ({
			uid: m.f_player_uid,
			nickName: m.f_nick_name || `玩家${idx + 1}`,
			avatar: m.f_avatar_url || '',
			charId: m.f_character_id || null,
			charName: m.f_character_name || null,
			charFaction: m.f_character_faction || null,
			nav: Number(m.f_nav || 1).toFixed(4),
			rank: idx + 1,
			exposure: m.f_last_exposure || {},
			hasSubmitted: !!m.f_last_round_index && m.f_last_round_index === room.f_current_round_index
		}))

		// 3. 获取当前轮次信息
		let currentRound = null
		let groupExposure = {}
		let skillLog = []
		let roundHistory = []

		if (room.f_current_round_index > 0) {
			const roundRes = await db.collection('f_game_round')
				.where({
					f_room_id,
					f_round_index: room.f_current_round_index
				})
				.limit(1)
				.get()

			if (roundRes.data && roundRes.data.length > 0) {
				currentRound = roundRes.data[0]
			}

			// 计算群体暴露（基于已提交的玩家）
			const submittedPlayers = players.filter(p => p.hasSubmitted && p.exposure)
			const factorKeys = [
				'fac_size', 'fac_beta', 'fac_momentum', 'fac_non_linear_size',
				'fac_book_to_price', 'fac_earnings_yield', 'fac_growth',
				'fac_leverage', 'fac_liquidity', 'fac_residual_volatility'
			]
			factorKeys.forEach(key => {
				const values = submittedPlayers.map(p => Number(p.exposure[key] || 0))
				const avg = values.length > 0
					? values.reduce((a, b) => a + b, 0) / values.length
					: 0
				groupExposure[key] = Number(avg.toFixed(2))
			})

			// 技能触发记录
			skillLog = currentRound?.f_skill_uses || []
		}

		// 4. 获取历史轮次（用于复盘和净值曲线）
		const historyRes = await db.collection('f_game_round')
			.where({ f_room_id })
			.orderBy('f_round_index', 'asc')
			.limit(50)
			.get()

		roundHistory = (historyRes.data || []).map(r => ({
			roundIndex: r.f_round_index,
			eventCardId: r.f_event_card_id || null,
			eventName: r.f_event_name || null,
			playerReturns: r.f_player_returns || {},
			factorReturns: r.f_factor_returns || {},
			skillUses: r.f_skill_uses || []
		}))

		// 5. 获取当前事件卡信息
		let currentEvent = null
		if (currentRound?.f_event_card_id) {
			const eventRes = await db.collection('f_event_card')
				.where({ f_card_id: currentRound.f_event_card_id })
				.limit(1)
				.get()
			if (eventRes.data && eventRes.data.length > 0) {
				currentEvent = eventRes.data[0]
			}
		}

		// 6. 组装返回数据
		const displayState = {
			// 基础信息
			roomId: f_room_id,
			roomName: room.f_room_name || f_room_id,
			maxPlayers: room.f_max_players || 20,
			
			// 阶段信息
			currentPhase: room.f_display_phase || 'lobby', // lobby | decision | event | settlement | review | finale
			currentRoundIndex: room.f_current_round_index || 0,
			maxRounds: room.f_max_rounds || 8,
			timeLeft: room.f_decision_time_left || 0,
			
			// 玩家数据
			players,
			submittedCount: players.filter(p => p.hasSubmitted).length,
			totalPlayers: players.length,
			
			// 因子数据
			groupExposure,
			
			// 事件数据
			currentEvent: currentEvent ? {
				cardId: currentEvent.f_card_id,
				name: currentEvent.f_name,
				description: currentEvent.f_description,
				category: currentEvent.f_category,
				subcategory: currentEvent.f_subcategory,
				effects: currentEvent.f_effects || []
			} : null,
			
			// 技能与历史
			skillLog,
			roundHistory,
			
			// 时间戳（用于前端判断数据新旧）
			timestamp: Date.now()
		}

		return { code: 0, data: displayState }

	} catch (err) {
		return { code: -1, message: err.message || '查询失败' }
	}
}
