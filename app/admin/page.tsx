import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/server/auth'

export default async function AdminPage() {
  await requireAdminProfile()
  redirect('/admin/economics')
}
