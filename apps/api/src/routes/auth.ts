import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const authRoutes: FastifyPluginAsync = async server => {
  server.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input' })

    const { email, password } = body.data

    const user = await server.prisma.user.findUnique({ where: { email } })
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const token = server.jwt.sign({
      id: user.id,
      email: user.email,
      company: user.company,
      role: user.role,
    })

    return { token, user: { id: user.id, email: user.email, name: user.name, company: user.company, role: user.role } }
  })

  server.get('/me', {
    preHandler: async (req, reply) => {
      try { await req.jwtVerify() } catch { reply.status(401).send({ error: 'Unauthorized' }) }
    },
  }, async request => {
    const { id } = request.user
    const user = await server.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, email: true, name: true, company: true, role: true },
    })
    return user
  })
}
