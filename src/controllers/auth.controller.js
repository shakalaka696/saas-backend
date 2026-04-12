const authService = require('../services/authService');

exports.register = async (req, res) => {
  const { tenantName, email, password } = req.body;
  const result = await authService.registerTenant(tenantName, email, password);
  res.status(201).json({ message: 'Tenant and Admin created successfully', result });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const { token, user } = await authService.login(email, password);
  res.json({ 
    message: 'Login successful', 
    token, 
    user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId } 
  });
};