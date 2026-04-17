const { AppDataSource } = require('../config/database');
const { campaignQueue } = require('../queues/campaignQueue'); // We will create this next

// C1: Create Campaign
exports.createCampaign = async (req, res) => {
  try {
    const { name, subject, body, segmentIds } = req.body;
    const campaignRepo = AppDataSource.getRepository("EmailCampaign");
    const segmentRepo = AppDataSource.getRepository("Segment");

    // Find the segments to link
    const segments = await segmentRepo.findByIds(segmentIds);

    const campaign = campaignRepo.create({
      name,
      subject,
      body,
      tenantId: req.user.tenantId,
      createdById: req.user.id,
      segments: segments // TypeORM handles the 'campaign_segments' table
    });

    await campaignRepo.save(campaign);
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// C2: Execute Campaign (The Execution Flow from your PDF)

exports.listCampaigns = async (req, res) => {
  const campaigns = await AppDataSource.getRepository("EmailCampaign").find({
    where: { tenantId: req.user.tenantId }
  });
  res.json(campaigns);
};

// C3: View Campaign Details
exports.getCampaignById = async (req, res) => {
  try {
    const campaignRepo = AppDataSource.getRepository("EmailCampaign");
    const jobRepo = AppDataSource.getRepository("CampaignJob");

    const campaign = await campaignRepo.findOne({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      relations: ["segments"]
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Get simple counts for each status using basic find
    const pendingCount = await jobRepo.count({ where: { campaignId: req.params.id, status: 'PENDING' } });
    const sentCount = await jobRepo.count({ where: { campaignId: req.params.id, status: 'SENT' } });
    const failedCount = await jobRepo.count({ where: { campaignId: req.params.id, status: 'FAILED' } });

    res.json({ 
      ...campaign, 
      stats: {
        total: pendingCount + sentCount + failedCount,
        pending: pendingCount,
        sent: sentCount,
        failed: failedCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// C4: Update Campaign
exports.updateCampaign = async (req, res) => {
  try {
    const { name, subject, body, segmentIds } = req.body;
    const campaignRepo = AppDataSource.getRepository("EmailCampaign");

    const campaign = await campaignRepo.findOne({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // PDF Guard: Only edit if still a DRAFT
    if (campaign.status !== 'DRAFT') {
      return res.status(400).json({ message: "Cannot edit an active or finished campaign" });
    }

    // Update fields
    if (name) campaign.name = name;
    if (subject) campaign.subject = subject;
    if (body) campaign.body = body;

    // Update Segments if provided
    if (segmentIds) {
      const segmentRepo = AppDataSource.getRepository("Segment");
      campaign.segments = await segmentRepo.findByIds(segmentIds);
    }

    await campaignRepo.save(campaign);
    res.json({ message: "Campaign updated successfully", campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// C5: Delete Campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const campaignRepo = AppDataSource.getRepository("EmailCampaign");
    
    const campaign = await campaignRepo.findOne({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    });

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Don't delete while it's in the middle of sending (RUNNING)
    if (campaign.status === 'RUNNING') {
      return res.status(400).json({ message: "Cannot delete a running campaign" });
    }

    await campaignRepo.remove(campaign);
    res.json({ message: "Campaign deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// C6: Add Segment to Campaign
exports.addSegmentToCampaign = async (req, res) => {
  try {
    const { id } = req.params; // Campaign ID
    const { segmentId } = req.body;
    const campaignRepo = AppDataSource.getRepository("EmailCampaign");
    const segmentRepo = AppDataSource.getRepository("Segment");

    const campaign = await campaignRepo.findOne({
      where: { id, tenantId: req.user.tenantId },
      relations: ["segments"]
    });

    const segment = await segmentRepo.findOne({
      where: { id: segmentId, tenantId: req.user.tenantId }
    });

    if (campaign && segment) {
      // Check if already linked to avoid duplicates
      const exists = campaign.segments.find(s => s.id === segmentId);
      if (!exists) {
        campaign.segments.push(segment);
        await campaignRepo.save(campaign);
      }
      return res.json({ message: "Segment linked to campaign" });
    }
    res.status(404).json({ message: "Campaign or Segment not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// C7: Remove Segment from Campaign
exports.removeSegmentFromCampaign = async (req, res) => {
  try {
    const { id, segmentId } = req.params;
    const campaignRepo = AppDataSource.getRepository("EmailCampaign");

    const campaign = await campaignRepo.findOne({
      where: { id, tenantId: req.user.tenantId },
      relations: ["segments"]
    });

    if (campaign) {
      campaign.segments = campaign.segments.filter(s => s.id !== segmentId);
      await campaignRepo.save(campaign);
      return res.json({ message: "Segment unlinked from campaign" });
    }
    res.status(404).json({ message: "Campaign not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// C8
exports.executeCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const campaignRepo = AppDataSource.getRepository("EmailCampaign");
    const jobRepo = AppDataSource.getRepository("CampaignJob");

    // 1. Load Campaign + Segments + Customers (Strictly according to your diagram)
    const campaign = await campaignRepo.findOne({
      where: { id, tenantId },
      relations: ["segments", "segments.customers"]
    });

    if (!campaign || campaign.status !== 'DRAFT') {
      return res.status(400).json({ message: "Campaign must be in DRAFT status to execute." });
    }

    // 2. Deduplicate Verified Customers
    const customerMap = new Map();
    campaign.segments.forEach(segment => {
      segment.customers.forEach(customer => {
        if (customer.isVerified) {
          customerMap.set(customer.id, customer);
        }
      });
    });

    if (customerMap.size === 0) {
      return res.status(400).json({ message: "No verified customers found in selected segments." });
    }

    // 3. Update Status to RUNNING
    campaign.status = 'RUNNING';
    await campaignRepo.save(campaign);

    // 4. Generate Jobs and Add to BullMQ
    const customers = Array.from(customerMap.values());
    for (const customer of customers) {
      // Create record in CAMPAIGN_JOB table
      const jobRecord = jobRepo.create({
        campaignId: campaign.id,
        customerId: customer.id,
        tenantId: tenantId,
        status: 'PENDING'
      });
      await jobRepo.save(jobRecord);

      // Add to BullMQ for the worker to process
      await campaignQueue.add('sendEmail', {
        jobId: jobRecord.id,
        email: customer.email,
        subject: campaign.subject,
        body: campaign.body,
        campaignId: campaign.id
      });
    }

    res.status(202).json({ 
      message: "Campaign running", 
      recipientCount: customerMap.size 
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// C9: Get Campaign Execution Summary
exports.getCampaignSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const jobRepo = AppDataSource.getRepository("CampaignJob");
    const campaignRepo = AppDataSource.getRepository("EmailCampaign");

    // 1. Get the Campaign basic info
    const campaign = await campaignRepo.findOne({
      where: { id, tenantId: req.user.tenantId }
    });

    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    // 2. Get all jobs associated with this campaign
    const jobs = await jobRepo.find({
      where: { campaignId: id },
      relations: ["customer"], // Show which customer got which email
      order: { sentAt: "DESC" }
    });

    // 3. Calculate Final Stats
    const summary = {
      campaignName: campaign.name,
      status: campaign.status,
      totalRecipients: jobs.length,
      sentCount: jobs.filter(j => j.status === 'SENT').length,
      failedCount: jobs.filter(j => j.status === 'FAILED').length,
      details: jobs.map(j => ({
        customer: j.customer.email,
        status: j.status,
        sentAt: j.sentAt,
        error: j.error
      }))
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};