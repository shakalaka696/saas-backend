const { AppDataSource } = require('../config/database');

// AC1: List All Customers (Filtered by Admin's Tenant)
exports.listCustomers = async (req, res) => {
  try {
    const tenantId = req.user.tenantId; // From verifyToken middleware
    const customerRepo = AppDataSource.getRepository("Customer");

    const customers = await customerRepo.find({
      where: { tenantId },
      order: { createdAt: "DESC" }
    });

    res.status(200).json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// AC2: View Single Customer Details
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const customerRepo = AppDataSource.getRepository("Customer");

    const customer = await customerRepo.findOne({
      where: { id, tenantId }
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// AC3: Delete Customer
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const customerRepo = AppDataSource.getRepository("Customer");

    const result = await customerRepo.delete({ id, tenantId });

    if (result.affected === 0) {
      return res.status(404).json({ message: "Customer not found or already deleted" });
    }

    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};