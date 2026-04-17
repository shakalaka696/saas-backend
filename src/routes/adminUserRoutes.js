const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { verifyToken } = require('../middleware/authMiddleware');

// Admin User Management

router.post('/users', verifyToken, adminUserController.createAdmin);      // AU1
router.get('/users', verifyToken, adminUserController.getAdmins);        // AU2
router.get('/users/:id', verifyToken, adminUserController.getAdminById);  // AU3
router.patch('/users/:id', verifyToken, adminUserController.updateAdmin); // AU4
router.delete('/users/:id', verifyToken, adminUserController.deleteAdmin);// AU5

module.exports = router;