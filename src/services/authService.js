const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

exports.registerTenant = async (name, email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  return await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name } });
    const user = await tx.user.create({
      data: { email, password: hashedPassword, role: 'ADMIN', tenantId: tenant.id }
    });
    return { tenant, user };
  });
};

exports.login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.password)) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { id: user.id, tenantId: user.tenantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  return { token, user };
};