const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadJobImages } = require('../middleware/upload');
const {
  createJob,
  getAllJobs,
  getHotJobs,
  getNormalJobs,
  getJobById,
  getMyJobs,
  updateJob,
  deleteJob,
  updateJobStatus
} = require('../controllers/jobController');

// Public routes
router.get('/', getAllJobs);
router.get('/hot', getHotJobs);
router.get('/normal', getNormalJobs);
router.get('/:id', getJobById);

// Protected routes (require authentication)
router.use(protect);

router.post('/', uploadJobImages, createJob);
router.get('/my-jobs', getMyJobs);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);
router.put('/:id/status', updateJobStatus);

module.exports = router;
