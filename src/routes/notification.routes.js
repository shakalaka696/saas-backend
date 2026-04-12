const router = require('express').Router();
const notifyController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, notifyController.sendNotification);
router.get('/', authenticate, notifyController.getMyNotifications);
router.get('/status/:jobId', authenticate, notifyController.getJobStatus);

module.exports = router;