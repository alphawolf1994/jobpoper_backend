# JobPoper Backend API Documentation

## Authentication System

This API provides a complete authentication system using phone number verification with Twilio, PIN-based authentication, and JWT tokens.

### Base URL
```
http://localhost:3001
```

## API Endpoints

### 1. Send Phone Verification Code
**POST** `/api/auth/send-verification`

Send a 6-digit verification code to the provided phone number.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Verification code sent successfully",
  "data": {
    "phoneNumber": "+1234567890",
    "twilioSid": "dev-mode"
  }
}
```

### 2. Verify Phone Number
**POST** `/api/auth/verify-phone`

Verify the phone number using the 6-digit code.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "verificationCode": "123456"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Phone number verified successfully",
  "data": {
    "phoneNumber": "+1234567890",
    "isVerified": true
  }
}
```

### 3. Register User
**POST** `/api/auth/register`

Create a new user account with phone number and 4-digit PIN.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "pin": "1234"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "phoneNumber": "+1234567890",
      "isPhoneVerified": true,
      "isProfileComplete": false,
      "role": "user"
    }
  }
}
```

### 4. Login User
**POST** `/api/auth/login`

Login with phone number and PIN.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "pin": "1234"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "phoneNumber": "+1234567890",
      "isPhoneVerified": true,
      "isProfileComplete": false,
      "role": "user"
    }
  }
}
```

### 5. Complete Profile (Protected)
**PUT** `/api/auth/complete-profile`

Complete the user profile with additional information.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "location": "New York, NY",
  "dateOfBirth": "1990-01-01",
  "profileImage": "https://example.com/profile.jpg"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Profile completed successfully",
  "data": {
    "user": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "phoneNumber": "+1234567890",
        "profile": {
          "fullName": "John Doe",
          "email": "john.doe@example.com",
          "location": "New York, NY",
          "dateOfBirth": "1990-01-01T00:00:00.000Z",
          "profileImage": "https://example.com/profile.jpg",
          "isProfileComplete": true
        },
      "isProfileComplete": true,
      "role": "user"
    }
  }
}
```

### 6. Get Current User (Protected)
**GET** `/api/auth/me`

Get current user information.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "phoneNumber": "+1234567890",
      "isPhoneVerified": true,
        "profile": {
          "fullName": "John Doe",
          "email": "john.doe@example.com",
          "location": "New York, NY",
          "dateOfBirth": "1990-01-01T00:00:00.000Z",
          "profileImage": "https://example.com/profile.jpg",
          "isProfileComplete": true
        },
      "role": "user",
      "lastLogin": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Database Schemas

### User Schema
```javascript
{
  phoneNumber: String (required, unique),
  isPhoneVerified: Boolean (default: false),
  pin: String (required, 4 digits, encrypted),
  profile: {
    fullName: String (required),
    email: String (required),
    location: String,
    dateOfBirth: Date,
    profileImage: String,
    isProfileComplete: Boolean (default: false)
  },
  role: String (enum: ['user', 'admin'], default: 'user'),
  isActive: Boolean (default: true),
  lastLogin: Date
}
```

### PhoneVerification Schema
```javascript
{
  phoneNumber: String (required),
  verificationCode: String (required, 6 digits),
  isVerified: Boolean (default: false),
  attempts: Number (default: 0, max: 5),
  expiresAt: Date (10 minutes from creation),
  twilioSid: String
}
```

## Authentication Flow

1. **Send Verification Code**: User provides phone number
2. **Verify Phone**: User enters 6-digit code
3. **Register**: User creates account with phone and 4-digit PIN
4. **Login**: User authenticates with phone and PIN
5. **Complete Profile**: User adds additional profile information

## Security Features

- **PIN Encryption**: 4-digit PINs are hashed using bcrypt
- **JWT Tokens**: Secure authentication tokens with expiration
- **Phone Verification**: SMS-based phone number verification
- **Rate Limiting**: Maximum 5 verification attempts per phone number
- **Token Expiration**: Configurable JWT expiration (default: 7 days)

## Development Mode

When Twilio credentials are not configured, the API runs in development mode:
- Verification codes are logged to console instead of sending SMS
- No actual SMS messages are sent
- Useful for testing without Twilio setup

## Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jobpoper

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Twilio Configuration (Optional for development)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid credentials, missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error
