'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function PoliticaDePrivacidade() {
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
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Política de Privacidade</h1>
            <p className="text-gray-400 text-sm">Última atualização: maio de 2026 · Versão 1.0</p>
          </div>

          <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed space-y-8">

            {/* Destaque LGPD */}
            <div className="rounded-lg p-5 border-l-4" style={{ backgroundColor: '#0a192f', borderLeftColor: '#d4af37' }}>
              <p className="text-sm font-semibold text-white mb-2">🔒 Compromisso com a LGPD</p>
              <p className="text-sm text-gray-400">
                Esta Política foi elaborada em conformidade com a <strong className="text-white">Lei Geral de Proteção de Dados Pessoais (LGPD) — Lei nº 13.709/2018</strong>.
                O LexFlow adota os princípios de <em>privacy by design</em>, minimização de dados e 
                transparência no tratamento de informações pessoais.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Controlador de Dados</h2>
              <p>O controlador dos dados pessoais tratados pela Plataforma é:</p>
              <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: '#0a192f' }}>
                <p><strong className="text-white">LexFlow</strong></p>
                <p className="text-gray-400 text-sm mt-1">Responsável: Franco Luiz Bianchini Maciel</p>
                <p className="text-gray-400 text-sm">E-mail do DPO: privacidade@lexflow.com.br</p>
                <p className="text-gray-400 text-sm">Site: ayuilfql.gensparkclaw.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. Dados Coletados</h2>
              <p>O LexFlow coleta os seguintes dados pessoais:</p>

              <h3 className="text-lg font-semibold text-white mt-5 mb-2">2.1 Dados de Cadastro</h3>
              <ul className="space-y-1 list-disc list-inside text-gray-400">
                <li>Nome completo</li>
                <li>Endereço de e-mail profissional</li>
                <li>Número de inscrição na OAB (opcional)</li>
                <li>Telefone de contato (opcional)</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-5 mb-2">2.2 Dados das Demandas</h3>
              <ul className="space-y-1 list-disc list-inside text-gray-400">
                <li>Briefings e instruções fornecidos pelo Usuário</li>
                <li>Documentos de apoio enviados (procurações, contratos, provas)</li>
                <li>Comentários e anotações sobre as minutas</li>
                <li>Histórico de aprovações e versões</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-5 mb-2">2.3 Dados de Uso e Técnicos</h3>
              <ul className="space-y-1 list-disc list-inside text-gray-400">
                <li>Endereço IP e dados de navegação (logs de acesso)</li>
                <li>Tipo de dispositivo, sistema operacional e navegador</li>
                <li>Data e hora das operações realizadas na Plataforma</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mt-5 mb-2">2.4 Dados de Pagamento</h3>
              <ul className="space-y-1 list-disc list-inside text-gray-400">
                <li>E-mail de faturamento</li>
                <li>Dados de cartão de crédito processados exclusivamente pelo gateway Stripe (não armazenados pelo LexFlow)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. Finalidades do Tratamento</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 pr-4 text-white font-semibold">Finalidade</th>
                      <th className="text-left py-3 text-white font-semibold">Base Legal (LGPD)</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-400">
                    {[
                      ['Prestação do serviço de produção documental', 'Execução de contrato (Art. 7º, V)'],
                      ['Gerenciamento de conta e autenticação', 'Execução de contrato (Art. 7º, V)'],
                      ['Faturamento e cobrança', 'Execução de contrato (Art. 7º, V)'],
                      ['Envio de notificações de status das demandas', 'Execução de contrato (Art. 7º, V)'],
                      ['Melhoria da Plataforma e análise de uso', 'Legítimo interesse (Art. 7º, IX)'],
                      ['Cumprimento de obrigações legais', 'Obrigação legal (Art. 7º, II)'],
                      ['Comunicações de marketing (com opt-in)', 'Consentimento (Art. 7º, I)'],
                    ].map(([fin, base]) => (
                      <tr key={fin} className="border-b border-white/5">
                        <td className="py-3 pr-4">{fin}</td>
                        <td className="py-3 text-xs" style={{ color: '#d4af37' }}>{base}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Compartilhamento de Dados</h2>
              <p>O LexFlow <strong className="text-white">não vende</strong> dados pessoais a terceiros. Os dados podem ser compartilhados apenas com:</p>
              <ul className="mt-3 space-y-3 list-none">
                {[
                  ['Agentes de IA LexFlow', 'Agentes de IA especializados operados pela LexFlow, com supervisão técnica, vinculados a controles rigorosos de confidencialidade e segurança, exclusivamente para produção das demandas.'],
                  ['Supabase (infraestrutura)', 'Provedor de banco de dados e autenticação, certificado SOC 2 Type II.'],
                  ['Stripe (pagamentos)', 'Gateway de pagamento certificado PCI-DSS Level 1. Não recebe dados dos clientes do Usuário.'],
                  ['Provedores de IA', 'APIs de IA (ex: OpenAI) utilizadas para apoio na produção dos rascunhos, com contratos de zero data retention.'],
                  ['Autoridades competentes', 'Quando exigido por lei, ordem judicial ou regulamentação aplicável.'],
                ].map(([entidade, desc]) => (
                  <li key={entidade} className="flex gap-3">
                    <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#d4af37', marginTop: '6px' }}></span>
                    <div>
                      <strong className="text-white">{entidade}:</strong>{' '}
                      <span className="text-gray-400">{desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Dados dos Clientes do Usuário</h2>
              <p>
                O LexFlow reconhece que os briefings e documentos enviados podem conter dados pessoais de 
                clientes do Usuário (terceiros). Nessa relação:
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-400">
                <li>O <strong className="text-white">Usuário é o controlador</strong> dos dados de seus clientes e é responsável pela base legal para compartilhá-los;</li>
                <li>O <strong className="text-white">LexFlow atua como operador</strong> desses dados, tratando-os exclusivamente para a prestação do serviço;</li>
                <li>Os dados de clientes do Usuário <strong className="text-white">nunca serão usados</strong> para marketing, treinamento de modelos de IA ou compartilhados com terceiros além dos Agentes de IA especializados operados pela LexFlow, com supervisão técnica;</li>
                <li>O Usuário deve garantir que seus clientes estão cientes do compartilhamento de seus dados para produção documental.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. Segurança dos Dados</h2>
              <p>O LexFlow adota as seguintes medidas de segurança:</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['🔐 Criptografia', 'TLS em trânsito + AES-256 em repouso'],
                  ['🏗️ Isolamento de dados', 'Multi-tenancy com Row Level Security no banco'],
                  ['📋 Controle de acesso', 'Autenticação segura, sessões com expiração'],
                  ['📝 Logs de auditoria', 'Registro imutável de todas as ações críticas'],
                  ['💾 Backups', 'Backups automáticos diários com retenção de 30 dias'],
                  ['🤖 Agentes de IA', 'Agentes de IA especializados com controles de acesso restrito, supervisão técnica e conformidade com LGPD'],
                ].map(([titulo, desc]) => (
                  <div key={titulo} className="p-4 rounded-lg" style={{ backgroundColor: '#0a192f' }}>
                    <p className="font-semibold text-white text-sm mb-1">{titulo}</p>
                    <p className="text-gray-400 text-xs">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">7. Retenção de Dados</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 pr-4 text-white font-semibold">Dado</th>
                      <th className="text-left py-3 text-white font-semibold">Prazo de Retenção</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-400">
                    {[
                      ['Dados de cadastro', 'Enquanto a conta estiver ativa + 5 anos após encerramento'],
                      ['Documentos e briefings', 'Enquanto a conta estiver ativa + 2 anos após encerramento'],
                      ['Logs de auditoria', '5 anos (exigência legal)'],
                      ['Dados de faturamento', '5 anos (Código Civil e legislação fiscal)'],
                      ['Logs de acesso', '6 meses (Marco Civil da Internet)'],
                    ].map(([dado, prazo]) => (
                      <tr key={dado} className="border-b border-white/5">
                        <td className="py-3 pr-4">{dado}</td>
                        <td className="py-3 text-xs" style={{ color: '#d4af37' }}>{prazo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">7A. Tratamento Automatizado por Inteligência Artificial</h2>
              <p>
                O LexFlow utiliza <strong className="text-white">agentes de IA especializados em direito</strong> como núcleo de produção documental.
                Isso significa que os briefings e documentos de apoio fornecidos pelo Usuário são processados de forma automatizada por inteligência artificial para gerar as minutas jurídicas.
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-400">
                <li>O tratamento automatizado ocorre exclusivamente para a finalidade de produção do documento solicitado;</li>
                <li>Nenhuma decisão com efeitos jurídicos sobre terceiros é tomada exclusivamente pela IA sem a <strong className="text-white">revisão e aprovação obrigatória do advogado do escritório contratante</strong>;</li>
                <li>O advogado revisor exerce, no fluxo de aprovação da Plataforma, a função de revisão humana exigida pelo <strong className="text-white">Art. 20 da LGPD</strong>;</li>
                <li>Os dados processados pela IA não são utilizados para retreinamento de modelos sem autorização expressa do Usuário.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">8. Seus Direitos (LGPD)</h2>
              <p>Como titular de dados, você tem os seguintes direitos, exercíveis a qualquer momento:</p>
              <div className="mt-4 space-y-3">
                {[
                  ['Acesso', 'Solicitar confirmação da existência e acesso aos seus dados pessoais'],
                  ['Correção', 'Corrigir dados incompletos, inexatos ou desatualizados'],
                  ['Anonimização/Exclusão', 'Solicitar a anonimização ou exclusão de dados desnecessários ou tratados em desconformidade'],
                  ['Portabilidade', 'Receber seus dados em formato estruturado para transferência a outro fornecedor'],
                  ['Oposição', 'Opor-se ao tratamento realizado com base em legítimo interesse'],
                  ['Revogação do consentimento', 'Retirar consentimento para tratamentos baseados nessa base legal'],
                  ['Informação', 'Ser informado sobre entidades públicas e privadas com as quais compartilhamos dados'],
                  ['Revisão de decisões automatizadas', 'Solicitar revisão humana de qualquer decisão tomada exclusivamente por agentes de IA que produza efeitos sobre seus interesses, conforme Art. 20 da LGPD. O advogado do escritório contratante exerce essa revisão como parte obrigatória do fluxo de aprovação da Plataforma'],
                ].map(([direito, desc]) => (
                  <div key={direito} className="flex gap-3 p-3 rounded-lg" style={{ backgroundColor: '#0a192f' }}>
                    <span className="font-semibold min-w-fit text-sm" style={{ color: '#d4af37' }}>• {direito}:</span>
                    <span className="text-gray-400 text-sm">{desc}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-400">
                Para exercer qualquer direito, envie sua solicitação para <strong className="text-white">privacidade@lexflow.com.br</strong>. 
                Responderemos em até <strong className="text-white">15 dias úteis</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">9. Cookies e Tecnologias de Rastreamento</h2>
              <p>A Plataforma utiliza:</p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-400">
                <li><strong className="text-white">Cookies essenciais:</strong> para autenticação e funcionamento da sessão (obrigatórios);</li>
                <li><strong className="text-white">Cookies analíticos:</strong> para análise de uso e melhoria da Plataforma (com consentimento);</li>
                <li>Não utilizamos cookies para publicidade comportamental ou rastreamento entre sites.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">10. Transferência Internacional de Dados</h2>
              <p>
                Alguns de nossos provedores de infraestrutura (Supabase, Stripe, provedores de IA) 
                podem processar dados em servidores localizados fora do Brasil. 
                Garantimos que essas transferências são realizadas com cláusulas contratuais adequadas 
                e/ou para países com nível de proteção equivalente ao brasileiro, nos termos do Art. 33 da LGPD.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">11. Encarregado de Dados (DPO)</h2>
              <p>
                Nosso Encarregado pelo Tratamento de Dados Pessoais (DPO) pode ser contatado em:
              </p>
              <div className="mt-3 p-4 rounded-lg" style={{ backgroundColor: '#0a192f' }}>
                <p className="text-gray-400 text-sm">📧 privacidade@lexflow.com.br</p>
                <p className="text-gray-400 text-sm mt-1">Tempo de resposta: até 15 dias úteis</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">12. Alterações desta Política</h2>
              <p>
                Esta Política pode ser atualizada periodicamente. Alterações relevantes serão comunicadas 
                por e-mail com antecedência mínima de 15 dias. 
                A versão mais recente estará sempre disponível nesta página.
              </p>
            </section>

          </div>

          {/* Rodapé */}
          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-xs">© 2026 LexFlow · Todos os direitos reservados</p>
            <Link href="/termos" className="text-sm" style={{ color: '#d4af37' }}>
              Ver Termos de Uso →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
