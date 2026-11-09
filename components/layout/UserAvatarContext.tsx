'use client'

import { createContext, useContext } from 'react'

// Link (assinado) da foto do usuário logado, gerado no layout e lido pelas barras laterais
const UserAvatarContext = createContext<string | null>(null)

export function UserAvatarProvider({ url, children }: { url: string | null; children: React.ReactNode }) {
  return <UserAvatarContext.Provider value={url}>{children}</UserAvatarContext.Provider>
}

export const useUserAvatar = () => useContext(UserAvatarContext)
