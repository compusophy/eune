import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { WebSocketProvider } from './contexts/WebSocketContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Three.js MMO',
  description: 'A simple MMO with Three.js and WebSockets',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>
      <body className={inter.className}>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </body>
    </html>
  )
}
