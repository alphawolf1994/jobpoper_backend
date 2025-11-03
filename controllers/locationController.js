const asyncHandler = require('express-async-handler');
const Location = require('../models/Location');

// @desc    Save a new location
// @route   POST /api/locations
// @access  Private
const saveLocation = asyncHandler(async (req, res) => {
  const { name, fullAddress, latitude, longitude, addressDetails, createdAt } = req.body;

  // Validate required fields
  if (!name || !fullAddress || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'Name, full address, latitude, and longitude are required'
    });
  }

  // Validate latitude and longitude are valid numbers
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({
      status: 'error',
      message: 'Latitude and longitude must be valid numbers'
    });
  }

  // Validate latitude and longitude ranges
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({
      status: 'error',
      message: 'Latitude must be between -90 and 90'
    });
  }

  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({
      status: 'error',
      message: 'Longitude must be between -180 and 180'
    });
  }

  try {
    // Check if location with same name already exists for this user
    const existingLocation = await Location.findOne({ 
      user: req.user._id, 
      name: name.trim() 
    });

    if (existingLocation) {
      return res.status(400).json({
        status: 'error',
        message: `Location with name "${name}" already exists. Please choose a different name.`
      });
    }

    // Create new location
    const location = await Location.create({
      user: req.user._id,
      name: name.trim(),
      fullAddress: fullAddress.trim(),
      latitude,
      longitude,
      addressDetails: addressDetails ? addressDetails.trim() : '',
      createdAt: createdAt || Date.now()
    });

    res.status(201).json({
      status: 'success',
      message: 'Location saved successfully',
      data: {
        location: {
          id: location._id,
          name: location.name,
          fullAddress: location.fullAddress,
          latitude: location.latitude,
          longitude: location.longitude,
          addressDetails: location.addressDetails,
          createdAt: location.createdAt
        }
      }
    });
  } catch (error) {
    // Handle unique constraint violation specifically
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: `Location with name "${name}" already exists. Please choose a different name.`
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to save location',
      error: error.message
    });
  }
});

// @desc    Get all locations for the authenticated user
// @route   GET /api/locations
// @access  Private
const getMyLocations = asyncHandler(async (req, res) => {
  try {
    const locations = await Location.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('name fullAddress latitude longitude addressDetails createdAt');

    res.status(200).json({
      status: 'success',
      message: 'Locations retrieved successfully',
      data: {
        locations: locations.map(loc => ({
          id: loc._id,
          name: loc.name,
          fullAddress: loc.fullAddress,
          latitude: loc.latitude,
          longitude: loc.longitude,
          addressDetails: loc.addressDetails,
          createdAt: loc.createdAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve locations',
      error: error.message
    });
  }
});

// @desc    Delete a location
// @route   DELETE /api/locations/:id
// @access  Private
const deleteLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // Find location and verify ownership
    const location = await Location.findById(id);

    if (!location) {
      return res.status(404).json({
        status: 'error',
        message: 'Location not found'
      });
    }

    // Verify that the location belongs to the authenticated user
    if (location.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this location'
      });
    }

    // Delete the location
    await location.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Location deleted successfully',
      data: {
        id: location._id
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete location',
      error: error.message
    });
  }
});

module.exports = {
  saveLocation,
  getMyLocations,
  deleteLocation
};

