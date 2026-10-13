import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LifeLog 日志', // App 的全名
        short_name: 'LifeLog', // 桌面图标下的名字
        description: '我的私人生活工作日志',
        theme_color: '#ffffff',
        display: 'standalone', // 关键：让它变成独立 App，隐藏浏览器网址栏
        icons: [
          {
            src: 'icon.png', // 指向你的图标
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
