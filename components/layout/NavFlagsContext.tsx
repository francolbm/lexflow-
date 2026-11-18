'use client'

import { createContext, useContext } from 'react'

// Itens de menu que dependem do usuário (calculados no servidor, no layout) e são lidos
// tanto pela sidebar do desktop quanto pela gaveta do mobile.
interface NavFlags { showFiliais: boolean; showMinhaFilial?: boolean }

const NavFlagsContext = createContext<NavFlags>({ showFiliais: false, showMinhaFilial: false })

export function NavFlagsProvider({ showFiliais, showMinhaFilial = false, children }: NavFlags & { children: React.ReactNode }) {
  return <NavFlagsContext.Provider value={{ showFiliais, showMinhaFilial }}>{children}</NavFlagsContext.Provider>
}

export const useNavFlags = () => useContext(NavFlagsContext)
