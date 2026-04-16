'use strict'

/**
 * 用微信 getPhoneNumber 返回的 code 换取号码。
 *
 * 凭证三选一（优先前面的）：
 * 1）云函数环境变量 WX_MINI_APPID / WX_MINI_SECRET（若你的空间支持）
 * 2）本目录下 wx-secret.json（推荐：阿里云 Web 控制台往往没有「环境变量」入口，用此文件即可）
 *    复制 wx-secret.example.json 为 wx-secret.json，填 AppID、AppSecret，再上传本云函数。
 *
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/phonenumber/phonenumber.getPhoneNumber.html
 */

let tokenCache = { access_token: '', expire_at: 0 }

function loadWxCredentials() {
	let fromFile = {}
	try {
		fromFile = require('./wx-secret.json')
	} catch (e) {
		/* 未创建 wx-secret.json 时忽略 */
	}
	const appid = String(process.env.WX_MINI_APPID || fromFile.WX_MINI_APPID || '').trim()
	const secret = String(process.env.WX_MINI_SECRET || fromFile.WX_MINI_SECRET || '').trim()
	return { appid, secret }
}

async function httpJson(url, opts = {}) {
	const client = uniCloud.httpclient
	const res = await client.request(url, {
		method: opts.method || 'GET',
		dataType: 'json',
		contentType: opts.contentType,
		data: opts.data,
		timeout: 15000
	})
	return res.data
}

async function getStableAccessToken() {
	const { appid, secret } = loadWxCredentials()
	if (!appid || !secret) {
		const err = new Error('missing_credentials')
		err.code = 'ENV'
		throw err
	}
	const now = Date.now()
	if (tokenCache.access_token && now < tokenCache.expire_at - 120000) {
		return tokenCache.access_token
	}
	const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(
		appid
	)}&secret=${encodeURIComponent(secret)}`
	const data = await httpJson(url)
	if (data.errcode && data.errcode !== 0) {
		const e = new Error(data.errmsg || 'token_error')
		e.raw = data
		throw e
	}
	const exp = (data.expires_in || 7200) * 1000
	tokenCache = {
		access_token: data.access_token,
		expire_at: now + exp
	}
	return data.access_token
}

exports.main = async (event) => {
	const code = event.code != null ? String(event.code).trim() : ''
	if (!code) {
		return { f_code: 400, f_message: '缺少 code（请使用 button open-type=getPhoneNumber）', f_data: null }
	}

	let access_token
	try {
		access_token = await getStableAccessToken()
	} catch (e) {
		if (e.code === 'ENV') {
			return {
				f_code: 500,
				f_message:
					'未配置微信凭证：请在云函数 f_get_wx_phone 目录下复制 wx-secret.example.json 为 wx-secret.json，填写 WX_MINI_APPID 与 WX_MINI_SECRET 后重新上传部署',
				f_data: null
			}
		}
		return {
			f_code: 502,
			f_message: '获取 access_token 失败：' + (e.message || ''),
			f_data: e.raw || null
		}
	}

	const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(
		access_token
	)}`
	let wxRes
	try {
		wxRes = await httpJson(url, {
			method: 'POST',
			contentType: 'json',
			data: { code }
		})
	} catch (e) {
		return { f_code: 502, f_message: '请求微信接口异常', f_data: null }
	}

	if (!wxRes || wxRes.errcode !== 0) {
		return {
			f_code: 502,
			f_message: wxRes && wxRes.errmsg ? wxRes.errmsg : 'getuserphonenumber 失败',
			f_data: { errcode: wxRes && wxRes.errcode }
		}
	}

	const pi = wxRes.phone_info || {}
	let phone = pi.purePhoneNumber || pi.phoneNumber || ''
	phone = String(phone).replace(/\D/g, '')
	if (phone.length === 11 && phone[0] === '1') {
		return { f_code: 0, f_message: 'ok', f_data: { f_phone: phone } }
	}

	return {
		f_code: 500,
		f_message: '未能解析号码',
		f_data: null
	}
}
