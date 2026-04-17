const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const segmentController = require('../controllers/segmentController');
const campaignController = require('../controllers/campaignController');
const { verifyToken } = require('../middleware/authMiddleware');


router.use(verifyToken);

// Admin Customer Management

router.get('/customers', customerController.listCustomers);
router.get('/customers/:id', customerController.getCustomerById);
router.delete('/customers/:id', customerController.deleteCustomer);

// Segment Management

router.post('/segments', segmentController.createSegment);           // S1
router.get('/segments', segmentController.listSegments);             // S2
router.get('/segments/:id', segmentController.getSegmentById);       // S3
router.put('/segments/:id', segmentController.updateSegment);        // S4
router.delete('/segments/:id', segmentController.deleteSegment);     // S5
router.post('/segments/:id/customers', segmentController.addCustomerToSegment); // S6
router.delete('/segments/:id/customers/:customerId', segmentController.removeCustomerFromSegment); // S7

// --- Admin - Email Campaigns (C1-C5 + Execution) ---
router.post('/campaigns', campaignController.createCampaign);           // C1: Create
router.get('/campaigns', campaignController.listCampaigns);             // C2: List All
router.get('/campaigns/:id', campaignController.getCampaignById);       // C3: View Details
router.put('/campaigns/:id', campaignController.updateCampaign);        // C4: Update
router.delete('/campaigns/:id', campaignController.deleteCampaign);     // C5: Delete

// Segment Association
router.post('/campaigns/:id/segments', campaignController.addSegmentToCampaign); // C6
router.delete('/campaigns/:id/segments/:segmentId', campaignController.removeSegmentFromCampaign); // C7

// Execution
router.post('/campaigns/:id/execute', campaignController.executeCampaign); // Trigger Send C8

// C9: Campaign Summary/Analytics
router.get('/campaigns/:id/summary', campaignController.getCampaignSummary);

module.exports = router;