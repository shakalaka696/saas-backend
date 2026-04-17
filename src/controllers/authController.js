const { AppDataSource } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// A1: Login Logic
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find the admin in the database
    const adminRepo = AppDataSource.getRepository("AdminUser");
    const admin = await adminRepo.findOneBy({ email: email });

    // 2. If email doesn't exist
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3. Compare the password with the hashed one in Neon
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 4. Create the JWT (The Key)
    const token = jwt.sign(
      { 
        id: admin.id, 
        tenantId: admin.tenantId, 
        email: admin.email, 
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({ message: "Login success", token: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// A2: Get Profile Logic
exports.getMe = async (req, res) => {
  try {
    const adminRepo = AppDataSource.getRepository("AdminUser");
    // We get the ID from the token (req.user is set by middleware)
    const admin = await adminRepo.findOneBy({ id: req.user.id });

    if (!admin) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      tenantId: admin.tenantId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};