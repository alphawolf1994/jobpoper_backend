# JobPoper Jobs API Documentation

## Overview
The Jobs API provides comprehensive job management functionality including creating, retrieving, updating, and deleting jobs. It supports pagination, filtering, and job applications.

## Base URL
```
http://localhost:3001/api/jobs
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Job Types
The following job types are supported:
- `cleaning` - House cleaning, office cleaning, etc.
- `maintenance` - Home repairs, equipment maintenance, etc.
- `delivery` - Package delivery, food delivery, etc.
- `moving` - Moving services, furniture transport, etc.
- `gardening` - Lawn care, landscaping, plant care, etc.
- `pet_care` - Pet walking, pet sitting, grooming, etc.
- `tutoring` - Educational services, tutoring, etc.
- `tech_support` - Computer help, IT support, etc.
- `other` - Any other type of job

## Urgency Levels
- `Urgent` - Needs to be done immediately
- `High Priority` - Should be done soon
- `Normal` - Standard priority
- `Flexible` - No specific timeline
- `Ongoing` - Recurring or long-term job

## Job Status
- `open` - Job is live and available for contact
- `completed` - Job has been finished
- `cancelled` - Job has been cancelled

---

## Endpoints

### 1. Get All Jobs
**GET** `/api/jobs`

Get all jobs with pagination and filtering options.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `jobType` (optional) - Filter by job type
- `urgency` (optional) - Filter by urgency level
- `location` (optional) - Filter by location (case-insensitive)
- `search` (optional) - Search in title, description, and location
- `sortBy` (optional, default: 'createdAt') - Sort by field (createdAt, title, urgency, scheduledDate)
- `sortOrder` (optional, default: 'desc') - Sort order (asc, desc)

**Note:** This endpoint only returns open jobs (not completed or cancelled)

**Example Request:**
```bash
GET /api/jobs?page=1&limit=10&jobType=cleaning&urgency=Urgent&location=New York&search=house&sortBy=createdAt&sortOrder=desc
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "jobs": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "title": "Need House Cleaner",
        "description": "Looking for a reliable house cleaner...",
        "cost": "$50/hour",
        "location": "Downtown, NYC",
        "jobType": "cleaning",
        "urgency": "Urgent",
        "scheduledDate": "2024-01-15T00:00:00.000Z",
        "scheduledTime": "10:00 AM",
        "attachments": ["https://example.com/image1.jpg"],
        "status": "open",
        "postedBy": {
          "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
          "phoneNumber": "+1234567890",
          "profile": {
            "fullName": "John Doe",
            "email": "john@example.com"
          }
        },
        "isActive": true,
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-01-10T10:00:00.000Z",
        "contactInfo": "+1234567890"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalJobs": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 2. Get Hot Jobs
**GET** `/api/jobs/hot`

Get urgent jobs by location with pagination and sorting.

**Query Parameters:**
- `location` (required) - Location to filter urgent jobs (case-insensitive)
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `sortBy` (optional, default: 'createdAt') - Sort by field (createdAt, title, urgency, scheduledDate)
- `sortOrder` (optional, default: 'desc') - Sort order (asc, desc)

**Note:** This endpoint only returns urgent open jobs in the specified location

**Example Request:**
```bash
GET /api/jobs/hot?location=New York&page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "jobs": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "title": "Urgent House Cleaning Needed",
        "description": "Need immediate house cleaning...",
        "cost": "$50/hour",
        "location": "New York, NY",
        "jobType": "cleaning",
        "urgency": "Urgent",
        "scheduledDate": "2024-01-15T00:00:00.000Z",
        "scheduledTime": "10:00 AM",
        "attachments": ["https://example.com/image1.jpg"],
        "status": "open",
        "postedBy": {
          "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
          "phoneNumber": "+1234567890",
          "profile": {
            "fullName": "John Doe",
            "email": "john@example.com"
          }
        },
        "isActive": true,
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-01-10T10:00:00.000Z",
        "contactInfo": "+1234567890"
      }
    ],
    "location": "New York",
    "urgency": "Urgent",
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalJobs": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 3. Get Normal Jobs
**GET** `/api/jobs/normal`

Get normal priority jobs by location with pagination and sorting.

**Query Parameters:**
- `location` (required) - Location to filter normal jobs (case-insensitive)
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `sortBy` (optional, default: 'createdAt') - Sort by field (createdAt, title, urgency, scheduledDate)
- `sortOrder` (optional, default: 'desc') - Sort order (asc, desc)

**Note:** This endpoint only returns normal priority open jobs in the specified location

**Example Request:**
```bash
GET /api/jobs/normal?location=New York&page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

**Response:** (Same format as Get Hot Jobs, but with urgency: "Normal")

### 4. Get Jobs by Type
**GET** `/api/jobs/type/:jobType`

Get jobs filtered by specific job type with pagination and filtering.

**Path Parameters:**
- `jobType - One of the valid job types (cleaning, maintenance, delivery, etc.)

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `urgency` (optional) - Filter by urgency level
- `location` (optional) - Filter by location (case-insensitive)
- `search` (optional) - Search in title, description, and location
- `sortBy` (optional, default: 'createdAt') - Sort by field (createdAt, title, urgency, scheduledDate)
- `sortOrder` (optional, default: 'desc') - Sort order (asc, desc)

**Example Request:**
```bash
GET /api/jobs/type/cleaning?page=1&limit=10&urgency=Urgent&location=New York&search=house&sortBy=createdAt&sortOrder=desc
```

**Response:** (Same format as Get All Jobs)

### 3. Get Job by ID
**GET** `/api/jobs/:id`

Get a specific job by its ID.

**Path Parameters:**
- `id` - Job ID

**Example Request:**
```bash
GET /api/jobs/60f7b3b3b3b3b3b3b3b3b3b3
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "job": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "title": "Need House Cleaner",
      "description": "Looking for a reliable house cleaner...",
      "cost": "$50/hour",
      "location": "Downtown, NYC",
      "jobType": "cleaning",
      "urgency": "Urgent",
      "scheduledDate": "2024-01-15T00:00:00.000Z",
      "scheduledTime": "10:00 AM",
      "attachments": ["https://example.com/image1.jpg"],
        "status": "open",
        "postedBy": {
          "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
          "phoneNumber": "+1234567890",
          "profile": {
            "fullName": "John Doe",
            "email": "john@example.com",
            "location": "New York, NY"
          }
        },
        "isActive": true,
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-01-10T10:00:00.000Z",
        "contactInfo": "+1234567890"
    }
  }
}
```

### 4. Create Job
**POST** `/api/jobs`

Create a new job. Requires authentication.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Need House Cleaner",
  "description": "Looking for a reliable house cleaner for a 3-bedroom apartment. Need deep cleaning including kitchen, bathrooms, and living areas. Must be available this weekend.",
  "cost": "$50/hour",
  "location": "Downtown, NYC",
  "jobType": "cleaning",
  "urgency": "Urgent",
  "scheduledDate": "2024-01-15",
  "scheduledTime": "10:00 AM",
  "attachments": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

**Required Fields:**
- `title` - Job title (max 100 characters)
- `description` - Job description (max 2000 characters)
- `cost` - Cost/budget information (max 100 characters)
- `location` - Job location (max 200 characters)
- `jobType` - One of the valid job types
- `urgency` - One of the valid urgency levels
- `scheduledDate` - Date when job needs to be done (YYYY-MM-DD format, cannot be in the past)
- `scheduledTime` - Preferred time for the job

**Optional Fields:**
- `attachments` - Array of image URLs (max 5 attachments)

**Response:**
```json
{
  "status": "success",
  "message": "Job created successfully",
  "data": {
    "job": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "title": "Need House Cleaner",
      "description": "Looking for a reliable house cleaner...",
      "cost": "$50/hour",
      "location": "Downtown, NYC",
      "jobType": "cleaning",
      "urgency": "Urgent",
      "scheduledDate": "2024-01-15T00:00:00.000Z",
      "scheduledTime": "10:00 AM",
      "attachments": ["https://example.com/image1.jpg"],
      "status": "open",
      "postedBy": {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "phoneNumber": "+1234567890",
        "profile": {
          "fullName": "John Doe",
          "email": "john@example.com"
        }
      },
      "assignedTo": null,
      "applications": [],
      "isActive": true,
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z"
    }
  }
}
```

### 5. Get My Jobs
**GET** `/api/jobs/my-jobs`

Get jobs posted by the current user. Requires authentication.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `status` (optional) - Filter by job status
- `sortBy` (optional, default: 'createdAt') - Sort by field (createdAt, title, urgency, scheduledDate)
- `sortOrder` (optional, default: 'desc') - Sort order (asc, desc)

**Example Request:**
```bash
GET /api/jobs/my-jobs?page=1&limit=10&status=open&sortBy=createdAt&sortOrder=desc
```

**Response:** (Same format as Get All Jobs)

### 6. Update Job
**PUT** `/api/jobs/:id`

Update an existing job. Requires authentication and job ownership.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `id` - Job ID

**Request Body:** (Same format as Create Job, but all fields are optional)

**Example Request:**
```json
{
  "title": "Updated House Cleaning Job",
  "description": "Updated description for the house cleaning job.",
  "cost": "$60/hour",
  "urgency": "High Priority"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Job updated successfully",
  "data": {
    "job": {
      // Updated job object
    }
  }
}
```

### 7. Delete Job
**DELETE** `/api/jobs/:id`

Delete a job (soft delete). Requires authentication and job ownership.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id` - Job ID

**Response:**
```json
{
  "status": "success",
  "message": "Job deleted successfully"
}
```

### 8. Update Job Status
**PUT** `/api/jobs/:id/status`

Update the status of a job. Requires authentication and job ownership.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
- `id` - Job ID

**Request Body:**
```json
{
  "status": "completed"
}
```

**Required Fields:**
- `status` - New job status (open, completed, cancelled)

**Response:**
```json
{
  "status": "success",
  "message": "Job status updated to completed",
  "data": {
    "job": {
      "id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "status": "completed",
      "completedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "message": "All required fields must be provided"
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Not authorized to access this resource"
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "Not authorized to update this job"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Job not found"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Failed to create job",
  "error": "Detailed error message"
}
```

---

## Validation Rules

### Job Creation/Update
- `title`: Required, max 100 characters
- `description`: Required, max 2000 characters
- `cost`: Required, max 100 characters
- `location`: Required, max 200 characters
- `jobType`: Required, must be one of the valid job types
- `urgency`: Required, must be one of the valid urgency levels
- `scheduledDate`: Required, cannot be in the past
- `scheduledTime`: Required
- `attachments`: Optional, max 5 attachments

### Job Status Updates
- `status`: Required, must be one of: open, completed, cancelled
- Only job owners can update status
- When status is set to 'completed', completedAt timestamp is automatically set

### Authorization
- Only job owners can update/delete their jobs
- Cannot update completed or cancelled jobs
- Authentication required for create, update, delete, and status update operations

---

## Rate Limiting
Currently no rate limiting is implemented, but it's recommended to implement rate limiting for production use.

## CORS
The API supports CORS for cross-origin requests. The allowed origins are configured in the server settings.

---

## Example Usage with cURL

### Create a Job
```bash
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Need House Cleaner",
    "description": "Looking for a reliable house cleaner...",
    "cost": "$50/hour",
    "location": "Downtown, NYC",
    "jobType": "cleaning",
    "urgency": "Urgent",
    "scheduledDate": "2024-01-15",
    "scheduledTime": "10:00 AM"
  }'
```

### Get All Jobs
```bash
curl -X GET "http://localhost:3001/api/jobs?page=1&limit=10&jobType=cleaning&sortBy=createdAt&sortOrder=desc"
```

### Get Hot Jobs
```bash
curl -X GET "http://localhost:3001/api/jobs/hot?location=New York&page=1&limit=10&sortBy=createdAt&sortOrder=desc"
```

### Get Normal Jobs
```bash
curl -X GET "http://localhost:3001/api/jobs/normal?location=New York&page=1&limit=10&sortBy=createdAt&sortOrder=desc"
```

### Update Job Status
```bash
curl -X PUT http://localhost:3001/api/jobs/JOB_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "status": "completed"
  }'
```
