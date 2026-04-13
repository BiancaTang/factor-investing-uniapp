export const F_CLOUD_CONTROL_ROOM_ROUND = 'f_control_room_round'
export const F_CLOUD_GET_ROOM_PLAYER_STATUS = 'f_get_room_player_status'

export function f_controlRoomRoundInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_CONTROL_ROOM_ROUND,
		data: payload
	})
}

export function f_getRoomPlayerStatusInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_GET_ROOM_PLAYER_STATUS,
		data: payload
	})
}
