/** 仅开发/运维：上传云函数 f_admin_purge_collection 后调用 */

export const F_CLOUD_ADMIN_PURGE = 'f_admin_purge_collection'

/**
 * 清空本项目全部业务数据（对局、成员、房间、用户）。需管理员手机号 + 确认串。
 * @param {{ f_admin_phone: string, f_confirm: 'DELETE_ALL_DATA' }} payload
 */
export function f_purgeAllDataInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_ADMIN_PURGE,
		data: {
			f_admin_phone: payload.f_admin_phone,
			f_purge_all: true,
			f_confirm: payload.f_confirm
		}
	})
}

/**
 * 只清空一个集合（白名单内）
 */
export function f_purgeCollectionInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_ADMIN_PURGE,
		data: {
			f_admin_phone: payload.f_admin_phone,
			f_collection: payload.f_collection
		}
	})
}
