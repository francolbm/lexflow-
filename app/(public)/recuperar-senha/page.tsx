'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Scale, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/alterar-senha`,
    })

    if (error) {
      setError('Nao foi possivel enviar o e-mail de recuperacao. Verifique se o e-mail esta correto.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
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
            <CardTitle className='text-white text-2xl'>Recuperar Senha</CardTitle>
            <CardDescription className='text-gray-400'>
              {success ? 'E-mail enviado com sucesso!' : 'Digite seu e-mail para receber as instrucoes'}
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-4'>
            {success ? (
              <div className='text-center py-6'>
                <CheckCircle className='h-16 w-16 mx-auto mb-4' style={{ color: '#22c55e' }} />
                <p className='text-gray-300 mb-4'>
                  Enviamos um link de recuperacao para <strong className='text-white'>{email}</strong>
                </p>
                <p className='text-gray-500 text-sm'>
                  Verifique sua caixa de entrada e spam. O link expira em 1 hora.
                </p>
                <div className='mt-6'>
                  <Link href='/login'>
                    <Button variant='outline' className='border-white/20 text-white hover:bg-white/10'>
                      Voltar ao Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRecovery} className='space-y-5'>
                {error && (
                  <div className='bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm'>
                    {error}
                  </div>
                )}

                <div className='space-y-2'>
                  <Label htmlFor='email' className='text-gray-300 text-sm'>E-mail cadastrado</Label>
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

                <Button
                  type='submit'
                  disabled={loading}
                  className='w-full gold-btn font-semibold py-5 text-base'
                >
                  {loading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Link de Recuperacao'
                  )}
                </Button>
              </form>
            )}

            <div className='mt-6 text-center'>
              <p className='text-gray-500 text-sm'>
                Lembrou sua senha?{' '}
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