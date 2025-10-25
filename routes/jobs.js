const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createJob,
  getAllJobs,
  getHotJobs,
  getNormalJobs,
  getJobsByType,
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
router.get('/type/:jobType', getJobsByType);
router.get('/:id', getJobById);

// Protected routes (require authentication)
router.use(protect);

router.post('/', createJob);
router.get('/my-jobs', getMyJobs);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);
router.put('/:id/status', updateJobStatus);

module.exports = router;
