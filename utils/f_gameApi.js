export const F_CLOUD_GET_ROOM = 'f_get_room'
export const F_CLOUD_SUBMIT_GAME_ROUND = 'f_submit_game_round'
export const F_CLOUD_LIST_GAME_ROUNDS = 'f_list_game_rounds'
export const F_CLOUD_GET_ROOM_MEMBER_STATUS = 'f_get_room_member_status'

export function f_getRoomInCloud(payload) {
	return uniCloud.callFunction({ name: F_CLOUD_GET_ROOM, data: payload })
}

export function f_submitGameRoundInCloud(payload) {
	return uniCloud.callFunction({ name: F_CLOUD_SUBMIT_GAME_ROUND, data: payload })
}

export function f_listGameRoundsInCloud(payload) {
	return uniCloud.callFunction({ name: F_CLOUD_LIST_GAME_ROUNDS, data: payload })
}

/** 房间成员拉取全员进度与历史（与管理员观测相同结构），用于多人净值曲线 */
export function f_getRoomMemberStatusInCloud(payload) {
	return uniCloud.callFunction({ name: F_CLOUD_GET_ROOM_MEMBER_STATUS, data: payload })
}
