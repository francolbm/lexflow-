// Proteção contra um erro silencioso do Base UI com React 18: o Button/Input de components/ui são funções
// simples (sem forwardRef), então NÃO recebem o `ref`. Um *Trigger com render={<Button />} perde o elemento
// âncora do popup (menu/select/popover) e ele aparece invisível em top:0/left:0. Estilize o Trigger direto
// (className={buttonVariants(...)}) em vez de usar render= com esses componentes.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === '.next' ? [] : tsxFiles(p)
    return e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx') ? [p] : []
  })
}

describe('popups ancorados no Base UI', () => {
  it('nenhum *Trigger usa render={<Button/>} ou render={<Input/>} (função sem ref no React 18)', () => {
    const root = path.resolve(__dirname, '..')
    const offenders: string[] = []
    for (const file of [...tsxFiles(path.join(root, 'components')), ...tsxFiles(path.join(root, 'app'))]) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of Array.from(src.matchAll(/render=\{<(Button|Input)\b/g))) {
        const before = src.slice(Math.max(0, (m.index ?? 0) - 160), m.index)
        // Só importa em Trigger (ancora popup). DialogClose etc. não precisam de âncora.
        if (/Trigger\b[^<]*$/.test(before)) offenders.push(path.relative(root, file))
      }
    }
    expect(offenders).toEqual([])
  })
})
