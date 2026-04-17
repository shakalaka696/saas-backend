const { AppDataSource } = require('../config/database');
const otpQueue = require('../queues/otpQueue');

exports.registerCustomer = async (req, res) => {
  try {
    const { firstName, lastName, email, tenantId } = req.body;
    
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // +10 mins

    await AppDataSource.transaction(async (manager) => {
      // 1. Check if email+tenantId exists
      let customer = await manager.findOne("Customer", { where: { email, tenantId } });
      
      if (!customer) {
        // 2. INSERT Customer (isVerified=false)
        customer = manager.create("Customer", { firstName, lastName, email, tenantId, isVerified: false });
        await manager.save("Customer", customer);
      }

      // 3. Invalidate old unused OTPs for this email+tenantId
      await manager.update("OTP", { email, tenantId, used: false }, { used: true });

      // 4. INSERT new OTP
      const otpEntry = manager.create("OTP", { 
        email, 
        tenantId, 
        code, 
        expiresAt, 
        used: false 
      });
      await manager.save("OTP", otpEntry);

      // 5. Add job to BullMQ
      await otpQueue.add('send-otp', { email, firstName, code, tenantId });
    });

    // 6. Respond immediately
    res.status(201).json({ message: "OTP sent to your email" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, tenantId, code } = req.body;
    const otpRepo = AppDataSource.getRepository("OTP");
    const customerRepo = AppDataSource.getRepository("Customer");

    // 1. Find the OTP record (must match email, tenant, code AND not be used yet)
    const otpRecord = await otpRepo.findOne({
      where: { email, tenantId, code, used: false }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP or details" });
    }

    // 2. Check if the OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // 3. Update both tables in a single transaction
    await AppDataSource.transaction(async (manager) => {
      // Mark OTP as used
      await manager.update("OTP", otpRecord.id, { used: true });

      // Mark Customer as verified
      await manager.update("Customer", { email, tenantId }, { isVerified: true });
    });

    res.status(200).json({ message: "Email verified successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email, tenantId } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // New 10-min window

    await AppDataSource.transaction(async (manager) => {
      // 1. Check if the customer actually exists first
      const customer = await manager.findOne("Customer", { where: { email, tenantId } });
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // 2. Invalidate ALL previous unused OTPs for this user
      await manager.update("OTP", { email, tenantId, used: false }, { used: true });

      // 3. INSERT the new OTP
      await manager.save("OTP", { 
        email, 
        tenantId, 
        code, 
        expiresAt, 
        used: false 
      });

      // 4. Add new job to BullMQ
      await otpQueue.add('send-otp', { 
        email, 
        firstName: customer.firstName, 
        code 
      });
    });

    res.status(200).json({ message: "A new OTP has been sent to your email" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};