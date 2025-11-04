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
  getMyInterestedJobs,
  updateJob,
  deleteJob,
  updateJobStatus,
  showInterestInJob
} = require('../controllers/jobController');

// Public routes
router.get('/', getAllJobs);
router.get('/hot', getHotJobs);
router.get('/normal', getNormalJobs);
// Protect only this route inline so it can appear before :id and avoid conflicts
router.get('/my-interests', protect, getMyInterestedJobs);
router.get('/:id', getJobById);

// Protected routes (require authentication)
router.use(protect);

router.post('/', uploadJobImages, createJob);
router.get('/my-jobs', getMyJobs);
router.post('/:id/interest', showInterestInJob);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);
router.put('/:id/status', updateJobStatus);

module.exports = router;
