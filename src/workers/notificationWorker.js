const { Worker } = require('bullmq');
const { redisConfig } = require('../config/redis');
const { prisma } = require('../config/db');

const worker = new Worker('notificationQueue', async (job) => {
  const { userId, tenantId, message } = job.data;
  
  // Simulate delay (like sending an email)
  await new Promise(res => setTimeout(res, 2000));

  await prisma.notification.create({
    data: { userId, tenantId, message, status: 'SENT' }
  });
  
  return { userId, status: 'SUCCESS' }; // Return value for the 'completed' event
}, { connection: redisConfig });

// --- ADD THESE EVENT LISTENERS ---

// 1. Log when the worker is ready
console.log('🏃 Notification Worker is listening for jobs...');

// 2. Log when a job successfully completes
worker.on('completed', (job, returnvalue) => {
  console.log(`✅ Job ${job.id} completed: Notification sent to user ${returnvalue.userId}`);
});

// 3. Log if a job fails
worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed: ${err.message}`);
});

// 4. Log if the worker connection has an error
worker.on('error', err => {
  console.error('🔥 Worker connection error:', err);
});

module.exports = worker;