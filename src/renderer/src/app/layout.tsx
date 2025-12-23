import type React from 'react'
import type { Metadata } from 'next'
// import { Geist, Geist_Mono } from "next/font/google"
import './globals.css'

// const _geist = Geist({ subsets: ["latin"] })
// const _geistMono = Geist_Mono({ subsets: ["latin"] })

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: 'Radish GameTools',
  description: '软件启动器 - 管理和监控您的应用程序'
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
