const express = require('express');
const router = express.Router();
const routesController = require('../controllers/routes.controller');

// Map Search Endpoint
router.get('/map/search', routesController.searchLocation);

// Walking Route Endpoint
router.post('/routes/walking', routesController.getWalkingRoute);

// Transit Route Endpoint (Placeholder)
router.post('/routes/transit', (req, res) => {
    res.status(501).json({ message: "Transit routing not implemented yet" });
});

module.exports = router;
