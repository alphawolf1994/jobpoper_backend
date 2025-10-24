const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const healthStatus = {
      status: 'success',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: {
        status: dbStates[dbState],
        connected: dbState === 1
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    };

    if (dbState === 1) {
      res.status(200).json(healthStatus);
    } else {
      res.status(503).json({
        ...healthStatus,
        status: 'error',
        message: 'Database connection failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Database connection test endpoint
router.get('/db', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    if (dbState === 1) {
      // Test database operations
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      res.status(200).json({
        status: 'success',
        message: 'Database connection successful',
        database: {
          name: mongoose.connection.name,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          state: dbStates[dbState],
          collections: collections.length
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'error',
        message: 'Database connection failed',
        database: {
          state: dbStates[dbState]
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database test failed',
      error: error.message
    });
  }
});

module.exports = router;
