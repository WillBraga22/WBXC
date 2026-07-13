import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface NavbarProps {
  title: string
}

export function Navbar({ title }: NavbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <Button asChild size="sm">
        <Link href="/propostas/nova">
          <Plus className="h-4 w-4" />
          Nova proposta
        </Link>
      </Button>
    </header>
  )
}
