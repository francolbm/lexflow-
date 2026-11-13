'use client'

import { createContext, useContext } from 'react'

// Itens de menu que dependem do usuário (calculados no servidor, no layout) e são lidos
// tanto pela sidebar do desktop quanto pela gaveta do mobile.
interface NavFlags { showFiliais: boolean }

const NavFlagsContext = createContext<NavFlags>({ showFiliais: false })

export function NavFlagsProvider({ showFiliais, children }: NavFlags & { children: React.ReactNode }) {
  return <NavFlagsContext.Provider value={{ showFiliais }}>{children}</NavFlagsContext.Provider>
}

export const useNavFlags = () => useContext(NavFlagsContext)
