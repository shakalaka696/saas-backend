const router = require('express').Router();
const userController = require('../controllers/user.controller');
const { authenticate, isAdmin } = require('../middleware/auth');

// Only Admins can create users
router.post('/', authenticate, isAdmin, userController.createUser);

// Admins or Users can view the user list of their own tenant
router.get('/', authenticate, userController.getTenantUsers);

module.exports = router;