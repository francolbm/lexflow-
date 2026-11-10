import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { AlertCircle, Info } from 'lucide-react'
import { PLANS, isPlanCode, formatPlanPrice, SUBSCRIPTION_STATUS_LABELS, normalizeSubscriptionStatus } from '@/lib/types'
import { BillingButton } from '@/components/assinatura/BillingButton'
import { PlanFeatureList } from '@/components/planos/PlanFeatureList'
import { getDemandUsage, fmtResetDate } from '@/lib/quota'

const SUPPORT_MAILTO = 'mailto:suporte@pennajus.com'

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  trialing: 'bg-blue-500/20 text-blue-300',
  past_due: 'bg-orange-500/20 text-orange-400',
  unpaid: 'bg-red-500/20 text-red-400',
  canceled: 'bg-red-500/20 text-red-400',
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

export default async function AssinaturaPage({ searchParams }: { searchParams: { checkout?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('organization_members').select('organization_id').eq('user_id', user.id).eq('status', 'active').single(),
  ])

  const { data: subscription } = membership
    ? await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', membership.organization_id)
        .single()
    : { data: null }
  const { data: org } = membership
    ? await supabase.from('organizations').select('owner_user_id').eq('id', membership.organization_id).single()
    : { data: null }

  const planCode: unknown = subscription?.plan_code
  const currentPlan = isPlanCode(planCode) ? PLANS[planCode] : null
  const status = normalizeSubscriptionStatus(subscription?.status)
  const isOwner = org?.owner_user_id === user.id
  // Assinatura viva no Stripe -> gerenciar pelo Portal; senão -> assinar pelo Checkout
  const hasStripeSubscription = !!subscription?.stripe_subscription_id
    && status !== 'canceled' && status !== 'incomplete_expired'
  // Uso do período vigente (zera sozinho na virada do ciclo); o demands_used cru pode ser de um período antigo
  const usage = membership ? await getDemandUsage(supabase, membership.organization_id) : null
  const usagePercent = usage?.percent ?? 0

  return (
    <>
      <Header title="Assinatura" profile={profile} />
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Sua Assinatura</h2>
          <p className="text-gray-400 text-sm mt-1">Gerencie seu plano e uso de demandas.</p>
        </div>

        {searchParams.checkout === 'sucesso' && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-300 text-sm">
            Pagamento recebido! Sua assinatura é atualizada em instantes. Se o status abaixo ainda não mudou, recarregue a página.
          </div>
        )}
        {searchParams.checkout === 'cancelado' && (
          <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-yellow-300 text-sm">
            Pagamento não concluído. Nada foi cobrado; você pode tentar de novo quando quiser.
          </div>
        )}

        {!subscription || !currentPlan ? (
          <Card className="border-0" style={{ backgroundColor: '#112240' }}>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-yellow-400" />
              <p className="text-white font-medium">Nenhum plano ativo</p>
              <p className="text-gray-400 text-sm mt-1">Entre em contato conosco para ativar seu plano.</p>
              <a href={SUPPORT_MAILTO} className={buttonVariants({ className: 'gold-btn mt-6 font-semibold' })}>
                Falar com suporte
              </a>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-0" style={{ backgroundColor: '#112240' }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Plano {currentPlan.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={`border-0 ${(status && STATUS_BADGE[status]) || 'bg-gray-500/20 text-gray-300'}`}>
                      {status ? SUBSCRIPTION_STATUS_LABELS[status] : subscription.status}
                    </Badge>
                    <span className="text-gray-300 font-medium">{formatPlanPrice(currentPlan.priceCents)}/mês</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Situação da cobrança */}
                {status === 'incomplete' && (
                  <p className="text-yellow-300 text-sm">Seu cadastro está pronto! Falta só ativar a assinatura para começar a abrir solicitações.</p>
                )}
                {status === 'trialing' && subscription.current_period_end && (
                  <p className="text-blue-300 text-sm">Período de teste até {fmtDate(subscription.current_period_end)}. A primeira cobrança acontece nessa data.</p>
                )}
                {subscription.cancel_at_period_end && subscription.current_period_end && (
                  <p className="text-yellow-300 text-sm">Assinatura cancelada: o acesso continua até {fmtDate(subscription.current_period_end)}.</p>
                )}
                {(status === 'past_due' || status === 'unpaid') && (
                  <p className="text-orange-300 text-sm">Não conseguimos cobrar seu cartão. Atualize a forma de pagamento em "Gerenciar assinatura".</p>
                )}
                {status === 'active' && !subscription.cancel_at_period_end && subscription.current_period_end && (
                  <p className="text-gray-400 text-sm">Próxima cobrança em {fmtDate(subscription.current_period_end)}.</p>
                )}
                {/* Usage bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Demandas utilizadas</span>
                    <span className="text-white font-medium">
                      {usage?.used ?? 0} / {usage?.quota ?? subscription.demands_limit}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1e3a5f' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(usagePercent, 100)}%`,
                        backgroundColor: usagePercent > 90 ? '#ef4444' : usagePercent > 70 ? '#f59e0b' : '#d4af37',
                      }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    {usagePercent}% utilizado no período{usage && ` · renova em ${fmtResetDate(usage.resetsAt)}`}
                  </p>
                </div>

                {/* Features */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-gray-400 text-sm font-medium mb-3">Recursos inclusos:</p>
                  <PlanFeatureList code={currentPlan.code} className="space-y-2" />
                </div>
              </CardContent>
            </Card>

            <div className="text-center space-y-3">
              {!isOwner ? (
                <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
                  <Info className="h-4 w-4" />
                  Somente o titular do escritório gerencia a assinatura.
                </p>
              ) : hasStripeSubscription ? (
                <>
                  <p className="text-gray-500 text-sm">Troque de plano, atualize o cartão, veja faturas ou cancele.</p>
                  <BillingButton action="portal" label="Gerenciar assinatura" />
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-sm">
                    {currentPlan.code === 'pro'
                      ? 'O Pro inclui 14 dias de teste na primeira assinatura. O cartão é pedido agora e cobrado só depois do teste.'
                      : 'Pagamento mensal no cartão, processado pelo Stripe.'}
                  </p>
                  <BillingButton action="checkout" label={`Assinar o plano ${currentPlan.name}`} />
                </>
              )}
              <p className="text-gray-500 text-xs">
                Dúvidas? <a href={SUPPORT_MAILTO} className="underline" style={{ color: '#d4af37' }}>Falar com suporte</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
