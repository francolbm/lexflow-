'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

interface DeleteRequestButtonProps {
  demandId: string
}

export function DeleteRequestButton({ demandId }: DeleteRequestButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!reason.trim()) {
      setError('Por favor, descreva o motivo da solicitacao de exclusao.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/demandas/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demandId, reason }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar solicitacao')
      }

      setSuccess(true)
      router.refresh()
      
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setReason('')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitacao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setOpen(true)}
        className='text-gray-500 hover:text-red-400 hover:bg-red-500/10'
        title='Solicitar exclusao'
      >
        <Trash2 className='h-4 w-4' />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-md' style={{ backgroundColor: '#112240', borderColor: 'rgba(255,255,255,0.15)' }}>
          <DialogHeader>
            <DialogTitle className='text-white flex items-center gap-2'>
              <Trash2 className='h-5 w-5 text-red-400' />
              Solicitar Exclusao
            </DialogTitle>
          </DialogHeader>

          {success ? (
            <div className='text-center py-8'>
              <div className='w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center' style={{ backgroundColor: '#22c55e20' }}>
                <svg className='h-8 w-8 text-green-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M5 13l4 4L19 7' />
                </svg>
              </div>
              <p className='text-white font-medium'>Solicitacao enviada com sucesso!</p>
              <p className='text-gray-400 text-sm mt-1'>O status da demanda foi atualizado para Exclusao Solicitada.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='space-y-4'>
              <p className='text-gray-400 text-sm'>
                Ao confirmar, o status da demanda sera alterado para &quot;Exclusao Solicitada&quot; 
                e a demanda aparecera no filtro de exclusoes pendentes.
              </p>

              {error && (
                <div className='bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm'>
                  {error}
                </div>
              )}

              <div className='space-y-2'>
                <Label htmlFor='reason' className='text-gray-300 text-sm'>
                  Motivo da solicitacao <span className='text-red-400'>*</span>
                </Label>
                <Textarea
                  id='reason'
                  placeholder='Ex: Demanda criada por engano, informacao incorreta, etc.'
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                  className='bg-white/5 border-white/20 text-white placeholder:text-gray-500'
                />
              </div>

              <DialogFooter className='flex gap-2 sm:gap-0'>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => setOpen(false)}
                  className='text-gray-400 hover:text-white'
                >
                  Cancelar
                </Button>
                <Button
                  type='submit'
                  disabled={loading}
                  className='bg-red-500 hover:bg-red-600 text-white'
                >
                  {loading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Trash2 className='mr-2 h-4 w-4' />
                      Confirmar Exclusao
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}