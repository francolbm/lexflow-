'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { DemandStatus, STATUS_LABELS } from '@/lib/types'
import { Loader2, Upload, FileText, X, Sparkles } from 'lucide-react'

interface AdminDemandActionsProps {
  demandId: string
  currentStatus: DemandStatus
  operatorId: string
  orgId: string
}

const statusTransitions: Record<DemandStatus, DemandStatus[]> = {
  received: ['in_triage'],
  in_triage: ['in_production', 'awaiting_complement', 'received'],
  awaiting_complement: ['in_triage'],
  in_production: ['in_internal_review', 'delivered', 'in_triage'],
  in_internal_review: ['delivered', 'in_production'],
  delivered: ['finalized', 'revision_requested'],
  revision_requested: ['in_production'],
  finalized: ['archived'],
  archived: [],
  deletion_requested: [],
}

export function AdminDemandActions({ demandId, currentStatus, operatorId, orgId }: AdminDemandActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [newStatus, setNewStatus] = useState<DemandStatus | ''>('')
  const [statusNotes, setStatusNotes] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null)
  const [visibleToClient, setVisibleToClient] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [aiLoading, setAiLoading] = useState<'generate' | 'adjust' | null>(null)
  const [aiPreview, setAiPreview] = useState<{ versionNo: number; text: string } | null>(null)

  const nextStatuses = statusTransitions[currentStatus] || []

  async function handleStatusUpdate() {
    if (!newStatus) return
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { error } = await supabase
      .from('demands')
      .update({ status: newStatus })
      .eq('id', demandId)

    if (error) {
      setError('Erro ao atualizar status: ' + error.message)
    } else {
      // Record history
      await supabase.from('demand_status_history').insert({
        demand_id: demandId,
        organization_id: orgId,
        changed_by: operatorId,
        previous_status: currentStatus,
        new_status: newStatus,
        notes: statusNotes || null,
      })

      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        user_id: operatorId,
        action: 'status_update',
        entity: 'demands',
        entity_id: demandId,
        previous_data: { status: currentStatus },
        new_data: { status: newStatus, notes: statusNotes || null },
      })

      setSuccess(`Status atualizado para: ${STATUS_LABELS[newStatus]}`)
      setNewStatus('')
      setStatusNotes('')
      setTimeout(() => { setSuccess(''); router.refresh() }, 1500)
    }
    setLoading(false)
  }

  async function handleDeliveryUpload() {
    if (!deliveryFile) return
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Get next version number
    const { count } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact' })
      .eq('demand_id', demandId)

    const versionNo = (count || 0) + 1

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .insert({
        demand_id: demandId,
        organization_id: orgId,
        version_no: versionNo,
        delivered_by: operatorId,
        notes: deliveryNotes || null,
        visible_to_client: visibleToClient,
      })
      .select()
      .single()

    if (deliveryError || !delivery) {
      setError('Erro ao registrar entrega: ' + (deliveryError?.message || 'Erro desconhecido'))
      setLoading(false)
      return
    }

    // Upload file
    const filePath = `${orgId}/deliveries/${demandId}/${versionNo}-${deliveryFile.name}`
    const { error: uploadError } = await supabase.storage
      .from('delivery-files')
      .upload(filePath, deliveryFile)

    if (uploadError) {
      // File upload might fail if bucket doesn't exist, but we still record the delivery
      console.warn('File upload warning:', uploadError.message)
    } else {
      await supabase.from('delivery_files').insert({
        delivery_id: delivery.id,
        organization_id: orgId,
        uploaded_by: operatorId,
        bucket_name: 'delivery-files',
        storage_path: filePath,
        original_name: deliveryFile.name,
        mime_type: deliveryFile.type || null,
      })
    }

    await supabase.from('audit_logs').insert({
      organization_id: orgId,
      user_id: operatorId,
      action: 'manual_delivery',
      entity: 'deliveries',
      entity_id: delivery.id,
      new_data: { demand_id: demandId, version_no: versionNo, visible_to_client: visibleToClient },
    })

    // Move to review if in production
    if (currentStatus === 'in_production' || currentStatus === 'revision_requested') {
      await supabase
        .from('demands')
        .update({ status: 'delivered' })
        .eq('id', demandId)

      await supabase.from('demand_status_history').insert({
        demand_id: demandId,
        organization_id: orgId,
        changed_by: operatorId,
        previous_status: currentStatus,
        new_status: 'delivered',
        notes: `Minuta v${versionNo} entregue`,
      })
    }

    setDeliveryFile(null)
    setDeliveryNotes('')
    setSuccess(`Minuta v${versionNo} enviada com sucesso!`)
    setTimeout(() => { setSuccess(''); router.refresh() }, 2000)
    setLoading(false)
  }

  async function handleGenerateDraft() {
    setAiLoading('generate')
    setError('')
    setAiPreview(null)

    try {
      const res = await fetch('/api/ai/generate-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ demandId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao gerar rascunho com IA')
      } else {
        setAiPreview({ versionNo: data.versionNo, text: data.text })
        setSuccess(`Rascunho v${data.versionNo} gerado por IA (entrega interna).`)
        router.refresh()
      }
    } catch (e: any) {
      setError('Erro ao gerar rascunho: ' + e.message)
    }
    setAiLoading(null)
  }

  async function handleApplyAdjustmentWithAI() {
    setAiLoading('adjust')
    setError('')
    setAiPreview(null)

    try {
      const res = await fetch('/api/ai/apply-adjustment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ demandId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao aplicar ajuste com IA')
      } else {
        setAiPreview({ versionNo: data.versionNo, text: data.text })
        setSuccess(`Ajuste aplicado por IA — v${data.versionNo} gerada (entrega interna).`)
        router.refresh()
      }
    } catch (e: any) {
      setError('Erro ao aplicar ajuste: ' + e.message)
    }
    setAiLoading(null)
  }

  async function handleInternalNote() {
    if (!internalNote.trim()) return
    setLoading(true)

    const supabase = createClient()
    await supabase.from('comments').insert({
      demand_id: demandId,
      organization_id: orgId,
      author_user_id: operatorId,
      body: internalNote,
      internal_only: true,
    })

    setInternalNote('')
    setSuccess('Nota interna adicionada.')
    setTimeout(() => setSuccess(''), 1500)
    setLoading(false)
  }

  return (
    <Card className="border-0" style={{ backgroundColor: '#0d1f38' }}>
      <CardHeader>
        <CardTitle className="text-white text-base">Ações do Operador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Status update */}
        {nextStatuses.length > 0 && (
          <div className="space-y-3">
            <Label className="text-gray-300 text-sm font-medium">Atualizar Status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as DemandStatus)}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Selecionar novo status..." />
              </SelectTrigger>
              <SelectContent>
                {nextStatuses.map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Nota sobre a mudança (opcional)..."
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 min-h-[70px]"
            />
            <Button
              onClick={handleStatusUpdate}
              disabled={loading || !newStatus}
              className="w-full gold-btn font-semibold"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Atualizar Status
            </Button>
          </div>
        )}

        {/* AI draft generation */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <Label className="text-gray-300 text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" style={{ color: '#d4af37' }} />
            Gerar Rascunho com IA
          </Label>
          <p className="text-gray-500 text-xs leading-relaxed">
            Gera uma minuta a partir do briefing e salva como entrega interna (não visível ao cliente)
            para revisão antes do envio.
          </p>
          <Button
            onClick={handleGenerateDraft}
            disabled={aiLoading !== null}
            className="w-full gold-btn font-semibold"
          >
            {aiLoading === 'generate' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Gerar Rascunho com IA
          </Button>

          {currentStatus === 'revision_requested' && (
            <Button
              onClick={handleApplyAdjustmentWithAI}
              disabled={aiLoading !== null}
              variant="outline"
              className="w-full border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 font-semibold"
            >
              {aiLoading === 'adjust' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Aplicar ajuste solicitado com IA
            </Button>
          )}

          {aiPreview && (
            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: '#0a192f' }}>
              <p className="text-gray-500 text-xs uppercase tracking-wide">
                Prévia — Rascunho IA v{aiPreview.versionNo}
              </p>
              <div className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {aiPreview.text}
              </div>
            </div>
          )}
        </div>

        {/* Delivery upload */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <Label className="text-gray-300 text-sm font-medium">Enviar Minuta</Label>
          <div
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-yellow-500/40"
            style={{ borderColor: deliveryFile ? '#d4af37' : 'rgba(255,255,255,0.15)' }}
            onClick={() => document.getElementById('delivery-file-upload')?.click()}
          >
            <input
              id="delivery-file-upload"
              type="file"
              className="hidden"
              onChange={(e) => setDeliveryFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.txt"
            />
            {deliveryFile ? (
              <div className="flex items-center gap-2 justify-center">
                <FileText className="h-4 w-4" style={{ color: '#d4af37' }} />
                <span className="text-white text-sm truncate max-w-[180px]">{deliveryFile.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDeliveryFile(null) }}
                  className="text-gray-500 hover:text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-5 w-5 mx-auto mb-1 text-gray-500" />
                <p className="text-gray-400 text-sm">Clique para selecionar</p>
                <p className="text-gray-600 text-xs">PDF, DOC, DOCX, TXT</p>
              </>
            )}
          </div>
          <Textarea
            placeholder="Notas sobre esta versão..."
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 min-h-[70px]"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="visibleToClient"
              checked={visibleToClient}
              onChange={(e) => setVisibleToClient(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
            <Label htmlFor="visibleToClient" className="text-gray-400 text-sm cursor-pointer">
              Visível ao cliente
            </Label>
          </div>
          <Button
            onClick={handleDeliveryUpload}
            disabled={loading || !deliveryFile}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Enviar Minuta
          </Button>
        </div>

        {/* Internal note */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <Label className="text-gray-300 text-sm font-medium">Nota Interna</Label>
          <Textarea
            placeholder="Adicionar nota interna (não visível ao cliente)..."
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 min-h-[80px]"
          />
          <Button
            onClick={handleInternalNote}
            disabled={loading || !internalNote.trim()}
            variant="outline"
            className="w-full border-white/20 text-gray-300 hover:bg-white/5"
          >
            Salvar Nota
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
