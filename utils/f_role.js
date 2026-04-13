/** 与集合 f_user_profile 字段 f_role 取值一致；管理员请在控制台将 f_role 改为 admin */

export const F_ROLE_PLAYER = 'player'
export const F_ROLE_ADMIN = 'admin'

export function f_isAdmin(u) {
	return !!(u && u.f_role === F_ROLE_ADMIN)
}

export function f_roleLabel(u) {
	if (!u) return ''
	return f_isAdmin(u) ? '管理员' : '玩家'
}
