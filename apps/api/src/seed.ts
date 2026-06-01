import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '../../.env') })

import bcrypt from 'bcryptjs'
import { prisma } from '@bcf/db'

async function seed() {
  const password = await bcrypt.hash('admin1234', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'nicola@bcfgroup.co.uk' },
    update: {},
    create: {
      email: 'nicola@bcfgroup.co.uk',
      password,
      name: 'Nicola',
      company: 'BGR',
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin user created:', admin.email)
  console.log('   Password: admin1234  ← change this after first login')

  await prisma.$disconnect()
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
