// const { Queue } = require('bullmq');
// const redisConfig = { connection: { host: '127.0.0.1', port: 6379 } };

// const campaignQueue = new Queue('campaignQueue', redisConfig);

// module.exports = { campaignQueue };
const { Queue } = require('bullmq');

const redisConfig = { 
  connection: { host: '127.0.0.1', port: 6379 } 
};

const campaignQueue = new Queue('campaignQueueV2', {
  connection: { host: '127.0.0.1', port: 6379 },
  defaultJobOptions: {
    attempts: 5, // Increase retries
    backoff: {
      type: 'fixed',
      delay: 10000, // If Mailtrap blocks us, wait 10 seconds before trying again
    },
  },
  limiter: {
    max: 1,
    duration: 7000, // 🚀 Slow it down to 1 email every 5 seconds
  },
});

module.exports = { campaignQueue };