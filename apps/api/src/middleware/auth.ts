import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Company, UserRole } from '@bcf/db'

export interface JWTPayload {
  id: string
  email: string
  company: Company
  role: UserRole
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
    user: JWTPayload
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Unauthorized' })
  }
}

/** Returns the company to filter by, or undefined if user is ADMIN (sees all). */
export function getCompanyFilter(request: FastifyRequest): Company | undefined {
  const { role, company } = request.user
  return role === 'ADMIN' ? undefined : company
}
