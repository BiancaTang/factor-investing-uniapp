/**
 * 仅用于命令行打包 H5（npm + uni build），不要改名为 vite.config.mjs 提交，
 * 否则 HBuilderX 在未执行 npm install 时会尝试加载本配置并报错找不到 vite。
 *
 * 本地需要 CLI 打包时：复制为 vite.config.mjs 后执行 npm install && npx uni build
 *   cp vite.uni-cli.example.mjs vite.config.mjs
 *
 * 使用 HBuilderX 发行小程序 / App 时：不要保留根目录 vite.config.mjs（可删除或仅保留本示例文件）。
 */
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
	plugins: [uni()]
})
