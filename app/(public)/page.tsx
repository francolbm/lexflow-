'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Shield, BarChart3, CheckCircle, ArrowRight, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'

const plans = [
  {
    name: 'Start', price: 'R$197', desc: 'Ideal para advogados autônomos', highlighted: false,
    features: ['10 demandas/mês', 'Todos os tipos de documentos', 'Suporte por e-mail', 'Dashboard completo', 'Histórico de versões'],
  },
  {
    name: 'Pro', price: 'R$497', desc: 'Para escritórios em crescimento', highlighted: true,
    features: ['30 demandas/mês', 'Todos os tipos de documentos', 'Suporte prioritário', 'Dashboard completo', 'Histórico de versões', 'Notas estratégicas', 'SLA garantido'],
  },
  {
    name: 'Premium', price: 'R$997', desc: 'Para grandes escritórios', highlighted: false,
    features: ['80 demandas/mês', 'Todos os tipos de documentos', 'Suporte dedicado 24/7', 'Dashboard completo', 'Histórico de versões', 'Notas estratégicas', 'SLA garantido', 'Relatórios avançados', 'Múltiplos usuários'],
  },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Carrossel de planos
  const trackRef = useRef<HTMLDivElement>(null)
  const [activePlan, setActivePlan] = useState(1) // começa no "Pro" (Mais Popular)

  const centerOn = (i: number, smooth = true) => {
    const track = trackRef.current
    if (!track) return
    const child = track.children[i] as HTMLElement | undefined
    if (!child) return
    const left = child.offsetLeft - (track.clientWidth - child.clientWidth) / 2
    track.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' })
  }

  const handlePlansScroll = () => {
    const track = trackRef.current
    if (!track) return
    const center = track.scrollLeft + track.clientWidth / 2
    let best = 0, bestDist = Infinity
    Array.from(track.children).forEach((c, i) => {
      const el = c as HTMLElement
      const cc = el.offsetLeft + el.clientWidth / 2
      const d = Math.abs(cc - center)
      if (d < bestDist) { bestDist = d; best = i }
    })
    setActivePlan(best)
  }

  useEffect(() => {
    const t = setTimeout(() => centerOn(1, false), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a192f' }}>
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-50" style={{ backgroundColor: '#0a192f' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Image src="/logo-eagle.png" alt="LexFlow" width={36} height={36} className="rounded" />
              <span className="text-xl font-bold text-white tracking-wide">LexFlow</span>
            </div>

            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#beneficios" className="text-gray-300 hover:text-white text-sm transition-colors">Benefícios</a>
              <a href="#planos" className="text-gray-300 hover:text-white text-sm transition-colors">Planos</a>
              <Link href="/login">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent text-sm">
                  Entrar
                </Button>
              </Link>
              <Link href="/cadastro">
                <Button className="gold-btn text-sm">Começar grátis</Button>
              </Link>
            </nav>

            {/* Botão hambúrguer mobile */}
            <button
              className="md:hidden text-white p-2 rounded-md hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Menu mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10" style={{ backgroundColor: '#0d1f38' }}>
            <div className="px-4 py-4 flex flex-col gap-1">
              <a
                href="#beneficios"
                className="text-gray-300 hover:text-white text-sm py-3 px-3 rounded-md hover:bg-white/5 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Benefícios
              </a>
              <a
                href="#planos"
                className="text-gray-300 hover:text-white text-sm py-3 px-3 rounded-md hover:bg-white/5 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Planos
              </a>
              <div className="border-t border-white/10 mt-2 pt-3 flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent text-sm">
                    Entrar
                  </Button>
                </Link>
                <Link href="/cadastro" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full gold-btn text-sm font-semibold">
                    Começar grátis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo águia em destaque */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo-eagle.png"
              alt="LexFlow"
              width={160}
              height={160}
              className="rounded-2xl shadow-2xl"
              style={{ border: '2px solid #d4af3740' }}
            />
          </div>
          <Badge className="mb-6 text-sm px-4 py-1.5" style={{ backgroundColor: '#d4af3720', color: '#d4af37', border: '1px solid #d4af3740' }}>
            IA Jurídica de Última Geração
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Documentos jurídicos produzidos por{' '}
            <span style={{ color: '#d4af37' }}>agentes de IA especializados</span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            O LexFlow utiliza agentes de IA jurídica de última geração para produzir contratos, petições,
            pareceres e muito mais — com rastreabilidade total, revisão pelo advogado do escritório e qualidade garantida.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro">
              <Button size="lg" className="gold-btn text-base px-8 py-6 font-semibold w-full sm:w-auto">
                Solicitar Acesso
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#planos">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent text-base px-8 py-6 w-full sm:w-auto">
                Ver Planos
              </Button>
            </a>
          </div>
          <p className="text-gray-500 text-sm mt-6">Sem fidelidade. Cancele quando quiser.</p>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#0d1f38' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-4">
              Por que escolher o <span style={{ color: '#d4af37' }}>LexFlow</span>?
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Desenvolvido especialmente para advogados que valorizam tempo, qualidade e controle.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 text-center" style={{ backgroundColor: '#112240' }}>
              <CardHeader>
                <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#d4af3720' }}>
                  <Zap className="h-7 w-7" style={{ color: '#d4af37' }} />
                </div>
                <CardTitle className="text-white text-xl">Agilidade</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 leading-relaxed">
                  Envie um briefing e receba a minuta em horas. Nossos agentes de IA jurídica produzem o documento com velocidade e precisão — você revisa e aprova.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 text-center" style={{ backgroundColor: '#112240' }}>
              <CardHeader>
                <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#d4af3720' }}>
                  <Shield className="h-7 w-7" style={{ color: '#d4af37' }} />
                </div>
                <CardTitle className="text-white text-xl">Padronização</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 leading-relaxed">
                  Inteligência artificial treinada em jurisprudência e legislação brasileira. Documentos com linguagem técnica precisa e formatação profissional.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 text-center" style={{ backgroundColor: '#112240' }}>
              <CardHeader>
                <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#d4af3720' }}>
                  <BarChart3 className="h-7 w-7" style={{ color: '#d4af37' }} />
                </div>
                <CardTitle className="text-white text-xl">Controle</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 leading-relaxed">
                  Dashboard completo com histórico de demandas, status em tempo real, comentários e aprovação de minutas — tudo em um lugar.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="planos" className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#0a192f' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-4">
              Planos e <span style={{ color: '#d4af37' }}>Preços</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Escolha o plano ideal para o volume de demandas do seu escritório.
            </p>
          </div>
          <div className="relative max-w-5xl mx-auto">
            {/* Seta anterior */}
            <button
              onClick={() => centerOn(Math.max(0, activePlan - 1))}
              disabled={activePlan === 0}
              aria-label="Plano anterior"
              className="hidden sm:flex absolute -left-2 lg:-left-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full border transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ borderColor: '#d4af3766', backgroundColor: '#0a192fcc', color: '#d4af37', backdropFilter: 'blur(4px)' }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Trilho do carrossel */}
            <div
              ref={trackRef}
              onScroll={handlePlansScroll}
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth py-8 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {plans.map((plan, i) => (
                <div
                  key={plan.name}
                  className={`snap-center shrink-0 w-[80%] sm:w-[340px] transition-all duration-300 ease-out ${i === activePlan ? 'scale-105' : 'scale-95 opacity-70'}`}
                >
                  <Card
                    className="relative h-full"
                    style={{
                      backgroundColor: '#112240',
                      border: plan.highlighted ? '2px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: i === activePlan ? '0 24px 55px -14px rgba(212,175,55,0.4)' : 'none',
                    }}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <Badge style={{ backgroundColor: '#d4af37', color: '#0a192f' }} className="font-semibold px-4 py-1">
                          Mais Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-4 pt-6">
                      <CardTitle className={`text-lg font-medium ${plan.highlighted ? 'text-white' : 'text-gray-300'}`}>
                        {plan.name}
                      </CardTitle>
                      <div className="mt-3">
                        <span className="text-4xl font-bold text-white">{plan.price}</span>
                        <span className="text-gray-400 ml-1">/mês</span>
                      </div>
                      <p className={`text-sm mt-2 ${plan.highlighted ? 'text-gray-400' : 'text-gray-500'}`}>{plan.desc}</p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#d4af37' }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Link href="/cadastro">
                        <Button className="w-full gold-btn font-semibold">Começar agora</Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {/* Seta próxima */}
            <button
              onClick={() => centerOn(Math.min(plans.length - 1, activePlan + 1))}
              disabled={activePlan === plans.length - 1}
              aria-label="Próximo plano"
              className="hidden sm:flex absolute -right-2 lg:-right-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full border transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ borderColor: '#d4af3766', backgroundColor: '#0a192fcc', color: '#d4af37', backdropFilter: 'blur(4px)' }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Indicadores (dots) */}
            <div className="flex justify-center gap-2.5 mt-6">
              {plans.map((plan, i) => (
                <button
                  key={plan.name}
                  onClick={() => centerOn(i)}
                  aria-label={`Ver plano ${plan.name}`}
                  className="h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === activePlan ? '1.75rem' : '0.625rem',
                    backgroundColor: i === activePlan ? '#d4af37' : 'rgba(255,255,255,0.25)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#060f1e' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Image src="/logo-eagle.png" alt="LexFlow" width={28} height={28} className="rounded" />
              <span className="text-white font-bold">LexFlow</span>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs max-w-2xl leading-relaxed">
                <strong className="text-gray-400">Aviso Jurídico:</strong> O LexFlow é uma plataforma de produção documental jurídica por agentes de IA especializados.
                Todos os documentos gerados pelos agentes de IA atuam como suporte técnico-documental e devem ser revisados e aprovados pelo advogado do escritório contratante.
                A validação jurídica final, análise de mérito e responsabilidade profissional são
                de competência exclusiva do advogado contratante, nos termos do Estatuto da OAB e da Resolução CNJ nº 615/2025.
              </p>
            </div>
            <div className="flex gap-4 text-gray-500 text-xs">
              <Link href="/termos" className="hover:text-gray-300 transition-colors">Termos de Uso</Link>
              <Link href="/privacidade" className="hover:text-gray-300 transition-colors">Privacidade</Link>
              <a href="mailto:contato@lexflow.com.br" className="hover:text-gray-300 transition-colors">Contato</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 text-center text-gray-600 text-xs">
            © {new Date().getFullYear()} LexFlow. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
