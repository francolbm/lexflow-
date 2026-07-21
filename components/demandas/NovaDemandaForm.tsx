'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { DEMAND_TYPES, AREAS_OF_LAW, DEMAND_TYPE_MAP, URGENCY_MAP } from '@/lib/types'
import { Loader2, ChevronRight, ChevronLeft, Upload, X, FileText, CheckCircle } from 'lucide-react'

interface NovaDemandaFormProps {
  userId: string
  orgId: string | null
}

interface UploadedFile {
  file: File
  name: string
  size: number
}

export function NovaDemandaForm({ userId, orgId }: NovaDemandaFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([])
  const [submitted, setSubmitted] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    demand_type: '',
    area_of_law: '',
    urgency: 'medium',
    objective: '',
    facts: '',
    strategic_notes: '',
  })

  function handleChange(field: string, value: string | null) {
    setFormData(prev => ({ ...prev, [field]: value ?? '' }))
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const newFiles = files.map(f => ({ file: f, name: f.name, size: f.size }))
    setPendingFiles(prev => [...prev, ...newFiles])
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => ({ file: f, name: f.name, size: f.size }))
      setPendingFiles(prev => [...prev, ...newFiles])
    }
    // Reset the input so the same file can be selected again if needed
    e.target.value = ''
  }

  function removeFile(idx: number) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function removePendingFile(idx: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function confirmAddFiles() {
    setUploadedFiles(prev => [...prev, ...pendingFiles])
    setPendingFiles([])
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function validateStep1() {
    if (!formData.title.trim()) { setError('Título é obrigatório.'); return false }
    if (!formData.demand_type) { setError('Tipo de documento é obrigatório.'); return false }
    if (!formData.area_of_law) { setError('Área do Direito é obrigatória.'); return false }
    setError('')
    return true
  }

  function validateStep2() {
    if (!formData.objective.trim()) { setError('Objetivo é obrigatório.'); return false }
    if (!formData.facts.trim()) { setError('Fatos relevantes são obrigatórios.'); return false }
    setError('')
    return true
  }

  function nextStep(e: React.MouseEvent) {
    e.preventDefault()
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(s => s + 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateStep2()) return
    if (!orgId) {
      setError('Organização não encontrada. Entre em contato com o suporte.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data: demand, error: demandError } = await supabase
      .from('demands')
      .insert({
        organization_id: orgId,
        created_by: userId,
        title: formData.title,
        demand_type: DEMAND_TYPE_MAP[formData.demand_type] || formData.demand_type,
        area_of_law: formData.area_of_law,
        urgency: URGENCY_MAP[formData.urgency] || formData.urgency,
        objective: formData.objective,
        facts: formData.facts,
        strategic_notes: formData.strategic_notes || null,
        status: 'received',
      })
      .select()
      .single()

    if (demandError) {
      setError('Erro ao criar demanda: ' + demandError.message)
      setLoading(false)
      return
    }

    // Upload files if any
    if (uploadedFiles.length > 0 && demand) {
      for (const uf of uploadedFiles) {
        const filePath = `${orgId}/${demand.id}/${Date.now()}-${uf.name}`
        const { error: uploadError } = await supabase.storage
          .from('demand-files')
          .upload(filePath, uf.file)

        if (!uploadError) {
          await supabase.from('demand_files').insert({
            demand_id: demand.id,
            organization_id: orgId,
            bucket_name: 'demand-files',
            storage_path: filePath,
            original_name: uf.name,
            mime_type: uf.file.type,
            size_bytes: uf.size,
          })
        }
      }
    }

    setSubmitted(true)
    setLoading(false)

    setTimeout(() => {
      router.push(`/demandas/${demand.id}`)
    }, 2000)
  }

  if (submitted) {
    return (
      <Card className="border-0" style={{ backgroundColor: '#112240' }}>
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#22c55e20' }}>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h3 className="text-white text-xl font-bold mb-2">Demanda criada com sucesso!</h3>
          <p className="text-gray-400">Redirecionando para o detalhe da demanda...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
              style={{
                backgroundColor: step >= s ? '#d4af37' : '#1e3a5f',
                color: step >= s ? '#0a192f' : '#64748b',
              }}
            >
              {s}
            </div>
            {s < 3 && (
              <div className="w-12 h-0.5 rounded" style={{ backgroundColor: step > s ? '#d4af37' : '#1e3a5f' }} />
            )}
          </div>
        ))}
        <div className="ml-4 text-gray-400 text-sm">
          {step === 1 && 'Informações Básicas'}
          {step === 2 && 'Briefing do Documento'}
          {step === 3 && 'Arquivos de Apoio'}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Step 1: Basic info */}
      {step === 1 && (
        <Card className="border-0" style={{ backgroundColor: '#112240' }}>
          <CardHeader>
            <CardTitle className="text-white text-lg">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Título da demanda <span className="text-red-400">*</span></Label>
              <Input
                placeholder="Ex: Contrato de Prestação de Serviços – Empresa ABC"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Tipo de Documento <span className="text-red-400">*</span></Label>
                <Select value={formData.demand_type} onValueChange={(v) => handleChange('demand_type', v)}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMAND_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Área do Direito <span className="text-red-400">*</span></Label>
                <Select value={formData.area_of_law} onValueChange={(v) => handleChange('area_of_law', v)}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20 text-white shadow-xl" style={{ backgroundColor: '#0d1f38', border: '1px solid rgba(255,255,255,0.15)' }}>
                    {AREAS_OF_LAW.map(a => (
                      <SelectItem 
                        key={a} 
                        value={a}
                        className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer py-2.5 px-3"
                        style={{ color: 'white' }}
                      >
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Urgência</Label>
              <Select value={formData.urgency} onValueChange={(v) => handleChange('urgency', v)}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Baixa – sem prazo imediumto</SelectItem>
                  <SelectItem value="medium">🔵 Média – prazo normal</SelectItem>
                  <SelectItem value="high">🟡 Alta – prazo curto</SelectItem>
                  <SelectItem value="urgent">🔴 Urgente – prazo imediumto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Briefing */}
      {step === 2 && (
        <Card className="border-0" style={{ backgroundColor: '#112240' }}>
          <CardHeader>
            <CardTitle className="text-white text-lg">Briefing do Documento</CardTitle>
            <p className="text-gray-400 text-sm">{formData.demand_type} · {formData.area_of_law}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">
                Objetivo do Documento <span className="text-red-400">*</span>
              </Label>
              <Textarea
                placeholder="Descreva o objetivo principal do documento. O que ele deve alcançar? Qual é o propósito jurídico?"
                value={formData.objective}
                onChange={(e) => handleChange('objective', e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">
                Fatos e Contexto Relevantes <span className="text-red-400">*</span>
              </Label>
              <Textarea
                placeholder="Descreva as partes envolvidas, o contexto do caso, datas importantes, valores, cláusulas específicas necessárias, etc."
                value={formData.facts}
                onChange={(e) => handleChange('facts', e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 min-h-[140px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">
                Notas Estratégicas{' '}
                <span className="text-gray-500 text-xs">(opcional)</span>
              </Label>
              <Textarea
                placeholder="Estratégia jurídica, pontos de atenção, tom desejado, precedentes relevantes..."
                value={formData.strategic_notes}
                onChange={(e) => handleChange('strategic_notes', e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: File upload */}
      {step === 3 && (
        <Card className="border-0" style={{ backgroundColor: '#112240' }}>
          <CardHeader>
            <CardTitle className="text-white text-lg">Arquivos de Apoio</CardTitle>
            <p className="text-gray-400 text-sm">Documentos, modelos ou referências que auxiliarão a produção.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className="relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer"
              style={{
                borderColor: dragOver ? '#d4af37' : 'rgba(255,255,255,0.15)',
                backgroundColor: dragOver ? '#d4af3708' : 'transparent',
              }}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
              <Upload className="h-8 w-8 mx-auto mb-3 text-gray-500" />
              <p className="text-gray-300 text-sm font-medium">
                {dragOver ? 'Solte os arquivos aqui' : 'Arraste arquivos aqui ou clique para selecionar'}
              </p>
              <p className="text-gray-600 text-xs mt-1">PDF, DOC, DOCX, TXT, JPG, PNG</p>
            </div>

            {/* Pending files - need confirmation */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">Arquivos selecionados ({pendingFiles.length}):</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingFiles([])}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      Cancelar todos
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={confirmAddFiles}
                      className="gold-btn text-xs"
                    >
                      Adicionar arquivos
                    </Button>
                  </div>
                </div>
                {pendingFiles.map((uf, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg"
                    style={{ backgroundColor: '#0a192f', border: '1px dashed #d4af3730' }}
                  >
                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{uf.name}</p>
                      <p className="text-gray-500 text-xs">{formatBytes(uf.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingFile(idx)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Confirmed files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Arquivos adicionados ({uploadedFiles.length}):</p>
                {uploadedFiles.map((uf, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg"
                    style={{ backgroundColor: '#0a192f' }}
                  >
                    <FileText className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{uf.name}</p>
                      <p className="text-gray-500 text-xs">{formatBytes(uf.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-gray-600 text-xs">
              Arquivos de apoio são opcionais. Eles serão usados como referência pelos agentes de IA na produção do documento.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={(e) => { e.preventDefault(); setStep(s => s - 1) }}
          disabled={step === 1}
          className="text-gray-400 hover:text-white"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>

        {step < 3 ? (
          <Button
            type="button"
            onClick={(e) => nextStep(e)}
            className="gold-btn font-semibold"
          >
            Próximo
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={loading}
            className="gold-btn font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Solicitação'
            )}
          </Button>
        )}
      </div>
    </form>
  )
}
