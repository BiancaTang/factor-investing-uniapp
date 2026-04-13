/** 本项目 uniCloud：云函数名、集合名均以 f_ 开头 */

export const F_CLOUD_SAVE_PROFILE = 'f_save_profile'
export const F_CLOUD_LOOKUP_PHONE = 'f_lookup_phone'
export const F_COLLECTION_USER_PROFILE = 'f_user_profile'

/**
 * @param {{ f_phone: string }} payload
 */
export function f_lookupPhoneInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_LOOKUP_PHONE,
		data: payload
	})
}

/**
 * @param {{ f_avatar_url: string, f_nick_name: string, f_phone: string }} payload
 */
export function f_saveProfileToCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_SAVE_PROFILE,
		data: payload
	})
}

/** 本地临时路径时上传到云存储，返回可写入 f_avatar_url 的链接或 fileID */
export async function f_ensureCloudAvatarUrl(filePath) {
	if (!filePath) return ''
	if (/^https?:\/\//i.test(filePath)) return filePath
	try {
		const cloudPath = `f_upload/${Date.now()}_${Math.random().toString(36).slice(2)}.png`
		const up = await uniCloud.uploadFile({ filePath, cloudPath })
		const fid = up.fileID
		const t = await uniCloud.getTempFileURL({ fileList: [fid] })
		const u = t.fileList && t.fileList[0] && t.fileList[0].tempFileURL
		return u || fid
	} catch (e) {
		console.error('[f_ensureCloudAvatarUrl]', e)
		return filePath
	}
}
