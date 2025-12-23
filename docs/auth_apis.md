# Authentication APIs

Base URL: `/api/auth`

## Forgot Password Flow

### 1. Send OTP (Forgot Password)

Checks if the phone number exists in the system and sends a verification code via Twilio.

- **URL**: `/forgot-password/send-otp`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
  ```json
  {
    "phoneNumber": "+1234567890"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "status": "success",
    "message": "Verification code sent successfully",
    "data": {
      "phoneNumber": "+1234567890",
      "twilioSid": "SM..."
    }
  }
  ```
- **Error Responses**:
  - `400`: Phone number is required.
  - `404`: Phone number not found (User does not exist).
  - `500`: Failed to send SMS.

### 2. Verify OTP (Forgot Password)

Verifies the OTP sent to the user. If successful, returns a temporary **reset token**.

- **URL**: `/forgot-password/verify-otp`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:
  ```json
  {
    "phoneNumber": "+1234567890",
    "verificationCode": "123456"
  }
  ```
- **Success Response (200)**:

  ```json
  {
    "status": "success",
    "message": "OTP verified successfully",
    "data": {
      "resetToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
  ```

  > **Note**: The `resetToken` expires in 10 minutes. It must be included in the Authorization header for the `reset-pin` endpoint.

- **Error Responses**:
  - `400`: Invalid code or missing parameters.
  - `404`: User not found.

### 3. Reset PIN

Resets the user's PIN using the token obtained from the OTP verification step.

- **URL**: `/forgot-password/reset-pin`
- **Method**: `POST`
- **Auth Required**: **Yes** (Requires `resetToken` from verify step)
- **Headers**:
  ```
  Authorization: Bearer <resetToken>
  ```
- **Body**:
  ```json
  {
    "newPin": "1234"
  }
  ```
- **Success Response (200)**:
  ```json
  {
    "status": "success",
    "message": "PIN reset successfully. Please login with your new PIN."
  }
  ```
- **Error Responses**:
  - `400`: New PIN validation failed (must be 4 digits).
  - `401`: Invalid, expired, or incorrect token type.
  - `404`: User not found.

---

## Existing Authentication APIs

### Register

- **URL**: `/register`
- **Method**: `POST`
- **Body**: `{ "phoneNumber": "...", "pin": "..." }`

### Login

- **URL**: `/login`
- **Method**: `POST`
- **Body**: `{ "phoneNumber": "...", "pin": "..." }`

### Verify Phone

- **URL**: `/verify-phone`
- **Method**: `POST`
- **Body**: `{ "phoneNumber": "...", "verificationCode": "..." }`

### Check Phone Exists

- **URL**: `/check-phone`
- **Method**: `POST`
- **Body**: `{ "phoneNumber": "..." }`

### Get Current User

- **URL**: `/me`
- **Method**: `GET`
- **Auth Required**: Yes (Login Token)

### Complete Profile

- **URL**: `/complete-profile`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Body**: `{ "fullName": "...", "email": "...", "location": "...", "dateOfBirth": "..." }`

### Change PIN (Authenticated)

- **URL**: `/change-pin`
- **Method**: `PUT`
- **Auth Required**: Yes (Login Token)
- **Body**: `{ "newPin": "..." }`
