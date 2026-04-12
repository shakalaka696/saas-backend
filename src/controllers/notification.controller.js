const { notificationQueue } = require('../queues/notificationQueue');
const { prisma } = require('../config/db');

exports.sendNotification = async (req, res) => {
  const { message } = req.body;
  
  // Add job to BullMQ
  const job = await notificationQueue.add('send-notification', {
    userId: req.user.id,
    tenantId: req.user.tenantId,
    message
  });

  res.status(202).json({ 
    message: 'Notification queued', 
    jobId: job.id 
  });
};

exports.getJobStatus = async (req, res) => {
  const { jobId } = req.params;
  const job = await notificationQueue.getJob(jobId);

  if (!job) return res.status(404).json({ error: 'Job not found' });

  const state = await job.getState();
  res.json({ jobId, state });
};

exports.getMyNotifications = async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { 
      tenantId: req.user.tenantId, // 🔒 Tenant Isolation
      userId: req.user.id 
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(notifications);
};