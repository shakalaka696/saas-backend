const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

// T1: Create
router.post('/tenants', tenantController.createTenant);

// T2: Get All
router.get('/tenants', tenantController.getAllTenants);

// T3: Get One (The :id is a placeholder for the actual UUID)
router.get('/tenants/:id', tenantController.getTenantById);

// T4: Update
router.patch('/tenants/:id', tenantController.updateTenant);

// T5: Delete
router.delete('/tenants/:id', tenantController.deleteTenant);

module.exports = router;