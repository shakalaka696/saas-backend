const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');

exports.createUser = async (req, res) => {
  const { email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: role || 'USER',
      tenantId: req.user.tenantId // 🔒 Strictly forced to the Admin's tenant
    }
  });

  res.status(201).json({ message: 'User created', user: { id: newUser.id, email: newUser.email } });
};

exports.getTenantUsers = async (req, res) => {
  // Only fetch users belonging to the logged-in admin's tenant
  const users = await prisma.user.findMany({
    where: { tenantId: req.user.tenantId },
    select: { id: true, email: true, role: true, createdAt: true }
  });
  
  res.json(users);
};