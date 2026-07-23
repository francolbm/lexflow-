'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Trash2, Mail, Shield, Loader2, Users, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

interface Member {
  id: string
  user_id: string
  organization_id: string
  role: string
  status: string
  created_at: string
  profiles: {
    full_name: string
    email: string
    oab_number: string | null
    cpf: string | null
  }
}

interface Organization {
  id: string
  name: string
  slug: string
  responsible_lawyer_id?: string | null
}

export default function MembrosPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params.id as string

  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberCpf, setNewMemberCpf] = useState('')
  const [newMemberOab, setNewMemberOab] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('lawyer')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function loadData() {
    try {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (orgData) setOrg(orgData)

      const { data: membersData } = await supabase
        .from('organization_members')
        .select('*, profiles(full_name, email, oab_number, cpf)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })

      if (membersData) setMembers(membersData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // CPF mask and validation
  function formatCpf(digits: string): string {
    const d = digits.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
  }

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    setNewMemberCpf(raw)
  }

  function handleCpfBlur() {
    const digits = newMemberCpf.replace(/\D/g, '')
    setNewMemberCpf(formatCpf(digits))
  }

  function validateCpf(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) return false
    if (/^(\d)\1{10}$/.test(digits)) return false

    // Validate first digit
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (10 - i)
    }
    let digit1 = sum % 11
    digit1 = digit1 < 2 ? 0 : 11 - digit1
    if (parseInt(digits[9]) !== digit1) return false

    // Validate second digit
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i]) * (11 - i)
    }
    let digit2 = sum % 11
    digit2 = digit2 < 2 ? 0 : 11 - digit2
    if (parseInt(digits[10]) !== digit2) return false

    return true
  }

  function getCpfError(): string | null {
    if (!newMemberCpf || newMemberCpf.length === 0) return null
    const digits = newMemberCpf.replace(/\D/g, '')
    if (digits.length < 11) return 'CPF incompleto'
    if (!validateCpf(newMemberCpf)) return 'CPF inválido'
    return null
  }

  async function addMember() {
    if (!newMemberEmail || !newMemberName) {
      setError('Preencha o nome e e-mail do membro')
      return
    }
    if (newMemberCpf && getCpfError()) {
      setError('CPF inválido. Verifique o número e tente novamente.')
      return
    }
    if (newMemberRole === 'lawyer' && !newMemberOab.trim()) {
      setError('A OAB é obrigatória para cadastrar um Advogado.')
      return
    }

    setAdding(true)
    setError('')
    setCreatedPassword(null)

    try {
      // A criação da conta e o vínculo são feitos no servidor (service role),
      // com gate de plano PRO/PREMIUM. Se o e-mail já existir, apenas vincula.
      const res = await fetch('/api/escritorio/membros/criar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orgId,
          email: newMemberEmail,
          fullName: newMemberName,
          cpf: newMemberCpf || null,
          oabNumber: newMemberRole === 'lawyer' ? newMemberOab : null,
          orgRole: newMemberRole,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar membro')
        setAdding(false)
        return
      }

      if (data.invited) {
        setSuccess(data.message || 'Convite enviado por e-mail. O membro define a senha pelo link recebido.')
      } else if (data.tempPassword) {
        setCreatedPassword(data.tempPassword)
        setSuccess('Conta criada! O convite por e-mail ainda não está configurado — repasse a senha temporária abaixo com segurança.')
      } else {
        setSuccess('Membro vinculado com sucesso!')
      }

      setNewMemberEmail('')
      setNewMemberName('')
      setNewMemberCpf('')
      setNewMemberOab('')
      setNewMemberRole('lawyer')
      setShowAddForm(false)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar membro')
    } finally {
      setAdding(false)
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Tem certeza que deseja remover este membro?')) return

    try {
      const { error: removeError } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (removeError) throw removeError

      setSuccess('Membro removido com sucesso!')
      loadData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao remover membro')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
        <Loader2 className='h-8 w-8 animate-spin' style={{ color: '#d4af37' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#060f1e', padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link 
          href='/admin/escritorios' 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', marginBottom: '1rem', fontSize: '0.875rem' }}
        >
          <ArrowLeft className='h-4 w-4' />
          Voltar para Escritórios
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
              {org?.name || 'Escritório'}
            </h1>
            <p style={{ color: '#9ca3af', marginTop: '0.25rem' }}>Gerenciar membros do escritório</p>
          </div>
          
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className='gold-btn'
          >
            <UserPlus className='h-4 w-4 mr-2' />
            Adicionar Membro
          </Button>
        </div>
      </div>

      {success && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#4ade80', fontSize: '0.875rem' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {createdPassword && (
        <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}>
          <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Senha temporária do novo membro</p>
          <p style={{ color: '#9ca3af', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
            Repasse com segurança. O membro deve trocá-la no primeiro acesso.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <code style={{ color: 'white', backgroundColor: '#0a192f', padding: '0.4rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.95rem', letterSpacing: '0.05em' }}>{createdPassword}</code>
            <Button variant='outline' size='sm' onClick={() => navigator.clipboard?.writeText(createdPassword)} className='border-white/20 text-gray-300'>Copiar</Button>
            <Button variant='ghost' size='sm' onClick={() => setCreatedPassword(null)} className='text-gray-500' style={{ marginLeft: 'auto' }}>Fechar</Button>
          </div>
        </div>
      )}

      {showAddForm && (
        <Card className='border-0 mb-6' style={{ backgroundColor: '#0d1f38' }}>
          <CardHeader className='pb-3'>
            <CardTitle style={{ color: 'white', fontSize: '1.125rem' }}>Novo Membro</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className='space-y-2'>
                <Label className='text-gray-300 text-sm'>Nome completo</Label>
                <Input
                  placeholder='Nome do membro'
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className='bg-white/5 border-white/20 text-white placeholder:text-gray-500'
                />
              </div>
              
              <div className='space-y-2'>
                <Label className='text-gray-300 text-sm'>E-mail</Label>
                <Input
                  type='email'
                  placeholder='email@exemplo.com'
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className='bg-white/5 border-white/20 text-white placeholder:text-gray-500'
                />
              </div>
              
              <div className='space-y-2'>
                <Label className='text-gray-300 text-sm'>CPF</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder='000.000.000-00'
                  value={newMemberCpf}
                  onChange={handleCpfChange}
                  onBlur={handleCpfBlur}
                  autoComplete="off"
                  className={`bg-white/5 text-white placeholder:text-gray-500 ${getCpfError() ? 'border-red-500/50' : 'border-white/20'}`}
                />
                {getCpfError() && (
                  <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.25rem' }}>{getCpfError()}</p>
                )}
              </div>

              {newMemberRole === 'lawyer' && (
                <div className='space-y-2'>
                  <Label className='text-gray-300 text-sm'>OAB</Label>
                  <Input
                    placeholder='Número da OAB'
                    value={newMemberOab}
                    onChange={(e) => setNewMemberOab(e.target.value)}
                    className='bg-white/5 border-white/20 text-white placeholder:text-gray-500'
                  />
                </div>
              )}

              <div className='space-y-2'>
                <Label className='text-gray-300 text-sm'>Cargo</Label>
                <Select value={newMemberRole} onValueChange={(v) => v && setNewMemberRole(v)}>
                  <SelectTrigger style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                    <SelectValue placeholder='Selecione o cargo' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='lawyer'>Advogado</SelectItem>
                    <SelectItem value='assistant'>Assistente</SelectItem>
                    <SelectItem value='admin'>Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <Button 
                onClick={addMember}
                disabled={adding}
                className='gold-btn'
              >
                {adding ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <UserPlus className='h-4 w-4 mr-2' />
                    Adicionar
                  </>
                )}
              </Button>
              <Button 
                variant='outline'
                onClick={() => {
                  setShowAddForm(false)
                  setError('')
                }}
                className='border-white/20 text-gray-400'
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {members.length === 0 ? (
        <Card className='border-0' style={{ backgroundColor: '#0d1f38' }}>
          <CardContent style={{ textAlign: 'center', padding: '4rem' }}>
            <Users className='h-10 w-10 mx-auto mb-3' style={{ color: '#374151' }} />
            <p style={{ color: '#9ca3af' }}>Nenhum membro cadastrado ainda</p>
            <p style={{ color: '#4b5563', fontSize: '0.875rem', marginTop: '0.25rem' }}>Clique em &quot;Adicionar Membro&quot; para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {members.map((member) => (
            <Card key={member.id} className='border-0' style={{ backgroundColor: '#0d1f38' }}>
              <CardContent style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'rgba(212, 175, 55, 0.125)', color: '#d4af37' }}>
                      {member.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p style={{ color: 'white', fontWeight: 500 }}>{member.profiles?.full_name || 'Nome não disponível'}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Mail className='h-3 w-3' />
                          {member.profiles?.email || '—'}
                        </span>
                        {member.profiles?.cpf && (
                          <span style={{ color: '#6b7280', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <FileText className='h-3 w-3' />
                            {member.profiles.cpf}
                          </span>
                        )}
                        {member.profiles?.oab_number && (
                          <Badge variant='outline' style={{ fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.2)', color: '#9ca3af' }}>
                            OAB: {member.profiles.oab_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {org?.responsible_lawyer_id && member.user_id === org.responsible_lawyer_id && (
                      <Badge style={{ fontSize: '0.75rem', border: 0, backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                        Responsável
                      </Badge>
                    )}
                    <Badge style={{ fontSize: '0.75rem', border: 0, backgroundColor: member.role === 'admin' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: member.role === 'admin' ? '#fbbf24' : '#60a5fa' }}>
                      <Shield className='h-3 w-3 mr-1' />
                      {member.role === 'admin' ? 'Administrador' : member.role === 'lawyer' ? 'Advogado' : member.role === 'assistant' ? 'Assistente' : member.role}
                    </Badge>
                    
                    <Badge style={{ fontSize: '0.75rem', border: 0, backgroundColor: member.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: member.status === 'active' ? '#4ade80' : '#f87171' }}>
                      {member.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => removeMember(member.id)}
                      style={{ color: '#6b7280' }}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0d1f38' }}>
        <h3 style={{ color: 'white', fontWeight: 500, marginBottom: '0.5rem' }}>ℹ️ Como adicionar membros</h3>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
          Cadastre Advogados e Assistentes do seu escritório. Se o e-mail ainda não tiver conta,
          o sistema envia um <strong>convite por e-mail</strong> para o membro definir a própria
          senha. (Enquanto o e-mail não estiver configurado, o sistema mostra uma senha temporária
          para repasse.) Recurso disponível nos planos PRO e PREMIUM. Advogados exigem número da OAB.
        </p>
      </div>
    </div>
  )
}