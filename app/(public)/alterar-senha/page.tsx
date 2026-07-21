'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Scale, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function AlterarSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        setError('Link expirado ou invalido. Solicite uma nova recuperacao de senha.')
      }
      setSessionChecked(true)
    }
    checkSession()
  }, [])

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('As senhas nao coincidem.')
      return
    }
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Nao foi possivel alterar a senha. Tente novamente.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (!sessionChecked) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{ backgroundColor: '#0a192f' }}>
        <Loader2 className='h-8 w-8 animate-spin' style={{ color: '#d4af37' }} />
      </div>
    )
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
            <CardTitle className='text-white text-2xl'>Nova Senha</CardTitle>
            <CardDescription className='text-gray-400'>
              {success ? 'Senha alterada com sucesso!' : 'Digite sua nova senha'}
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-4'>
            {success ? (
              <div className='text-center py-6'>
                <CheckCircle className='h-16 w-16 mx-auto mb-4' style={{ color: '#22c55e' }} />
                <p className='text-gray-300 mb-4'>
                  Sua senha foi alterada com sucesso!
                </p>
                <div className='mt-6'>
                  <Link href='/login'>
                    <Button className='gold-btn font-semibold py-5 text-base'>
                      Ir para Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className='space-y-5'>
                {error && (
                  <div className='bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center gap-2'>
                    <AlertCircle className='h-4 w-4' />
                    {error}
                  </div>
                )}

                <div className='space-y-2'>
                  <Label htmlFor='password' className='text-gray-300 text-sm'>Nova Senha</Label>
                  <Input
                    id='password'
                    type='password'
                    placeholder='xxxxxxxx'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className='bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='confirmPassword' className='text-gray-300 text-sm'>Confirmar Senha</Label>
                  <Input
                    id='confirmPassword'
                    type='password'
                    placeholder='xxxxxxxx'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className='bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20'
                  />
                </div>

                <Button
                  type='submit'
                  disabled={loading}
                  className='w-full gold-btn font-semibold py-5 text-base'
                >
                  {loading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Alterando...
                    </>
                  ) : (
                    'Alterar Senha'
                  )}
                </Button>
              </form>
            )}

            <div className='mt-6 text-center'>
              <p className='text-gray-500 text-sm'>
                <Link href='/login' className='font-medium hover:underline' style={{ color: '#d4af37' }}>
                  Voltar ao Login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}