'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cropper, { type Area } from 'react-easy-crop'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { AVATAR_TYPES, cropToJpeg } from '@/lib/avatar'

const outlineBtn = 'border-white/20 bg-transparent text-white hover:bg-white/10'

// Upload com recorte quadrado 400x400 (JPG 85). Usado pela foto de perfil e pelo logo.
// A tela só faz a primeira barreira; a rota confere o conteúdo real no servidor.
export interface ImageUploadProps {
  endpoint: string                 // POST (multipart "file") e DELETE
  initialUrl: string | null
  hasImage: boolean
  fallback: React.ReactNode        // quando não há imagem (iniciais, ícone)
  shape: 'round' | 'square'
  noun: { one: string; the: string; changed: string; removed: string } // "foto"/"a foto"/"Foto atualizada"/"Foto removida"
  maxBytes: number
  formatError: string
  sizeError: string
  alt: string
  testId?: string
}

export function ImageUpload(p: ImageUploadProps) {
  const router = useRouter()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(p.initialUrl)
  const [hasImage, setHasImage] = useState(p.hasImage)
  const [src, setSrc] = useState<string | null>(null) // imagem escolhida, aguardando recorte
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.add({ type: 'error', title: 'Formato não suportado', description: p.formatError })
      return
    }
    if (file.size > p.maxBytes) {
      toast.add({ type: 'error', title: 'Arquivo acima do limite', description: p.sizeError })
      return
    }
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setArea(null)
    setSrc(URL.createObjectURL(file))
  }

  function closeCrop() {
    if (src) URL.revokeObjectURL(src)
    setSrc(null)
  }

  async function save() {
    if (!src || !area) return
    setBusy(true)
    try {
      const blob = await cropToJpeg(src, area)
      const body = new FormData()
      body.append('file', blob, 'imagem.jpg')
      const res = await fetch(p.endpoint, { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Não foi possível salvar ${p.noun.the}.`)
      setUrl(data.url ?? URL.createObjectURL(blob))
      setHasImage(true)
      closeCrop()
      toast.add({ title: p.noun.changed })
      router.refresh()
    } catch (e) {
      toast.add({ type: 'error', title: `Não foi possível salvar ${p.noun.the}`, description: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    const res = await fetch(p.endpoint, { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) {
      toast.add({ type: 'error', title: `Não foi possível remover ${p.noun.the}` })
      return
    }
    setUrl(null)
    setHasImage(false)
    toast.add({ title: p.noun.removed })
    router.refresh()
  }

  const radius = p.shape === 'round' ? 'rounded-full' : 'rounded-2xl'
  const label = p.noun.one.charAt(0).toUpperCase() + p.noun.one.slice(1)

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div
        data-testid={p.testId}
        className={`flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden ${radius} text-3xl font-semibold ring-2 ring-[#d4af37]/40`}
        style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}
      >
        {url
          // eslint-disable-next-line @next/next/no-img-element -- link assinado do Storage, sem otimização do next/image
          ? <img src={url} alt={p.alt} className="h-full w-full object-cover" />
          : p.fallback}
      </div>
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => inputRef.current?.click()} disabled={busy} className="gold-btn font-semibold">
            Trocar {p.noun.one}
          </Button>
          {hasImage && (
            <Button variant="outline" onClick={remove} disabled={busy} className={outlineBtn}>
              Remover {p.noun.one}
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500">PNG, JPG ou WEBP, até 2 MB.</p>
        <input ref={inputRef} type="file" accept={AVATAR_TYPES.join(',')} onChange={pick} className="hidden" />
      </div>

      <Dialog open={!!src} onOpenChange={(o) => { if (!o && !busy) closeCrop() }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#112240' }}>
          <DialogHeader><DialogTitle className="text-white">Ajustar {p.noun.one}</DialogTitle></DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black">
            {src && (
              <Cropper
                image={src} crop={crop} zoom={zoom} aspect={1} cropShape={p.shape === 'round' ? 'round' : 'rect'} showGrid={false}
                onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)}
              />
            )}
          </div>
          <input
            type="range" min={1} max={3} step={0.05} value={zoom} aria-label="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-[#d4af37]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeCrop} disabled={busy} className={outlineBtn}>Cancelar</Button>
            <Button onClick={save} disabled={busy || !area} className="gold-btn font-semibold">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : `Salvar ${p.noun.one}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
