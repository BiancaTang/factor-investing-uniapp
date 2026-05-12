export const F_CLOUD_CONTROL_ROOM_ROUND = 'f_control_room_round'
export const F_CLOUD_GET_ROOM_PLAYER_STATUS = 'f_get_room_player_status'
export const F_CLOUD_SET_ROOM_JOIN_LOCK = 'f_set_room_join_lock'
export const F_CLOUD_START_PLAYING_PHASE = 'f_start_playing_phase'

export function f_controlRoomRoundInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_CONTROL_ROOM_ROUND,
		data: payload,
		// end 动作可能包含批量补齐未提交玩家记录，适当放宽超时
		timeout: 120000
	})
}

export function f_getRoomPlayerStatusInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_GET_ROOM_PLAYER_STATUS,
		data: payload
	})
}

export function f_setRoomJoinLockInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_SET_ROOM_JOIN_LOCK,
		data: payload
	})
}

export function f_startPlayingPhaseInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_START_PLAYING_PHASE,
		data: payload
	})
}
