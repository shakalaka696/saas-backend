const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { AppDataSource } = require('../config/database');

// 1. Configure Mailtrap (Same as your OTP worker)
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

const redisConfig = { connection: { host: '127.0.0.1', port: 6379 } };

// 2. Define the Worker
const campaignWorker = new Worker('campaignQueue', async (job) => {
  const { jobId, email, subject, body, campaignId } = job.data;
  const jobRepo = AppDataSource.getRepository("CampaignJob");
  const campaignRepo = AppDataSource.getRepository("EmailCampaign");

  console.log(`[Worker] Processing email for: ${email}`);

  try {
    // A. Send the Email
    await transporter.sendMail({
      from: '"Marketing Team" <marketing@yourplatform.com>',
      to: email,
      subject: subject,
      html: body,
    });

    // B. Update CampaignJob to SENT
    await jobRepo.update(jobId, { 
      status: 'SENT', 
      sentAt: new Date() 
    });

    // C. Check if Campaign is finished (Any PENDING left?)
    const remainingJobs = await jobRepo.count({ 
      where: { campaignId: campaignId, status: 'PENDING' } 
    });

    if (remainingJobs === 0) {
      await campaignRepo.update(campaignId, { status: 'COMPLETED' });
      console.log(`[Worker] Campaign ${campaignId} fully COMPLETED!`);
    }

  } catch (error) {
    console.error(`[Worker] Failed to send to ${email}:`, error.message);
    
    // Update Job to FAILED
    await jobRepo.update(jobId, { 
      status: 'FAILED', 
      error: error.message 
    });
  }
}, redisConfig);

console.log('🚀 Campaign Worker is running and watching the queue...');

module.exports = campaignWorker;