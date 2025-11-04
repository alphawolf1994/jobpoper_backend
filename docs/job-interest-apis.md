# Job Interest APIs

These APIs allow a user to show interest in a job and to fetch the list of jobs they have shown interest in.

- Base URL: `{{base_url}}`
- All endpoints require authentication unless otherwise noted. Include `Authorization: Bearer {{auth_token}}`.

## POST /api/jobs/:id/interest
Record interest in a job.

- Auth: Required
- Conditions:
  - Job must be `isActive = true`
  - Job `status` must be `open`
  - Job `responsePreference` must be `show_interest`
  - Duplicate interests are ignored (idempotent)

Request
```
POST /api/jobs/{{job_id}}/interest
Authorization: Bearer {{auth_token}}
```

Success Response (201)
```json
{
  "status": "success",
  "message": "Interest recorded successfully"
}
```

Already Interested (200)
```json
{
  "status": "success",
  "message": "Interest already recorded"
}
```

Error Responses
- 404 when job not found or not open/active
- 400 when job does not accept interest (responsePreference != show_interest)

## GET /api/jobs/my-interests
Return jobs current user showed interest in.

- Auth: Required
- Filters applied by server:
  - `isActive = true`
  - `status = open`
  - `scheduledDate` exists

Query Parameters
- `page` (number, default 1)
- `limit` (number, default 10)
- `sortBy` (string, default `scheduledDate`)
- `sortOrder` (string, `asc` | `desc`, default `asc`)

Request
```
GET /api/jobs/my-interests?page=1&limit=10&sortBy=scheduledDate&sortOrder=asc
Authorization: Bearer {{auth_token}}
```

Success Response (200)
```json
{
  "status": "success",
  "data": {
    "jobs": [
      {
        "_id": "<jobId>",
        "title": "...",
        "responsePreference": "show_interest",
        "status": "open",
        "isActive": true,
        "scheduledDate": "2025-01-10T00:00:00.000Z",
        "postedBy": {
          "phoneNumber": "+123...",
          "profile": { "fullName": "Poster Name", "email": "poster@example.com" }
        },
        "interestedUsers": [
          { "user": "<userId>", "notedAt": "2025-01-05T12:34:56.000Z" }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalJobs": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

## GET /api/jobs/:id
Public endpoint. Now includes interested users in the response when present.

```
GET /api/jobs/{{job_id}}
```

Key fields added to payload:
- `interestedUsers`: array of `{ user, notedAt }`
  - `user` is populated with `profile.fullName`, `profile.email`, and `phoneNumber`.

## Notes
- Data model: `Job.interestedUsers[]` holds `{ user: ObjectId, notedAt: Date }`.
- Index added on `interestedUsers.user` for efficient lookups.

