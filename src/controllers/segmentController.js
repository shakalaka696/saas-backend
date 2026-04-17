const { AppDataSource } = require('../config/database');

// S1: Create Segment
exports.createSegment = async (req, res) => {
  try {
    const { name } = req.body;
    const segmentRepo = AppDataSource.getRepository("Segment");
    
    const segment = segmentRepo.create({ 
      name, 
      tenantId: req.user.tenantId 
    });
    await segmentRepo.save(segment);
    
    res.status(201).json(segment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// S2: List Segments
exports.listSegments = async (req, res) => {
  try {
    const segments = await AppDataSource.getRepository("Segment").find({
      where: { tenantId: req.user.tenantId }
    });
    res.json(segments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// S3: View Segment Details (including the list of Customers)
exports.getSegmentById = async (req, res) => {
  try {
    const segment = await AppDataSource.getRepository("Segment").findOne({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      relations: ["customers"] // This pulls the linked customers from the bridge table
    });
    if (!segment) return res.status(404).json({ message: "Segment not found" });
    res.json(segment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// S4: Update Segment Name
exports.updateSegment = async (req, res) => {
  try {
    const segmentRepo = AppDataSource.getRepository("Segment");
    const result = await segmentRepo.update(
      { id: req.params.id, tenantId: req.user.tenantId },
      { name: req.body.name }
    );
    if (result.affected === 0) return res.status(404).json({ message: "Segment not found" });
    res.json({ message: "Segment updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// S5: Delete Segment
exports.deleteSegment = async (req, res) => {
  try {
    const result = await AppDataSource.getRepository("Segment").delete({ 
      id: req.params.id, 
      tenantId: req.user.tenantId 
    });
    if (result.affected === 0) return res.status(404).json({ message: "Segment not found" });
    res.json({ message: "Segment deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// S6: Add Customer to Segment
exports.addCustomerToSegment = async (req, res) => {
  try {
    const segmentRepo = AppDataSource.getRepository("Segment");
    const customerRepo = AppDataSource.getRepository("Customer");

    const segment = await segmentRepo.findOne({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      relations: ["customers"]
    });

    const customer = await customerRepo.findOne({
      where: { id: req.body.customerId, tenantId: req.user.tenantId }
    });

    if (segment && customer) {
      // Add to array - TypeORM handles the bridge table automatically
      segment.customers.push(customer);
      await segmentRepo.save(segment);
      return res.json({ message: "Customer added to segment" });
    }
    res.status(404).json({ message: "Segment or Customer not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// S7: Remove Customer from Segment
exports.removeCustomerFromSegment = async (req, res) => {
  try {
    const segmentRepo = AppDataSource.getRepository("Segment");
    const segment = await segmentRepo.findOne({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      relations: ["customers"]
    });

    if (segment) {
      // Filter out the customer to be removed
      segment.customers = segment.customers.filter(c => c.id !== req.params.customerId);
      await segmentRepo.save(segment);
      return res.json({ message: "Customer removed from segment" });
    }
    res.status(404).json({ message: "Segment not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};