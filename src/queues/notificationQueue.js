const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');

const notificationQueue = new Queue('notificationQueue', { connection: redisConfig });

module.exports = { notificationQueue };