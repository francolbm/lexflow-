'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Scale, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Conta criada com sucesso! Faça login para continuar.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos. Verifique suas credenciais.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'operador' || profile?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }
    router.refresh()
  }

  return (
    <div className='min-h-screen flex items-center justify-center px-4' style={{ backgroundColor: '#0a192f' }}>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <Link href='/' className='inline-flex items-center gap-2 group'>
            <Scale className='h-8 w-8 group-hover:scale-110 transition-transform' style={{ color: '#d4af37' }} />
            <span className='text-2xl font-bold text-white tracking-wide'>LexFlow</span>
          </Link>
        </div>

        <Card className='border border-white/10 shadow-2xl' style={{ backgroundColor: '#112240' }}>
          <CardHeader className='text-center pb-2'>
            <CardTitle className='text-white text-2xl'>Bem-vindo de volta</CardTitle>
            <CardDescription className='text-gray-400'>
              Entre na sua conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-4'>
            <form onSubmit={handleLogin} className='space-y-5'>
              {successMessage && (
                <div className='bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-green-400 text-sm'>
                  {successMessage}
                </div>
              )}
              {error && (
                <div className='bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm'>
                  {error}
                </div>
              )}

              <div className='space-y-2'>
                <Label htmlFor='email' className='text-gray-300 text-sm'>E-mail</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='seu@email.com.br'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className='bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='password' className='text-gray-300 text-sm'>Senha</Label>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder='••••••••'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className='bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-yellow-500/50 pr-10'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors'
                  >
                    {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                  </button>
                </div>
              </div>

              <Button
                type='submit'
                disabled={loading}
                className='w-full gold-btn font-semibold py-5 text-base'
              >
                {loading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className='mt-6 text-center'>
              <div className='text-center'>
                <Link href='/recuperar-senha' className='text-gray-400 text-sm hover:underline' style={{ color: '#d4af37' }}>
                  Esqueci minha senha
                </Link>
              </div>

              <div className='mt-4 text-center'>
                <p className='text-gray-500 text-sm'>
                  Não tem uma conta?{' '}
                  <Link href='/cadastro' className='font-medium hover:underline' style={{ color: '#d4af37' }}>
                    Cadastre-se
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className='text-center text-gray-600 text-xs mt-6 max-w-sm mx-auto'>
          Ao acessar, você confirma que é um profissional do direito habilitado pela OAB.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className='min-h-screen flex items-center justify-center px-4' style={{ backgroundColor: '#0a192f' }}>
        <div className='text-white'>Carregando...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
