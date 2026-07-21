'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { DemandStatus } from '@/lib/types'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface DemandActionsProps {
  demandId: string
  currentStatus?: DemandStatus
  orgId: string
  userId: string
}

export function DemandActions({ demandId, currentStatus, orgId, userId }: DemandActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [adjustmentDialog, setAdjustmentDialog] = useState(false)
  const [adjustmentNotes, setAdjustmentNotes] = useState('')

  async function handleApprove() {
    setLoading('approve')
    const supabase = createClient()

    const { error } = await supabase
      .from('demands')
      .update({ status: 'finalized' })
      .eq('id', demandId)

    if (!error) {
      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        user_id: userId,
        action: 'demand_approve',
        entity: 'demands',
        entity_id: demandId,
        previous_data: { status: currentStatus },
        new_data: { status: 'finalized' },
      })
    }

    setLoading(null)
    router.refresh()
  }

  async function handleRequestAdjustment() {
    if (!adjustmentNotes.trim()) return
    setLoading('adjust')
    const supabase = createClient()

    const { error } = await supabase
      .from('demands')
      .update({
        status: 'revision_requested',
        adjustment_notes: adjustmentNotes,
      })
      .eq('id', demandId)

    if (!error) {
      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        user_id: userId,
        action: 'demand_request_adjustment',
        entity: 'demands',
        entity_id: demandId,
        previous_data: { status: currentStatus },
        new_data: { status: 'revision_requested', adjustment_notes: adjustmentNotes },
      })
    }

    setAdjustmentDialog(false)
    setLoading(null)
    router.refresh()
  }

  return (
    <>
      <Card className="border border-purple-500/20" style={{ backgroundColor: '#1a1040' }}>
        <CardHeader>
          <CardTitle className="text-purple-300 text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Documento aguardando sua revisão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm mb-4 leading-relaxed">
            Revise o documento entregue e decida se aprova ou solicita ajustes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleApprove}
              disabled={loading !== null}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold gap-2"
            >
              {loading === 'approve' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Aprovar Documento
            </Button>
            <Button
              onClick={() => setAdjustmentDialog(true)}
              disabled={loading !== null}
              variant="outline"
              className="flex-1 border-red-500/40 text-red-300 hover:bg-red-500/10 gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Solicitar Ajustes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={adjustmentDialog} onOpenChange={setAdjustmentDialog}>
        <DialogContent style={{ backgroundColor: '#112240', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Solicitar Ajustes</DialogTitle>
            <DialogDescription className="text-gray-400">
              Descreva os ajustes necessários para que os agentes de IA possam aprimorar o documento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Textarea
              placeholder="Descreva os ajustes necessários: quais partes precisam ser alteradas, o que está faltando, o que deve ser corrigido..."
              value={adjustmentNotes}
              onChange={(e) => setAdjustmentNotes(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 min-h-[120px]"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setAdjustmentDialog(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRequestAdjustment}
                disabled={loading === 'adjust' || !adjustmentNotes.trim()}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-2"
              >
                {loading === 'adjust' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Solicitar Ajustes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
