const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Helper function to extract location strings from job location
const extractLocationStrings = (jobLocation, jobType) => {
  const locations = [];
  
  if (jobType === 'OnSite' && jobLocation) {
    if (jobLocation.name) locations.push(jobLocation.name);
    if (jobLocation.fullAddress) locations.push(jobLocation.fullAddress);
  } else if (jobType === 'Pickup' && jobLocation) {
    if (jobLocation.source) {
      if (jobLocation.source.name) locations.push(jobLocation.source.name);
      if (jobLocation.source.fullAddress) locations.push(jobLocation.source.fullAddress);
    }
    if (jobLocation.destination) {
      if (jobLocation.destination.name) locations.push(jobLocation.destination.name);
      if (jobLocation.destination.fullAddress) locations.push(jobLocation.destination.fullAddress);
    }
  }
  
  return locations;
};

// Helper function to create notifications for users in same location
const createJobCreatedNotifications = async (job, jobCreatorId) => {
  try {
    const locationStrings = extractLocationStrings(job.location, job.jobType);
    
    if (locationStrings.length === 0) {
      return; // No location data to match
    }

    // Build query to find users with matching location
    // Match if user's profile.location contains any of the location strings
    const locationQuery = {
      $or: locationStrings.map(loc => ({
        'profile.location': { $regex: loc, $options: 'i' }
      }))
    };

    // Find users with matching location, excluding the job creator
    const matchingUsers = await User.find({
      ...locationQuery,
      _id: { $ne: jobCreatorId },
      isActive: true,
      'profile.isProfileComplete': true
    }).select('_id');

    if (matchingUsers.length === 0) {
      return; // No users to notify
    }

    // Get job creator info for notification message
    const jobCreator = await User.findById(jobCreatorId).select('profile.fullName');
    const creatorName = jobCreator?.profile?.fullName || 'Someone';

    // Create notifications for all matching users
    const notifications = matchingUsers.map(user => ({
      recipient: user._id,
      type: 'job_created',
      title: 'New Job Available',
      message: `${creatorName} posted a new job: ${job.title}`,
      relatedEntityType: 'Job',
      relatedEntityId: job._id,
      navigationIdentifier: `job:${job._id}`,
      isRead: false
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    // Log error but don't fail the job creation
    console.error('Error creating job notifications:', error);
  }
};

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

    // Create notification for job owner
    try {
      // Get interested user info
      const interestedUser = await User.findById(req.user._id).select('profile.fullName');
      const interestedUserName = interestedUser?.profile?.fullName || 'Someone';

      // Create notification for job owner about this interest
      // Note: We don't check for duplicates here because the function already prevents
      // duplicate interests, so this will only be called for new interests
      await Notification.create({
        recipient: job.postedBy,
        type: 'job_interest',
        title: 'New Interest in Your Job',
        message: `${interestedUserName} showed interest in your job: ${job.title}`,
        relatedEntityType: 'Job',
        relatedEntityId: job._id,
        navigationIdentifier: `job:${job._id}`,
        isRead: false
      });
    } catch (error) {
      // Log error but don't fail the interest recording
      console.error('Error creating interest notification:', error);
    }

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

    // Create notifications for users in the same location (async, don't wait)
    createJobCreatedNotifications(job, req.user._id).catch(err => {
      console.error('Error creating notifications for new job:', err);
    });

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
    // First, update jobs that have passed their scheduled date/time to inactive
    const now = new Date();

    // Helper function to parse time string (format: "HH:MM AM/PM" or "HH:MM")
    const parseTime = (timeStr) => {
      if (!timeStr) return null;

      // Remove extra spaces and convert to uppercase for easier parsing
      const cleaned = timeStr.trim().toUpperCase();

      // Check if it has AM/PM
      const hasAMPM = cleaned.includes('AM') || cleaned.includes('PM');

      if (hasAMPM) {
        const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3];

          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }

          return { hours, minutes };
        }
      } else {
        // 24-hour format
        const match = cleaned.match(/(\d{1,2}):(\d{2})/);
        if (match) {
          return {
            hours: parseInt(match[1], 10),
            minutes: parseInt(match[2], 10)
          };
        }
      }

      return null;
    };

    // Find jobs that might be expired (check date first, then time)
    const expiredJobIds = [];
    const jobsToCheck = await Job.find({
      isActive: true,
      status: 'open',
      urgency: 'Urgent',
      scheduledDate: { $exists: true, $lte: now },
      scheduledTime: { $exists: true }
    }).select('_id scheduledDate scheduledTime');

    // Check each job's full datetime (date + time)
    for (const job of jobsToCheck) {
      if (!job.scheduledDate || !job.scheduledTime) continue;

      const timeParts = parseTime(job.scheduledTime);
      if (!timeParts) continue;

      // Create full datetime by combining scheduledDate with scheduledTime
      const scheduledDateTime = new Date(job.scheduledDate);
      scheduledDateTime.setHours(timeParts.hours, timeParts.minutes, 0, 0);

      // If scheduled datetime is in the past, mark for update
      if (scheduledDateTime < now) {
        expiredJobIds.push(job._id);
      }
    }

    // Bulk update expired jobs to inactive
    if (expiredJobIds.length > 0) {
      await Job.updateMany(
        { _id: { $in: expiredJobIds } },
        { $set: { isActive: false } }
      );
    }

    // Use aggregation to match jobs with users whose location matches the query
    // Build initial match conditions
    const initialMatch = {
      isActive: true,
      status: 'open',
      urgency: 'Urgent'
    };

    // Exclude current user's jobs if user is authenticated
    if (req.user && req.user._id) {
      initialMatch.postedBy = { $ne: new mongoose.Types.ObjectId(req.user._id) };
    }

    const pipeline = [
      {
        $match: initialMatch
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

// @desc    Search hot jobs (urgent jobs) by title with location filtering and pagination
// @route   GET /api/jobs/search/hot
// @access  Public
const searchHotJobs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const { location, search } = req.query;

  // Validate required parameters
  if (!location) {
    return res.status(400).json({
      status: 'error',
      message: 'Location parameter is required'
    });
  }

  if (!search) {
    return res.status(400).json({
      status: 'error',
      message: 'Search parameter is required'
    });
  }

  try {
    // First, update jobs that have passed their scheduled date/time to inactive
    const now = new Date();

    // Helper function to parse time string (format: "HH:MM AM/PM" or "HH:MM")
    const parseTime = (timeStr) => {
      if (!timeStr) return null;

      // Remove extra spaces and convert to uppercase for easier parsing
      const cleaned = timeStr.trim().toUpperCase();

      // Check if it has AM/PM
      const hasAMPM = cleaned.includes('AM') || cleaned.includes('PM');

      if (hasAMPM) {
        const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3];

          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }

          return { hours, minutes };
        }
      } else {
        // 24-hour format
        const match = cleaned.match(/(\d{1,2}):(\d{2})/);
        if (match) {
          return {
            hours: parseInt(match[1], 10),
            minutes: parseInt(match[2], 10)
          };
        }
      }

      return null;
    };

    // Find jobs that might be expired (check date first, then time)
    const expiredJobIds = [];
    const jobsToCheck = await Job.find({
      isActive: true,
      status: 'open',
      urgency: 'Urgent',
      scheduledDate: { $exists: true, $lte: now },
      scheduledTime: { $exists: true }
    }).select('_id scheduledDate scheduledTime');

    // Check each job's full datetime (date + time)
    for (const job of jobsToCheck) {
      if (!job.scheduledDate || !job.scheduledTime) continue;

      const timeParts = parseTime(job.scheduledTime);
      if (!timeParts) continue;

      // Create full datetime by combining scheduledDate with scheduledTime
      const scheduledDateTime = new Date(job.scheduledDate);
      scheduledDateTime.setHours(timeParts.hours, timeParts.minutes, 0, 0);

      // If scheduled datetime is in the past, mark for update
      if (scheduledDateTime < now) {
        expiredJobIds.push(job._id);
      }
    }

    // Bulk update expired jobs to inactive
    if (expiredJobIds.length > 0) {
      await Job.updateMany(
        { _id: { $in: expiredJobIds } },
        { $set: { isActive: false } }
      );
    }

    // Build initial match conditions
    const initialMatch = {
      isActive: true,
      status: 'open',
      urgency: 'Urgent',
      title: { $regex: search, $options: 'i' } // Add title search
    };

    // Exclude current user's jobs if user is authenticated
    if (req.user && req.user._id) {
      initialMatch.postedBy = { $ne: new mongoose.Types.ObjectId(req.user._id) };
    }

    const pipeline = [
      {
        $match: initialMatch
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
        search,
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
      message: 'Failed to search hot jobs',
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
    // Build initial match conditions
    const initialMatch = {
      isActive: true,
      status: 'open',
      urgency: 'Normal'
    };

    // Exclude current user's jobs if user is authenticated
    if (req.user && req.user._id) {
      initialMatch.postedBy = { $ne: new mongoose.Types.ObjectId(req.user._id) };
    }

    // Use aggregation to match jobs with users whose location matches the query
    const pipeline = [
      {
        $match: initialMatch
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

// @desc    Search normal jobs by title with location filtering and pagination
// @route   GET /api/jobs/search/normal
// @access  Public
const searchNormalJobs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const { location, search } = req.query;

  // Validate required parameters
  if (!location) {
    return res.status(400).json({
      status: 'error',
      message: 'Location parameter is required'
    });
  }

  if (!search) {
    return res.status(400).json({
      status: 'error',
      message: 'Search parameter is required'
    });
  }

  try {
    // Build initial match conditions
    const initialMatch = {
      isActive: true,
      status: 'open',
      urgency: 'Normal',
      title: { $regex: search, $options: 'i' } // Add title search
    };

    // Exclude current user's jobs if user is authenticated
    if (req.user && req.user._id) {
      initialMatch.postedBy = { $ne: new mongoose.Types.ObjectId(req.user._id) };
    }

    // Use aggregation to match jobs with users whose location matches the query
    const pipeline = [
      {
        $match: initialMatch
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
        search,
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
      message: 'Failed to search normal jobs',
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

    if (!job) {
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
    // isActive: true
  };
  // if (status) filter.status = status;

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
  const {
    title,
    description,
    cost,
    location,
    jobType,
    urgency,
    scheduledDate,
    scheduledTime,
    responsePreference,
    attachments,
    newAttachments,
    existingAttachments
  } = req.body;

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

    // // Don't allow updating if job is completed or cancelled
    // if (job.status === 'completed' || job.status === 'cancelled') {
    //   return res.status(400).json({
    //     status: 'error',
    //     message: 'Cannot update completed or cancelled jobs'
    //   });
    // }

    // Build updateData object with only provided fields
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (cost !== undefined) updateData.cost = cost;
    if (jobType !== undefined) {
      // Validate jobType
      const validJobTypes = ['Pickup', 'OnSite'];
      if (!validJobTypes.includes(jobType)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid job type. Must be one of: Pickup, OnSite'
        });
      }
      updateData.jobType = jobType;
    }
    if (urgency !== undefined) {
      // Validate urgency
      const validUrgencies = ['Urgent', 'Normal'];
      if (!validUrgencies.includes(urgency)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid urgency. Must be one of: Urgent, Normal'
        });
      }
      updateData.urgency = urgency;
    }
    if (scheduledDate !== undefined) {
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
      updateData.scheduledDate = scheduledDateObj;
    }
    if (scheduledTime !== undefined) {
      updateData.scheduledTime = scheduledTime;
    }
    if (responsePreference !== undefined) {
      // Validate responsePreference
      const validResponsePreferences = ['direct_contact', 'show_interest'];
      if (!validResponsePreferences.includes(responsePreference)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid response preference. Must be one of: direct_contact, show_interest'
        });
      }
      updateData.responsePreference = responsePreference;
    }

    // Handle location parsing (if location was sent as a JSON string)
    if (location !== undefined) {
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
      updateData.location = locationObj;
    }

    // Handle attachments: combine newAttachments (uploaded files) and existingAttachments

    const { newAttachments, existingAttachments } = req.body;
    const combinedAttachments = [];

    // Add newly uploaded files (processed by upload middleware)
    if (req.processedFileNames && req.processedFileNames.length > 0) {
      const uploadedAttachments = req.processedFileNames.map(name => `jobs/${name}`);
      combinedAttachments.push(...uploadedAttachments);
    }

    // Add existing attachments (already saved paths)
    let existingAttachmentsArr = existingAttachments;
    if (typeof existingAttachments === 'string') {
      try {
        existingAttachmentsArr = JSON.parse(existingAttachments);
      } catch (err) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid existingAttachments format. Must be an array or JSON string.'
        });
      }
    }
    if (existingAttachmentsArr && Array.isArray(existingAttachmentsArr)) {
      combinedAttachments.push(...existingAttachmentsArr);
    }

    // If combined attachments provided, validate and save
    if (combinedAttachments.length > 0) {
      if (combinedAttachments.length > 5) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot have more than 5 attachments'
        });
      }
      updateData.attachments = combinedAttachments;
    } else if (attachments !== undefined) {
      // Fallback: if neither newAttachments nor existingAttachments are present,
      // but attachments field is provided, use it (for backwards compatibility)
      if (Array.isArray(attachments)) {
        if (attachments.length > 5) {
          return res.status(400).json({
            status: 'error',
            message: 'Cannot have more than 5 attachments'
          });
        }
        updateData.attachments = attachments;
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'Attachments must be an array'
        });
      }
    }

    // Always reset status to 'open' and isActive to true when job is updated
    updateData.status = 'open';
    updateData.isActive = true;

    // If no fields to update (excluding status and isActive), return error
    if (Object.keys(updateData).length === 2) {
      // Only status and isActive are set
      return res.status(400).json({
        status: 'error',
        message: 'No fields provided to update'
      });
    }

    // Apply updates on the document so that custom validators and pre-save hooks run correctly
    Object.assign(job, updateData);
    const updatedJob = await job.save();
    await updatedJob.populate('postedBy', 'phoneNumber profile.fullName profile.email');

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

// @desc    Deactivate jobs whose scheduled date/time is in the past
// @route   POST /api/jobs/expire-old
// @access  Private
const expireOldJobs = asyncHandler(async (req, res) => {
  try {
    const now = new Date();

    // Helper function to parse time string (format: "HH:MM AM/PM" or "HH:MM")
    const parseTime = (timeStr) => {
      if (!timeStr) return null;

      const cleaned = timeStr.trim().toUpperCase();
      const hasAMPM = cleaned.includes('AM') || cleaned.includes('PM');

      if (hasAMPM) {
        const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const period = match[3];

          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }

          return { hours, minutes };
        }
      } else {
        const match = cleaned.match(/(\d{1,2}):(\d{2})/);
        if (match) {
          return {
            hours: parseInt(match[1], 10),
            minutes: parseInt(match[2], 10)
          };
        }
      }

      return null;
    };

    // Find candidate jobs: open (regardless of isActive), with scheduled date/time not in the future (by date)
    const jobsToCheck = await Job.find({
      status: 'open',
      scheduledDate: { $exists: true, $lte: now },
      scheduledTime: { $exists: true }
    }).select('_id scheduledDate scheduledTime');

    const expiredJobIds = [];

    for (const job of jobsToCheck) {
      if (!job.scheduledDate || !job.scheduledTime) continue;

      const timeParts = parseTime(job.scheduledTime);
      if (!timeParts) continue;

      const scheduledDateTime = new Date(job.scheduledDate);
      scheduledDateTime.setHours(timeParts.hours, timeParts.minutes, 0, 0);

      if (scheduledDateTime < now) {
        expiredJobIds.push(job._id);
      }
    }

    let updatedCount = 0;
    if (expiredJobIds.length > 0) {
      const result = await Job.updateMany(
        { _id: { $in: expiredJobIds } },
        {
          $set: {
            isActive: false,
            status: 'cancelled'
          }
        }
      );
      updatedCount = result.modifiedCount || result.nModified || 0;
    }

    res.status(200).json({
      status: 'success',
      message: 'Expired jobs processed successfully',
      data: {
        checkedJobs: jobsToCheck.length,
        expiredJobs: expiredJobIds.length,
        updatedJobs: updatedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to process expired jobs',
      error: error.message
    });
  }
});

module.exports = {
  createJob,
  getAllJobs,
  getHotJobs,
  searchHotJobs,
  getNormalJobs,
  searchNormalJobs,
  getJobById,
  getMyJobs,
  getMyInterestedJobs,
  updateJob,
  deleteJob,
  updateJobStatus,
  showInterestInJob,
  expireOldJobs
};
