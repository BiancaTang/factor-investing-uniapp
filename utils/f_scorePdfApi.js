export const F_CLOUD_EXPORT_SCORE_PDF = 'f_export_score_pdf'

export function f_exportScorePdfInCloud(payload) {
	return uniCloud.callFunction({
		name: F_CLOUD_EXPORT_SCORE_PDF,
		data: payload
	})
}
