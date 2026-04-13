const STORAGE_KEY = 'f_user_profile_local'

export function f_getStoredUser() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY)
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}

export function f_saveUserLocal(partial) {
	const prev = f_getStoredUser() || {}
	const next = { ...prev, ...partial, f_updated_at: Date.now() }
	uni.setStorageSync(STORAGE_KEY, JSON.stringify(next))
	return next
}

export function f_clearUserLocal() {
	uni.removeStorageSync(STORAGE_KEY)
}
