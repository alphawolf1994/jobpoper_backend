const asyncHandler = require('express-async-handler');
const Job = require('../models/Job');

// @desc    Show interest in a job
// @route   POST /api/jobs/:id/interest
// @access  Private
const showInterestInJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const job = await Job.findById(id);

    if (!job || !job.isActive || job.status !== 'open') {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found or not open'
      });
    }

    // Only allow interest when the poster requested show_interest
    if (job.responsePreference !== 'show_interest') {
      return res.status(400).json({
        status: 'error',
        message: 'This job does not accept interest submissions'
      });
    }

    const alreadyInterested = (job.interestedUsers || []).some(
      (entry) => entry.user.toString() === req.user._id.toString()
    );

    if (alreadyInterested) {
      return res.status(200).json({
        status: 'success',
        message: 'Interest already recorded'
      });
    }

    job.interestedUsers = job.interestedUsers || [];
    job.interestedUsers.push({ user: req.user._id, notedAt: new Date() });
    await job.save();

    res.status(201).json({
      status: 'success',
      message: 'Interest recorded successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to record interest',
      error: error.message
    });
  }
});

// @desc    Get jobs current user showed interest in
// @route   GET /api/jobs/my-interests
// @access  Private
const getMyInterestedJobs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'scheduledDate';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const sort = {};
  sort[sortBy] = sortOrder;

  try {
    const filter = {
      isActive: true,
      status: 'open',
      scheduledDate: { $exists: true },
      'interestedUsers.user': req.user._id
    };

    const jobs = await Job.find(filter)
      .populate('postedBy', 'phoneNumber profile.fullName profile.email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        jobs,
        pagination: {
          currentPage: page,
          totalPages,
          totalJobs: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch interested jobs',
      error: error.message
    });
  }
});

// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private
const createJob = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    cost,
    location,
    jobType,
    urgency,
    scheduledDate,
    scheduledTime,
    responsePreference
  } = req.body;

  // If location was sent as a JSON string (common with multipart/form-data), parse it.
  let locationObj = location;
  if (typeof location === 'string') {
    try {
      locationObj = JSON.parse(location);
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid location format. Send location as an object or a JSON string.'
      });
    }
  }

  // Validate required fields
  if (!title || !description || !cost || !locationObj || !jobType || !urgency || !scheduledDate || !scheduledTime || !responsePreference) {
    return res.status(400).json({
      status: 'error',
      message: 'All required fields must be provided'
    });
  }

  // Validate responsePreference
  const validResponsePreferences = ['direct_contact', 'show_interest'];
  if (!validResponsePreferences.includes(responsePreference)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid response preference. Must be one of: direct_contact, show_interest'
    });
  }

  // Validate scheduled date is not in the past
  const scheduledDateObj = new Date(scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (scheduledDateObj < today) {
    return res.status(400).json({
      status: 'error',
      message: 'Scheduled date cannot be in the past'
    });
  }

  // Build attachments from uploaded files (if any)
  const uploadedAttachments = (req.processedFileNames || []).map(name => `jobs/${name}`);

  // Validate attachments limit
  if (uploadedAttachments.length > 5) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot have more than 5 attachments'
    });
  }
  // If the client did send files but zero could be used, log a warning for ops/debug
  if (req.files && req.files.length && uploadedAttachments.length === 0) {
    console.warn('[WARN] createJob: attachments submitted but none processed. Check file types.');
  }

  try {
    const job = await Job.create({
      title,
      description,
      cost,
      location: locationObj,
      jobType,
      urgency,
      scheduledDate: scheduledDateObj,
      scheduledTime,
      responsePreference,
      attachments: uploadedAttachments,
      postedBy: req.user._id
    });

    // Populate the postedBy field
    await job.populate('postedBy', 'phoneNumber profile.fullName profile.email');

    res.status(201).json({
      status: 'success',
      message: 'Job created successfully',
      data: {
        job
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create job',
      error: error.message
    });
  }
});

// @desc    Get all jobs with pagination and filtering
// @route   GET /api/jobs
// @access  Public
const getAllJobs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  
  const {
    urgency,
    location,
    search
  } = req.query;

  // Build filter object - only show open jobs
  const filter = { 
    isActive: true,
    status: 'open'  // Only show open jobs
  };
  
  if (urgency) filter.urgency = urgency;

  // Location now stored as an object with source and destination.
  // If `location` query param provided, match against source/destination address or name.
  if (location) {
    filter.$or = [
      { 'location.source.fullAddress': { $regex: location, $options: 'i' } },
      { 'location.source.name': { $regex: location, $options: 'i' } },
      { 'location.destination.fullAddress': { $regex: location, $options: 'i' } },
      { 'location.destination.name': { $regex: location, $options: 'i' } }
    ];
  }

  if (search) {
    const searchOr = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'location.source.fullAddress': { $regex: search, $options: 'i' } },
      { 'location.destination.fullAddress': { $regex: search, $options: 'i' } }
    ];

    // Merge with existing $or (from location) if present
    if (filter.$or) filter.$or = filter.$or.concat(searchOr);
    else filter.$or = searchOr;
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder;

  try {
    const jobs = await Job.find(filter)
      .populate('postedBy', 'phoneNumber profile.fullName profile.email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        jobs,
        pagination: {
          currentPage: page,
          totalPages,
          totalJobs: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
});

// @desc    Get hot jobs (urgent jobs) with location filtering and pagination
// @route   GET /api/jobs/hot
// @access  Public
const getHotJobs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  
  const { location } = req.query;

  // Validate required location parameter
  if (!location) {
    return res.status(400).json({
      status: 'error',
      message: 'Location parameter is required'
    });
  }

  try {
    // Use aggregation to match jobs with users whose location matches the query
    const pipeline = [
      {
        $match: {
          isActive: true,
          status: 'open',
          urgency: 'Urgent'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'postedByUser'
        }
      },
      {
        $unwind: '$postedByUser'
      },
      {
        $match: {
          'postedByUser.profile.location': { $regex: location, $options: 'i' }
        }
      },
      {
        $addFields: {
          postedBy: {
            phoneNumber: '$postedByUser.phoneNumber',
            profile: {
              fullName: '$postedByUser.profile.fullName',
              email: '$postedByUser.profile.email',
              profileImage: '$postedByUser.profile.profileImage'
            }
          }
        }
      },
      {
        $project: {
          postedByUser: 0
        }
      },
      {
        $sort: { [sortBy]: sortOrder }
      },
      {
        $facet: {
          jobs: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: 'count' }
          ]
        }
      }
    ];

    const result = await Job.aggregate(pipeline);
    const jobs = result[0].jobs;
    const total = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        jobs,
        location,
        urgency: 'Urgent',
        pagination: {
          currentPage: page,
          totalPages,
          totalJobs: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch hot jobs',
      error: error.message
    });
  }
});

// @desc    Get normal jobs with location filtering and pagination
// @route   GET /api/jobs/normal
// @access  Public
const getNormalJobs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  
  const { location } = req.query;

  // Validate required location parameter
  if (!location) {
    return res.status(400).json({
      status: 'error',
      message: 'Location parameter is required'
    });
  }

  try {
    // Use aggregation to match jobs with users whose location matches the query
    const pipeline = [
      {
        $match: {
          isActive: true,
          status: 'open',
          urgency: 'Normal'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'postedByUser'
        }
      },
      {
        $unwind: '$postedByUser'
      },
      {
        $match: {
          'postedByUser.profile.location': { $regex: location, $options: 'i' }
        }
      },
      {
        $addFields: {
          postedBy: {
            phoneNumber: '$postedByUser.phoneNumber',
            profile: {
              fullName: '$postedByUser.profile.fullName',
              email: '$postedByUser.profile.email',
               profileImage: '$postedByUser.profile.profileImage'
            }
          }
        }
      },
      {
        $project: {
          postedByUser: 0
        }
      },
      {
        $sort: { [sortBy]: sortOrder }
      },
      {
        $facet: {
          jobs: [
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: 'count' }
          ]
        }
      }
    ];

    const result = await Job.aggregate(pipeline);
    const jobs = result[0].jobs;
    const total = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        jobs,
        location,
        urgency: 'Normal',
        pagination: {
          currentPage: page,
          totalPages,
          totalJobs: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch normal jobs',
      error: error.message
    });
  }
});

// @desc    Get a single job by ID
// @route   GET /api/jobs/:id
// @access  Public
const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const job = await Job.findById(id)
      .populate('postedBy', 'phoneNumber profile.fullName profile.email profile.location profile.profileImage')
      .populate('interestedUsers.user', 'profile.fullName profile.email phoneNumber profile.profileImage');

    if (!job || !job.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        job
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch job',
      error: error.message
    });
  }
});

// @desc    Get jobs posted by current user
// @route   GET /api/jobs/my-jobs
// @access  Private
const getMyJobs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const { status } = req.query;

  // Build filter object - show only active jobs posted by user
  const filter = { 
    postedBy: req.user._id,
    isActive: true
  };
  if (status) filter.status = status;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder;

  try {
    const jobs = await Job.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      data: {
        jobs,
        pagination: {
          currentPage: page,
          totalPages,
          totalJobs: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch your jobs',
      error: error.message
    });
  }
});

// @desc    Update a job
// @route   PUT /api/jobs/:id
// @access  Private
const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    // Check if user is the owner of the job
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this job'
      });
    }

    // Don't allow updating if job is completed or cancelled
    if (job.status === 'completed' || job.status === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot update completed or cancelled jobs'
      });
    }

    // If updating scheduled date, validate it's not in the past
    if (updateData.scheduledDate) {
      const scheduledDateObj = new Date(updateData.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (scheduledDateObj < today) {
        return res.status(400).json({
          status: 'error',
          message: 'Scheduled date cannot be in the past'
        });
      }
    }

    // If updating attachments, validate limit
    if (updateData.attachments && updateData.attachments.length > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot have more than 5 attachments'
      });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('postedBy', 'phoneNumber profile.fullName profile.email');

    res.status(200).json({
      status: 'success',
      message: 'Job updated successfully',
      data: {
        job: updatedJob
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update job',
      error: error.message
    });
  }
});

// @desc    Delete a job
// @route   DELETE /api/jobs/:id
// @access  Private
const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    // Check if user is the owner of the job
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this job'
      });
    }

    // Soft delete by setting isActive to false
    job.isActive = false;
    await job.save();

    res.status(200).json({
      status: 'success',
      message: 'Job deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete job',
      error: error.message
    });
  }
});

// @desc    Update job status
// @route   PUT /api/jobs/:id/status
// @access  Private
const updateJobStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
  const validStatuses = ['open', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid status. Must be one of: open, completed, cancelled'
    });
  }

  try {
    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    // Check if user is the owner of the job
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this job status'
      });
    }

    // Update status
    job.status = status;
    if (status === 'completed') {
      job.completedAt = new Date();
    }

    await job.save();

    res.status(200).json({
      status: 'success',
      message: `Job status updated to ${status}`,
      data: {
        job: {
          id: job._id,
          status: job.status,
          completedAt: job.completedAt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update job status',
      error: error.message
    });
  }
});

module.exports = {
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
};
