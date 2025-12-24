# Delete Account API Documentation

This documentation provides details for implementing the "Delete Account" feature on the frontend.

## Endpoint Details

- **URL**: `/api/auth/delete-account`
- **Method**: `DELETE`
- **Auth Required**: Yes (Bearer Token)
- **Description**: Permanently deletes the user's account and all associated data (Jobs, Locations, Notifications, etc.).

## Request Headers

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

## Request Body

This request does **not** require a body.

## Success Response

- **Code**: `200 OK`
- **Content**:

```json
{
  "status": "success",
  "message": "Account and all related data deleted successfully"
}
```

## Error Responses

- **Code**: `401 Unauthorized`

  - **Reason**: Missing or invalid token.
  - **Content**:

  ```json
  {
    "status": "error",
    "message": "Not authorized to access this route"
  }
  ```

- **Code**: `404 Not Found`

  - **Reason**: User not found.

  ```json
  {
    "status": "error",
    "message": "User not found"
  }
  ```

- **Code**: `500 Server Error`
  - **Reason**: Internal database error or failure to delete related data.
  ```json
  {
    "status": "error",
    "message": "Failed to delete account",
    "error": "Detailed error message"
  }
  ```

## Implementation Notes

- **Caution**: This action is **irreversible**. Always show a confirmation dialog (e.g., "Are you sure you want to delete your account? This action cannot be undone.") before calling this API.
- **Post-Deletion**: Upon a successful response, the frontend should:
  1. Clear the local storage (tokens, user profile data).
  2. Reset the Redux/State management store.
  3. Navigate the user back to the Landing or Login screen.
