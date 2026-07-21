'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Scale, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function CadastroPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    oabNumber: '',
    acceptedTerms: false,
    planType: 'free',
    cnpj: '',
    razaoSocial: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = e.target as HTMLInputElement | HTMLSelectElement
    const { name, value, type } = target
    const checked = target.type === 'checkbox' ? (target as HTMLInputElement).checked : undefined
    
    // Apply mask for CNPJ field
    let newValue = type === 'checkbox' ? checked : value
    if (name === 'cnpj') {
      newValue = formatCnpj(value as string)
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }))
  }

  function formatCnpj(value: string): string {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
  }

  function validarCnpj(cnpj: string): boolean {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) return false

    // Validate first check digit
    let sum = 0
    let factor = 5
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * factor
      factor = factor === 2 ? 9 : factor - 1
    }
    let digit1 = sum % 11
    digit1 = digit1 < 2 ? 0 : 11 - digit1
    if (parseInt(digits[12]) !== digit1) return false

    // Validate second check digit
    sum = 0
    factor = 6
    for (let i = 0; i < 13; i++) {
      sum += parseInt(digits[i]) * factor
      factor = factor === 2 ? 9 : factor - 1
    }
    let digit2 = sum % 11
    digit2 = digit2 < 2 ? 0 : 11 - digit2
    if (parseInt(digits[13]) !== digit2) return false

    return true
  }

  function getCnpjError(): string | null {
    if (!formData.cnpj || formData.cnpj.length === 0) return null
    const digits = formData.cnpj.replace(/\D/g, '')
    if (digits.length < 14) return 'CNPJ incompleto'
    if (!validarCnpj(formData.cnpj)) return 'CNPJ inválido'
    return null
  }

  async function buscarCep(cep: string) {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await response.json()

      if (data.erro) {
        setError('CEP não encontrado')
        return
      }

      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      }))
    } catch {
      setError('Erro ao buscar CEP')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.acceptedTerms) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade.')
      return
    }
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    
    // Validate CNPJ for PRO/PREMIUM plans
    if (['pro', 'premium'].includes(formData.planType)) {
      if (!formData.cnpj) {
        setError('CNPJ é obrigatório para planos PRO ou PREMIUM')
        return
      }
      if (!validarCnpj(formData.cnpj)) {
        setError('CNPJ inválido. Verifique o número e tente novamente.')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          oabNumber: formData.oabNumber,
          planType: formData.planType,
          cnpj: formData.cnpj,
          razaoSocial: formData.razaoSocial,
          cep: formData.cep,
          logradouro: formData.logradouro,
          numero: formData.numero,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Erro ao criar conta')
        setLoading(false)
        return
      }

      // Redirect to login after successful signup
      setError('')
      setLoading(false)
      router.push('/login?registered=true')
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#0a192f' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <Scale className="h-8 w-8 group-hover:scale-110 transition-transform" style={{ color: '#d4af37' }} />
            <span className="text-2xl font-bold text-white tracking-wide">LexFlow</span>
          </Link>
        </div>

        <Card className="border border-white/10 shadow-2xl" style={{ backgroundColor: '#112240' }}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-white text-2xl">Criar conta gratuita</CardTitle>
            <CardDescription className="text-gray-400">
              Comece a usar o LexFlow hoje mesmo
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-300 text-sm">
                  Nome completo <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Dr. João Silva"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 text-sm">
                  E-mail <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com.br"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 text-sm">
                  Senha <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Plan Selection */}
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">
                  Selecione seu plano{' '}
                  <span className="text-gray-500 text-xs">(criar escritório só em PRO ou PREMIUM)</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'free', label: 'Grátis', desc: 'Advogado individual', hasOffice: false },
                    { value: 'starter', label: 'Starter', desc: 'Para começar', hasOffice: false },
                    { value: 'pro', label: 'PRO', desc: 'Criar escritório', hasOffice: true },
                    { value: 'premium', label: 'PREMIUM', desc: 'Volume máximo', hasOffice: true },
                  ].map(plan => (
                    <button
                      key={plan.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, planType: plan.value }))}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        formData.planType === plan.value
                          ? 'border-yellow-500/50 bg-yellow-500/10'
                          : 'border-white/20 bg-white/5 hover:border-white/40'
                      }`}
                    >
                      <div className={`text-sm font-medium ${
                        formData.planType === plan.value ? 'text-yellow-300' : 'text-white'
                      }`}>
                        {plan.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {plan.desc}
                      </div>
                      {plan.hasOffice && (
                        <div className="text-xs mt-1" style={{ color: '#d4af37' }}>
                          📁 Criar escritório
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* CNPJ Section - Only for PRO/PREMIUM */}
              {['pro', 'premium'].includes(formData.planType) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj" className="text-gray-300 text-sm">
                      CNPJ <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="cnpj"
                      name="cnpj"
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={formData.cnpj}
                      onChange={handleChange}
                      className={`bg-white/5 text-white placeholder:text-gray-500 ${
                        getCnpjError() ? 'border-red-500/50' : 'border-white/20'
                      }`}
                    />
                    {getCnpjError() && (
                      <p className="text-red-400 text-xs mt-1">{getCnpjError()}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="razaoSocial" className="text-gray-300 text-sm">
                      Razão Social <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="razaoSocial"
                      name="razaoSocial"
                      type="text"
                      placeholder="Nome da empresa no contrato social"
                      value={formData.razaoSocial}
                      onChange={handleChange}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                    />
                  </div>

                  {/* CEP and Address */}
                  <div className="space-y-2">
                    <Label htmlFor="cep" className="text-gray-300 text-sm">
                      CEP <span className="text-red-400">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="cep"
                        name="cep"
                        type="text"
                        placeholder="00000-000"
                        value={formData.cep}
                        onChange={handleChange}
                        onBlur={() => buscarCep(formData.cep)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => buscarCep(formData.cep)}
                        className="border-white/20 text-gray-400 hover:text-white"
                      >
                        Buscar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logradouro" className="text-gray-300 text-sm">
                      Endereço <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="logradouro"
                      name="logradouro"
                      type="text"
                      placeholder="Rua, Avenida, etc."
                      value={formData.logradouro}
                      onChange={handleChange}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="numero" className="text-gray-300 text-sm">
                        Número <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="numero"
                        name="numero"
                        type="text"
                        placeholder="123"
                        value={formData.numero}
                        onChange={handleChange}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complemento" className="text-gray-300 text-sm">
                        Compl.
                      </Label>
                      <Input
                        id="complemento"
                        name="complemento"
                        type="text"
                        placeholder="Sala 1"
                        value={formData.complemento}
                        onChange={handleChange}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bairro" className="text-gray-300 text-sm">
                      Bairro <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="bairro"
                      name="bairro"
                      type="text"
                      placeholder="Centro"
                      value={formData.bairro}
                      onChange={handleChange}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="cidade" className="text-gray-300 text-sm">
                        Cidade <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="cidade"
                        name="cidade"
                        type="text"
                        placeholder="São Paulo"
                        value={formData.cidade}
                        onChange={handleChange}
                        className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado" className="text-gray-300 text-sm">
                        Estado <span className="text-red-400">*</span>
                      </Label>
                      <select
                        id="estado"
                        name="estado"
                        value={formData.estado}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white"
                        required
                      >
                        <option value="">UF</option>
                        <option value="AC">AC</option>
                        <option value="AL">AL</option>
                        <option value="AP">AP</option>
                        <option value="AM">AM</option>
                        <option value="BA">BA</option>
                        <option value="CE">CE</option>
                        <option value="DF">DF</option>
                        <option value="ES">ES</option>
                        <option value="GO">GO</option>
                        <option value="MA">MA</option>
                        <option value="MT">MT</option>
                        <option value="MS">MS</option>
                        <option value="MG">MG</option>
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PR">PR</option>
                        <option value="PE">PE</option>
                        <option value="PI">PI</option>
                        <option value="RJ">RJ</option>
                        <option value="RN">RN</option>
                        <option value="RS">RS</option>
                        <option value="RO">RO</option>
                        <option value="RR">RR</option>
                        <option value="SC">SC</option>
                        <option value="SP">SP</option>
                        <option value="SE">SE</option>
                        <option value="TO">TO</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="oabNumber" className="text-gray-300 text-sm">
                  Número da OAB{' '}
                  <span className="text-gray-500 text-xs">(opcional)</span>
                </Label>
                <Input
                  id="oabNumber"
                  name="oabNumber"
                  type="text"
                  placeholder="Ex: SP 123456"
                  value={formData.oabNumber}
                  onChange={handleChange}
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="flex items-start gap-3 pt-2">
                <input
                  id="acceptedTerms"
                  name="acceptedTerms"
                  type="checkbox"
                  checked={formData.acceptedTerms}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-white/20 cursor-pointer"
                  required
                />
                <Label htmlFor="acceptedTerms" className="text-gray-400 text-sm leading-relaxed cursor-pointer">
                  Li e concordo com os{' '}
                  <a href="/termos" target="_blank" className="underline" style={{ color: '#d4af37' }}>Termos de Uso</a>
                  {' '}e a{' '}
                  <a href="/privacidade" target="_blank" className="underline" style={{ color: '#d4af37' }}>Política de Privacidade</a>
                  . <span className="text-red-400">*</span>
                </Label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gold-btn font-semibold py-5 text-base mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Criar conta'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-500 text-sm">
                Já tem uma conta?{' '}
                <Link href="/login" className="font-medium hover:underline" style={{ color: '#d4af37' }}>
                  Fazer login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
