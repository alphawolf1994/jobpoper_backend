## Notifications API Documentation

This document describes all Notification APIs exposed by the backend and how the frontend can use them.

Base URL: `{{base_url}}` (for local dev: `http://localhost:3001`)

All notification endpoints require authentication:

- **Header**: `Authorization: Bearer {{auth_token}}`

Notifications are automatically created when:

- **Job created**: Users whose profile location matches the job location receive a `job_created` notification.
- **Job interest**: When a user shows interest in a job, the job owner receives a `job_interest` notification.

Each notification includes a **navigation identifier** that the frontend can use to navigate to the correct screen.

---

### Notification Object Shape

Example notification object returned from the API:

```json
{
  "_id": "676f1c8f0f8a2e3c1a234567",
  "recipient": "676f1b2a0f8a2e3c1a234123",
  "type": "job_created",
  "title": "New Job Available",
  "message": "John Doe posted a new job: Weekly Groceries Pickup",
  "relatedEntityType": "Job",
  "relatedEntityId": "676f1bde0f8a2e3c1a234999",
  "navigationIdentifier": "job:676f1bde0f8a2e3c1a234999",
  "isRead": false,
  "readAt": null,
  "createdAt": "2025-01-05T12:34:56.789Z",
  "updatedAt": "2025-01-05T12:34:56.789Z",
  "__v": 0
}
```

- **type**
  - `job_created`: New job in same location as user.
  - `job_interest`: Someone showed interest in the user's job.
- **navigationIdentifier**
  - Pattern: `job:<jobId>`
  - Frontend can `split(':')` and route by the first part (`job`) and use the ID.

---

### 1. Get All Notifications

- **Endpoint**: `GET /api/notifications`
- **Auth**: Required
- **Description**: Get paginated list of notifications for the current user. Also returns unread count.

#### Query Parameters

- **page** (number, optional, default: `1`)
- **limit** (number, optional, default: `20`)
- **isRead** (string, optional: `'true' | 'false'`)
  - If omitted, returns both read and unread notifications.
- **sortBy** (string, optional, default: `createdAt`)
  - Allowed: `createdAt`, `isRead`
- **sortOrder** (string, optional, default: `desc`)
  - Allowed: `asc`, `desc`

#### Request Example

```http
GET /api/notifications?page=1&limit=20&isRead=false&sortBy=createdAt&sortOrder=desc
Authorization: Bearer {{auth_token}}
```

#### Success Response (200)

```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "_id": "676f1c8f0f8a2e3c1a234567",
        "recipient": "676f1b2a0f8a2e3c1a234123",
        "type": "job_created",
        "title": "New Job Available",
        "message": "John Doe posted a new job: Weekly Groceries Pickup",
        "relatedEntityType": "Job",
        "relatedEntityId": "676f1bde0f8a2e3c1a234999",
        "navigationIdentifier": "job:676f1bde0f8a2e3c1a234999",
        "isRead": false,
        "readAt": null,
        "createdAt": "2025-01-05T12:34:56.789Z",
        "updatedAt": "2025-01-05T12:34:56.789Z"
      }
    ],
    "unreadCount": 3,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalNotifications": 3,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 2. Get Unread Notifications Count

- **Endpoint**: `GET /api/notifications/unread-count`
- **Auth**: Required
- **Description**: Get only the unread notifications count (for badge/bubble in UI).

#### Request Example

```http
GET /api/notifications/unread-count
Authorization: Bearer {{auth_token}}
```

#### Success Response (200)

```json
{
  "status": "success",
  "data": {
    "unreadCount": 3
  }
}
```

---

### 3. Mark Single Notification as Read

- **Endpoint**: `PUT /api/notifications/:id/read`
- **Auth**: Required
- **Description**: Mark one notification as read. Only the owner can update their notification.

#### URL Params

- **id**: Notification ID (`_id` from notifications list).

#### Request Example

```http
PUT /api/notifications/676f1c8f0f8a2e3c1a234567/read
Authorization: Bearer {{auth_token}}
```

#### Success Response (200)

```json
{
  "status": "success",
  "message": "Notification marked as read",
  "data": {
    "notification": {
      "_id": "676f1c8f0f8a2e3c1a234567",
      "isRead": true,
      "readAt": "2025-01-05T13:00:00.000Z"
    }
  }
}
```

---

### 4. Mark All Notifications as Read

- **Endpoint**: `PUT /api/notifications/read-all`
- **Auth**: Required
- **Description**: Mark all unread notifications of the current user as read.

#### Request Example

```http
PUT /api/notifications/read-all
Authorization: Bearer {{auth_token}}
```

#### Success Response (200)

```json
{
  "status": "success",
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 3
  }
}
```

---

### 5. Delete Notification

- **Endpoint**: `DELETE /api/notifications/:id`
- **Auth**: Required
- **Description**: Permanently delete a notification. Only the owner can delete.

#### URL Params

- **id**: Notification ID (`_id` from notifications list).

#### Request Example

```http
DELETE /api/notifications/676f1c8f0f8a2e3c1a234567
Authorization: Bearer {{auth_token}}
```

#### Success Response (200)

```json
{
  "status": "success",
  "message": "Notification deleted successfully"
}
```

---

### Frontend Integration Notes

- **Listing notifications**
  - Use `GET /api/notifications` on notifications screen load or pull-to-refresh.
  - Support pagination using `page` and `limit`.
  - Use `isRead=false` filter if you need an "unread only" list.

- **Badges / counters**
  - Call `GET /api/notifications/unread-count` on app start and periodically (or after actions that may create notifications).

- **Mark as read**
  - When user opens a notification, call `PUT /api/notifications/:id/read`.
  - Optionally optimistically update UI before server response.

- **Mark all as read**
  - Provide a button like "Mark all as read" and call `PUT /api/notifications/read-all`.

- **Navigation**
  - Parse `navigationIdentifier`:
    - Example: `"job:676f1bde0f8a2e3c1a234999"`
    - Split on `:` → `type = 'job'`, `id = '676f1bde0f8a2e3c1a234999'`
    - Route user to the Job Detail screen with that `jobId`.


