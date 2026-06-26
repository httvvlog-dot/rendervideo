import { getCurrentUser } from './auth-service'
import { ROUTES } from './routes'
import { redirect } from 'next/navigation'

export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  return user
}

export async function requireAdmin() {
  const user = await requireUser()

  if (user.role !== 'admin') {
    redirect(ROUTES.USER_DASHBOARD)
  }

  return user
}
