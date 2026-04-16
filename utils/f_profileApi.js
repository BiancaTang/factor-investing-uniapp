/** 本项目 uniCloud：云函数名、集合名均以 f_ 开头 */

export const F_CLOUD_SAVE_PROFILE = 'f_save_profile'
export const F_CLOUD_LOOKUP_PHONE = 'f_lookup_phone'
export const F_CLOUD_GET_WX_PHONE = 'f_get_wx_phone'
export const F_CLOUD_LOGIN_WX = 'f_login_wx'
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
 * 微信小程序：将 getPhoneNumber 回调里的 code 换取号码
 * （凭证：云函数 f_get_wx_phone 目录下 wx-secret.json，见 wx-secret.example.json）
 * @param {{ code: string }} payload
 */
export function f_getWxPhoneFromCodeInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_GET_WX_PHONE,
		data: payload
	})
}

/**
 * 昵称 + 头像登录或注册（服务端按昵称匹配，新用户分配 f_uid）
 * @param {{ f_nick_name: string, f_avatar_url: string }} payload
 */
export function f_loginWxInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_LOGIN_WX,
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
