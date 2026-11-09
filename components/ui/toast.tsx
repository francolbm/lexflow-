'use client'

import { Toast } from '@base-ui/react/toast'

export const useToast = Toast.useToastManager

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((t) => (
    <Toast.Root
      key={t.id}
      toast={t}
      className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${
        t.type === 'error' ? 'border-red-500/40 bg-[#2a1215] text-red-200' : 'border-[#d4af37]/40 bg-[#112240] text-white'}`}
    >
      <Toast.Title className="font-medium" />
      <Toast.Description className="mt-0.5 text-gray-300" />
    </Toast.Root>
  ))
}
