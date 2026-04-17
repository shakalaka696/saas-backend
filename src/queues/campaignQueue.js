const { Queue } = require('bullmq');
const redisConfig = { connection: { host: '127.0.0.1', port: 6379 } };

const campaignQueue = new Queue('campaignQueue', redisConfig);

module.exports = { campaignQueue };