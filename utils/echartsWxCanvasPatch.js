export function patchCanvasForEcharts(canvas) {
	if (!canvas || typeof canvas.addEventListener === 'function') {
		return canvas
	}
	canvas.addEventListener = function () {}
	canvas.removeEventListener = function () {}
	return canvas
}
