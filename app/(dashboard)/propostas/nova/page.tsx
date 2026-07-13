import { Navbar } from '@/components/shared/navbar'
import { NewProposalForm } from '@/components/proposal/new-proposal-form'
import { createClient } from '@/lib/supabase/server'

export default async function NewProposalPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .order('full_name')

  return (
    <>
      <Navbar title="Nova proposta" />
      <main className="p-6 md:p-8">
        <NewProposalForm clients={clients ?? []} />
      </main>
    </>
  )
}
