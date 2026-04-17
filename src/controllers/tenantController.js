const { AppDataSource } = require('../config/database');
const bcrypt = require('bcrypt');

exports.createTenant = async (req, res) => {
  const nameOfBusiness = req.body.tenantName;
  const emailOfAdmin = req.body.adminEmail;
  const passwordOfAdmin = req.body.adminPassword;

  try {
    const hashedPassword = await bcrypt.hash(passwordOfAdmin, 10);

    await AppDataSource.transaction(async (manager) => {
      
      // 1. Notice we add "Tenant" as the first argument here
      const newCompany = manager.create("Tenant", { name: nameOfBusiness });
      const savedCompany = await manager.save("Tenant", newCompany);

      // 2. Notice we add "AdminUser" as the first argument here
      const newAdmin = manager.create("AdminUser", {
        email: emailOfAdmin,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        tenantId: savedCompany.id
      });
      await manager.save("AdminUser", newAdmin);

      res.status(201).json({ 
        message: "Everything saved to Neon!",
        companyId: savedCompany.id 
      });
    });

  } catch (err) {
    res.status(500).json({ error: "Something went wrong: " + err.message });
  }
};

// T2: List all tenants 
exports.getAllTenants = async (req, res) => {
  try {
    const tenantRepo = AppDataSource.getRepository("Tenant");
    const allTenants = await tenantRepo.find(); // This gets everything from the tenants table
    res.status(200).json(allTenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// T3: Get a single tenant by ID 
exports.getTenantById = async (req, res) => {
  try {
    const tenantId = req.params.id; // Takes the ID from the URL
    const tenantRepo = AppDataSource.getRepository("Tenant");
    const tenant = await tenantRepo.findOneBy({ id: tenantId });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    res.status(200).json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// T4: Update tenant name 
exports.updateTenant = async (req, res) => {
  try {
    const tenantId = req.params.id;
    const newName = req.body.name; 

    const tenantRepo = AppDataSource.getRepository("Tenant");
    await tenantRepo.update(tenantId, { name: newName });

    res.status(200).json({ message: "Tenant updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// T5: Delete tenant and all its data 
exports.deleteTenant = async (req, res) => {
  try {
    const tenantId = req.params.id;
    const tenantRepo = AppDataSource.getRepository("Tenant");

    // Because we set onDelete: "CASCADE" in our model, 
    // deleting the tenant will automatically delete its admins! 
    await tenantRepo.delete(tenantId);

    res.status(200).json({ message: "Tenant and all associated data deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

