'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function TermosDeUso() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a192f' }}>
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-50" style={{ backgroundColor: '#0a192f' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo-eagle.png" alt="LexFlow" width={36} height={36} className="rounded" />
              <span className="text-xl font-bold text-white tracking-wide">LexFlow</span>
            </Link>
            <Link href="/cadastro">
              <button className="text-sm px-4 py-2 rounded-md font-semibold" style={{ backgroundColor: '#d4af37', color: '#0a192f' }}>
                Criar conta
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl p-8 sm:p-12" style={{ backgroundColor: '#112240' }}>
          {/* Título */}
          <div className="mb-10 pb-6 border-b border-white/10">
            <p className="text-sm font-semibold mb-2" style={{ color: '#d4af37' }}>Documento Legal</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Termos de Uso</h1>
            <p className="text-gray-400 text-sm">Última atualização: maio de 2026 · Versão 1.0</p>
          </div>

          <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed space-y-8">

            {/* Aviso jurídico */}
            <div className="rounded-lg p-5 border-l-4" style={{ backgroundColor: '#0a192f', borderLeftColor: '#d4af37' }}>
              <p className="text-sm font-semibold text-white mb-2">⚠️ Aviso Importante</p>
              <p className="text-sm text-gray-400">
                A plataforma LexFlow é um serviço de produção documental jurídica por <strong className="text-white">agentes de IA especializados em direito</strong>.
                Nenhum conteúdo gerado pelos agentes de IA constitui assessoria jurídica, parecer ou opinião legal.
                A responsabilidade técnica, ética e profissional sobre os documentos produzidos é
                <strong className="text-white"> exclusivamente do advogado responsável pela revisão e aprovação</strong>, nos termos do Estatuto da OAB e da Resolução CNJ nº 615/2025.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Identificação e Aceitação</h2>
              <p>
                Estes Termos de Uso regulam o acesso e a utilização da plataforma <strong className="text-white">LexFlow</strong>, 
                de titularidade de Franco Luiz Bianchini Maciel, doravante denominada <em>&quot;LexFlow&quot;</em> ou <em>&quot;Plataforma&quot;</em>.
              </p>
              <p className="mt-3">
                Ao realizar o cadastro e utilizar a Plataforma, o Usuário declara ter lido, compreendido e aceito integralmente 
                estes Termos de Uso e a Política de Privacidade, comprometendo-se a cumpri-los em sua totalidade.
              </p>
              <p className="mt-3">
                Caso não concorde com qualquer disposição destes Termos, o Usuário deve abster-se de utilizar a Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. Definições</h2>
              <ul className="space-y-2 list-none">
                {[
                  ['Plataforma', 'Sistema web LexFlow, disponível em ayuilfql.gensparkclaw.com e domínios associados.'],
                  ['Usuário', 'Advogado, bacharel em direito ou escritório de advocacia que utiliza a Plataforma mediante cadastro.'],
                  ['Demanda', 'Solicitação de produção documental jurídica enviada pelo Usuário à Plataforma.'],
                  ['Minuta', 'Documento jurídico produzido pelos Agentes de IA LexFlow como apoio técnico, sujeito à revisão e aprovação obrigatória do advogado do escritório contratante.'],
                  ['Agente de IA', 'Sistema de inteligência artificial especializado em direito, operado pela LexFlow, responsável pela triagem, produção e entrega das minutas.'],
                  ['IA', 'Inteligência artificial treinada em jurisprudência e legislação brasileira, utilizada como núcleo de produção documental da Plataforma, com supervisão técnica da LexFlow.'],
                ].map(([termo, def]) => (
                  <li key={termo} className="flex gap-2">
                    <span className="font-semibold text-white min-w-fit" style={{ color: '#d4af37' }}>• {termo}:</span>
                    <span>{def}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. Natureza do Serviço e Limitações</h2>
              <p>
                O LexFlow é um serviço de <strong className="text-white">apoio técnico à produção documental jurídica</strong>. 
                A Plataforma não presta assessoria jurídica, não representa clientes, não emite pareceres jurídicos e não substitui 
                a atuação do advogado habilitado perante a OAB.
              </p>
              <p className="mt-3">O Usuário reconhece expressamente que:</p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-400">
                <li>Toda minuta entregue é um <strong className="text-white">rascunho de apoio</strong> e requer revisão técnica antes de qualquer uso profissional;</li>
                <li>A <strong className="text-white">responsabilidade pela validação jurídica</strong> do conteúdo é exclusivamente do advogado signatário;</li>
                <li>O LexFlow utiliza <strong className="text-white">agentes de IA especializados em direito</strong> como núcleo de produção documental, em conformidade com a Resolução CNJ nº 615/2025, cabendo ao advogado do escritório contratante a revisão e aprovação final;</li>
                <li>A aprovação da minuta na Plataforma representa o aceite formal do Usuário sobre o conteúdo e transfere a responsabilidade técnica para o advogado aprovador.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Cadastro e Acesso</h2>
              <p>Para utilizar a Plataforma, o Usuário deve:</p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-400">
                <li>Ser advogado regularmente inscrito na OAB ou atuar sob supervisão de advogado habilitado;</li>
                <li>Fornecer informações verídicas, completas e atualizadas no cadastro;</li>
                <li>Manter a confidencialidade de suas credenciais de acesso;</li>
                <li>Aceitar expressamente estes Termos e a Política de Privacidade.</li>
              </ul>
              <p className="mt-3">
                O Usuário é integralmente responsável pelas atividades realizadas com suas credenciais. 
                Em caso de suspeita de acesso não autorizado, deve notificar imediatamente o LexFlow.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Obrigações do Usuário</h2>
              <p>O Usuário se compromete a:</p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-400">
                <li>Utilizar a Plataforma exclusivamente para fins lícitos e em conformidade com o Estatuto da OAB;</li>
                <li>Fornecer briefings precisos, verídicos e com as informações necessárias para a produção dos documentos;</li>
                <li>Realizar a <strong className="text-white">revisão técnica obrigatória</strong> de todas as minutas antes de sua utilização;</li>
                <li>Não compartilhar informações confidenciais de clientes além do estritamente necessário para a produção do documento;</li>
                <li>Não utilizar os documentos produzidos sem a devida revisão e aprovação profissional;</li>
                <li>Manter os dados de acesso em sigilo e não os compartilhar com terceiros não autorizados.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. Planos, Pagamentos e Cancelamento</h2>
              <p>
                O acesso à Plataforma está condicionado à contratação de um dos planos disponíveis (Start, Pro ou Premium), 
                com cobrança mensal recorrente via gateway de pagamento seguro.
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-400">
                <li>Os valores são cobrados antecipadamente, no início de cada período;</li>
                <li>Demandas não utilizadas no mês não são cumulativas para o período seguinte;</li>
                <li>O cancelamento pode ser realizado a qualquer momento, sem multa, com efeito ao final do período vigente;</li>
                <li>Não há reembolso proporcional por cancelamento durante o período pago.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">7. Confidencialidade e Sigilo Profissional</h2>
              <p>
                O LexFlow reconhece a natureza sigilosa das informações jurídicas e se compromete a:
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-400">
                <li>Tratar todos os dados e documentos compartilhados com absoluta confidencialidade;</li>
                <li>Não divulgar, compartilhar ou utilizar as informações dos clientes dos Usuários para qualquer finalidade além da produção do documento solicitado;</li>
                <li>Garantir que os Agentes de IA especializados operados pela LexFlow processem os dados exclusivamente para a finalidade do serviço contratado, com supervisão técnica e controles de segurança adequados;</li>
                <li>Não utilizar o conteúdo dos briefings ou documentos para treinar modelos de IA sem autorização expressa.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">8. Propriedade Intelectual</h2>
              <p>
                Os documentos produzidos pelos agentes de IA LexFlow a partir dos briefings fornecidos pelo Usuário são de
                <strong className="text-white"> propriedade do Usuário</strong>, desde que devidamente pagos e aprovados pelo advogado responsável na Plataforma.
              </p>
              <p className="mt-3">
                A marca, logotipo, interface, código-fonte e demais elementos da Plataforma são de propriedade exclusiva do LexFlow, 
                protegidos pela legislação de propriedade intelectual vigente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">9. Limitação de Responsabilidade</h2>
              <p>O LexFlow não se responsabiliza por:</p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-400">
                <li>Erros jurídicos decorrentes do uso de minutas sem a devida revisão profissional;</li>
                <li>Decisões judiciais ou administrativas baseadas em documentos produzidos pelos agentes de IA da Plataforma e utilizados sem a devida revisão e aprovação do advogado responsável;</li>
                <li>Prejuízos causados por informações incorretas ou incompletas fornecidas pelo Usuário no briefing;</li>
                <li>Indisponibilidade temporária da Plataforma por manutenção, falhas técnicas ou casos fortuitos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">10. Conformidade com a OAB e CNJ</h2>
              <p>
                O LexFlow foi desenvolvido em conformidade com:
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-400">
                <li><strong className="text-white">Resolução CNJ nº 615/2025</strong> — uso ético e responsável de IA no âmbito jurídico;</li>
                <li><strong className="text-white">Provimento OAB nº 205/2021</strong> — orientações sobre o uso de tecnologia na advocacia;</li>
                <li><strong className="text-white">Código de Ética e Disciplina da OAB</strong> — especialmente quanto ao sigilo profissional;</li>
                <li><strong className="text-white">Lei Geral de Proteção de Dados (LGPD)</strong> — Lei nº 13.709/2018.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">11. Alterações dos Termos</h2>
              <p>
                O LexFlow reserva-se o direito de alterar estes Termos a qualquer momento, 
                mediante notificação prévia de 15 dias ao Usuário por e-mail cadastrado. 
                O uso continuado da Plataforma após a vigência das alterações implica aceitação tácita dos novos termos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">12. Foro e Legislação Aplicável</h2>
              <p>
                Estes Termos são regidos pela legislação brasileira. 
                Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias 
                decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">13. Contato</h2>
              <p>
                Para dúvidas, solicitações ou notificações relacionadas a estes Termos, entre em contato:
              </p>
              <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: '#0a192f' }}>
                <p><strong className="text-white">LexFlow</strong></p>
                <p className="text-gray-400 text-sm mt-1">E-mail: contato@lexflow.com.br</p>
                <p className="text-gray-400 text-sm">Site: ayuilfql.gensparkclaw.com</p>
              </div>
            </section>

          </div>

          {/* Rodapé do documento */}
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-xs">© 2026 LexFlow · Todos os direitos reservados</p>
            <Link href="/privacidade" className="text-sm" style={{ color: '#d4af37' }}>
              Ver Política de Privacidade →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
