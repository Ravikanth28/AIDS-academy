'use client'

import { Toaster } from 'react-hot-toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A30',
            color: '#fff',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: { primary: '#8B5CF6', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      {children}
    </>
  )
}
