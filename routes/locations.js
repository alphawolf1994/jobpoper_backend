const express = require('express');
const router = express.Router();
const {
  saveLocation,
  getMyLocations,
  deleteLocation,
  updateLocation
} = require('../controllers/locationController');
const { protect } = require('../middleware/auth');

// All routes are protected and require authentication
router.use(protect);

// Create a new location
router.post('/', saveLocation);

// Get all locations for the authenticated user
router.get('/', getMyLocations);

// Update a location by ID
router.put('/:id', updateLocation);

// Delete a location by ID
router.delete('/:id', deleteLocation);

module.exports = router;

