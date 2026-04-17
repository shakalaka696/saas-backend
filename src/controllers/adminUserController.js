const { AppDataSource } = require('../config/database');
const bcrypt = require('bcrypt');

// AU1: Create Sub-Admin (Already done, but included for completeness)
exports.createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminRepo = AppDataSource.getRepository("AdminUser");

    const newAdmin = adminRepo.create({
      email,
      password: hashedPassword,
      role: "ADMIN",
      tenantId: req.user.tenantId // Taken from JWT
    });

    await adminRepo.save(newAdmin);
    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// AU2: List all Admins for the logged-in Tenant
exports.getAdmins = async (req, res) => {
  try {
    const adminRepo = AppDataSource.getRepository("AdminUser");
    // We only find users that match the logged-in user's tenantId
    const admins = await adminRepo.findBy({ tenantId: req.user.tenantId });
    res.status(200).json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// AU3: Get a specific Admin by ID
exports.getAdminById = async (req, res) => {
  try {
    const adminRepo = AppDataSource.getRepository("AdminUser");
    const admin = await adminRepo.findOneBy({ 
      id: req.params.id, 
      tenantId: req.user.tenantId // Security check!
    });

    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.status(200).json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// AU4: Update an Admin (e.g., change email)
exports.updateAdmin = async (req, res) => {
  try {
    const { email } = req.body;
    const adminRepo = AppDataSource.getRepository("AdminUser");
    
    // Check if admin exists and belongs to this tenant
    const admin = await adminRepo.findOneBy({ id: req.params.id, tenantId: req.user.tenantId });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    await adminRepo.update(req.params.id, { email: email });
    res.status(200).json({ message: "Admin updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// AU5: Delete an Admin
exports.deleteAdmin = async (req, res) => {
  try {
    const adminRepo = AppDataSource.getRepository("AdminUser");
    
    // Only delete if it belongs to the tenant
    const result = await adminRepo.delete({ id: req.params.id, tenantId: req.user.tenantId });

    if (result.affected === 0) return res.status(404).json({ message: "Admin not found or access denied" });
    
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};