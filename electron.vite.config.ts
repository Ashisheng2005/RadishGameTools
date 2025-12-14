import { resolve } from 'path'
import path from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // external: ['electron', 'fs', 'path'],
        external: ['electron', 'better-sqlite3'],
        input: {
          index: path.join(__dirname, 'src/preload/index.ts')
        }
      },
      minify: true,
      sourcemap: false  // 生产环境关闭 sourcemap
  }},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src'),
        // 共享区域
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('lucide-react') || id.includes('@radix-ui')) {
                return 'ui-vendor';
              }
              if (id.includes('recharts')) {
                return 'chart-vendor';
              }
              if (id.includes('tailwindcss') || id.includes('clsx') || id.includes('class-variance-authority')) {
                return 'style-vendor';
              }
              return 'vendor';
            }
            return 'app';  // 确保所有情况都有返回值
            }
          }
        }
      },
  },
  // minify: 'terser',
      // terserOptions: {
      //   compress: {
      //     drop_console: true,  // 移除 console
      //     drop_debugger: true
      //   }
      // },
      // sourcemap: false
  }
)
