/** 云函数名（f_ 前缀） */
export const F_CLOUD_CREATE_ROOM = 'f_create_room'
export const F_CLOUD_JOIN_ROOM = 'f_join_room'

export function f_createRoomInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_CREATE_ROOM,
		data: payload
	})
}

export function f_joinRoomInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_JOIN_ROOM,
		data: payload
	})
}
