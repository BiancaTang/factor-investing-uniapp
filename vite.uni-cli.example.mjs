/**
 * 仅用于命令行打包 H5（npm + uni build），不要改名为 vite.config.mjs 提交，
 * 否则 HBuilderX 在未执行 npm install 时会尝试加载本配置并报错找不到 vite。
 *
 * 本项目为 HBuilderX 根目录结构（manifest.json / pages.json 在根目录，不在 src/），
 * CLI 须设置 UNI_INPUT_DIR=.，已写入 package.json 的 dev:h5 / build:h5。
 *
 * 本地 H5 开发：
 *   npm install
 *   npm run dev:h5
 *
 * 本地 H5 打包：
 *   npm run build:h5
 *
 * 若需自定义 Vite 配置，复制为 vite.config.mjs 后再运行上述命令。
 *
 * 使用 HBuilderX 发行小程序 / App 时：不要保留根目录 vite.config.mjs（可删除或仅保留本示例文件）。
 */
import { defineConfig } from 'vite'
import uniModule from '@dcloudio/vite-plugin-uni'

const uni = uniModule.default?.default ?? uniModule.default ?? uniModule

export default defineConfig({
	plugins: [uni()]
})
