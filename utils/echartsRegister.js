/**
 * 小程序端需显式注册 CanvasRenderer
 */
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
	GridComponent,
	TooltipComponent,
	LegendComponent,
	TitleComponent
} from 'echarts/components'
import { LabelLayout } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
	LineChart,
	GridComponent,
	TooltipComponent,
	LegendComponent,
	TitleComponent,
	CanvasRenderer,
	LabelLayout
])

export { echarts }
