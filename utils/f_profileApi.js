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

/** 仅本地临时路径 / 空：不可在大屏或其它端展示 */
export function f_isBrokenAvatarUrl(url) {
	const s = String(url || '').trim()
	if (!s) return true
	if (s.startsWith('wxfile://')) return true
	if (s.startsWith('file://')) return true
	if (/^http:\/\/tmp\//i.test(s)) return true
	return false
}

/** 已上传云存储、可长期写入库并在 H5/大屏展示的地址 */
export function f_isCloudStoredAvatarUrl(url) {
	const s = String(url || '').trim()
	if (!s || f_isBrokenAvatarUrl(s)) return false
	if (s.startsWith('cloud://')) return true
	if (/^https:\/\/[^/]+\.cdn\.bspapp\.com\//i.test(s)) return true
	if (/^https?:\/\//i.test(s)) return true
	return s.length > 8
}

/** 展示用：须 getTempFileURL 的 cloud:// fileID */
export function f_avatarUrlNeedsTempResolve(url) {
	const s = String(url || '').trim()
	return s.startsWith('cloud://') || (!f_isBrokenAvatarUrl(s) && !/^https?:\/\//i.test(s) && s.length > 8)
}

/** 本地临时路径 / 微信头像：上传到云存储，返回 cloud:// 或 CDN HTTPS */
export async function f_ensureCloudAvatarUrl(filePath) {
	if (!filePath) return ''
	const s = String(filePath).trim()
	if (f_isCloudStoredAvatarUrl(s)) return s

	if (/^https?:\/\//i.test(s)) {
		if (/thirdwx\.qlogo\.cn|wx\.qlogo\.cn/i.test(s)) {
			try {
				const dl = await uni.downloadFile({ url: s })
				if (dl.statusCode === 200 && dl.tempFilePath) {
					return await f_uploadLocalAvatarToCloud(dl.tempFilePath)
				}
			} catch (e) {
				console.warn('[f_ensureCloudAvatarUrl] wx avatar upload', e)
			}
		}
		return s
	}

	return await f_uploadLocalAvatarToCloud(s)
}

async function f_uploadLocalAvatarToCloud(filePath) {
	try {
		const cloudPath = `f_upload/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
		const up = await uniCloud.uploadFile({ filePath, cloudPath })
		const fid = up && up.fileID != null ? String(up.fileID).trim() : ''
		if (fid && f_isCloudStoredAvatarUrl(fid)) {
			return fid
		}
		console.error('[f_uploadLocalAvatarToCloud] invalid fileID', up)
		return ''
	} catch (e) {
		console.error('[f_uploadLocalAvatarToCloud]', e)
		return ''
	}
}
