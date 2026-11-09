'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cropper, { type Area } from 'react-easy-crop'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import {
  AVATAR_FORMAT_ERROR, AVATAR_MAX_BYTES, AVATAR_SIZE_ERROR, AVATAR_TYPES, cropToJpeg, initialsOf,
} from '@/lib/avatar'
import type { PerfilData } from './PerfilSections'

const outlineBtn = 'border-white/20 bg-transparent text-white hover:bg-white/10'

export function AvatarSection({ profile, initialUrl }: { profile: PerfilData; initialUrl: string | null }) {
  const router = useRouter()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(initialUrl)
  const [hasAvatar, setHasAvatar] = useState(profile.hasAvatar)
  const [src, setSrc] = useState<string | null>(null) // imagem escolhida, aguardando recorte
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return
    // Primeira barreira (rápida, na tela); a rota confere o conteúdo real no servidor
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.add({ type: 'error', title: 'Formato não suportado', description: AVATAR_FORMAT_ERROR })
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.add({ type: 'error', title: 'Arquivo acima do limite', description: AVATAR_SIZE_ERROR })
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
      body.append('file', blob, 'avatar.jpg')
      const res = await fetch('/api/perfil/avatar', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Não foi possível salvar a foto.')
      setUrl(data.url ?? URL.createObjectURL(blob))
      setHasAvatar(true)
      closeCrop()
      toast.add({ title: 'Foto atualizada' })
      router.refresh() // barra lateral pega a foto nova
    } catch (e) {
      toast.add({ type: 'error', title: 'Não foi possível salvar a foto', description: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    const res = await fetch('/api/perfil/avatar', { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) {
      toast.add({ type: 'error', title: 'Não foi possível remover a foto' })
      return
    }
    setUrl(null)
    setHasAvatar(false)
    toast.add({ title: 'Foto removida' })
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div
        className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full text-3xl font-semibold ring-2 ring-[#d4af37]/40"
        style={{ backgroundColor: '#d4af3720', color: '#d4af37' }}
      >
        {url
          // eslint-disable-next-line @next/next/no-img-element -- link assinado do Storage, sem otimização do next/image
          ? <img src={url} alt="Sua foto de perfil" className="h-full w-full object-cover" />
          : <span data-testid="avatar-initials">{initialsOf(profile.fullName)}</span>}
      </div>
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <div className="flex gap-2">
          <Button onClick={() => inputRef.current?.click()} disabled={busy} className="gold-btn font-semibold">
            Trocar foto
          </Button>
          {hasAvatar && (
            <Button variant="outline" onClick={remove} disabled={busy} className={outlineBtn}>
              Remover foto
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500">PNG, JPG ou WEBP, até 2 MB.</p>
        <input ref={inputRef} type="file" accept={AVATAR_TYPES.join(',')} onChange={pick} className="hidden" />
      </div>

      <Dialog open={!!src} onOpenChange={(o) => { if (!o && !busy) closeCrop() }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#112240' }}>
          <DialogHeader><DialogTitle className="text-white">Ajustar foto</DialogTitle></DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black">
            {src && (
              <Cropper
                image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
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
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : 'Salvar foto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
