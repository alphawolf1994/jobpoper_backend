# Postman Collection Setup Guide

## 📋 Overview

This guide will help you set up and use the JobPoper API Postman collection to test all authentication endpoints.

## 🚀 Quick Setup

### 1. Import Collection and Environment

1. **Open Postman**
2. **Import Collection:**
   - Click "Import" button
   - Select `JobPoper_API.postman_collection.json`
   - Click "Import"

3. **Import Environment:**
   - Click "Import" button
   - Select `JobPoper_Environment.postman_environment.json`
   - Click "Import"

4. **Select Environment:**
   - In the top-right corner, select "JobPoper Development Environment"

### 2. Start Your Server

Make sure your JobPoper backend server is running:

```bash
cd /Users/hamidraza/Documents/jobpoper_backend
npm run dev
```

Server should be running on `http://localhost:3001`

## 🧪 Testing Scenarios

### Scenario 1: Complete Registration Flow

1. **Send Phone Verification**
   - Go to "Test Scenarios" → "Full Registration Flow" → "1. Send Verification Code"
   - Click "Send"
   - Check server logs for the actual verification code (in development mode)

2. **Verify Phone Number**
   - Go to "2. Verify Phone Number"
   - Update the `verificationCode` in the request body with the code from server logs
   - Click "Send"

3. **Register User**
   - Go to "3. Register User"
   - Click "Send"
   - **Important:** Copy the `token` from the response and set it as `auth_token` in environment variables

4. **Complete Profile**
   - Go to "4. Complete Profile"
   - Click "Send"

### Scenario 2: Login Flow

1. **Login User**
   - Go to "Test Scenarios" → "Login Flow" → "1. Login User"
   - Click "Send"
   - Copy the `token` from response

2. **Get User Info**
   - Go to "2. Get User Info"
   - Click "Send"

## 🔧 Environment Variables

The collection uses these environment variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `base_url` | API base URL | `http://localhost:3001` |
| `auth_token` | JWT token | Auto-set from login/register |
| `verification_code` | Phone verification code | `123456` |
| `phone_number` | Test phone number | `+1234567890` |
| `user_pin` | Test PIN | `1234` |

## 📱 Development Mode Notes

### Phone Verification
- In development mode, verification codes are logged to the server console
- Check your terminal where the server is running to see the actual code
- Example: `🔐 Development Mode - Verification code for +1234567890: 123456`

### Testing Without Twilio
- The API works in development mode without Twilio configuration
- Verification codes are generated but not sent via SMS
- Perfect for testing the complete flow

## 🧪 Individual Endpoint Testing

### Health Check Endpoints
- **Server Status**: `GET /` - Basic server status
- **Health Check**: `GET /api/health` - Detailed health information
- **Database Test**: `GET /api/health/db` - MongoDB connection test

### Authentication Endpoints
- **Send Verification**: `POST /api/auth/send-verification`
- **Verify Phone**: `POST /api/auth/verify-phone`
- **Register**: `POST /api/auth/register`
- **Login**: `POST /api/auth/login`
- **Get User**: `GET /api/auth/me` (Protected)
- **Complete Profile**: `PUT /api/auth/complete-profile` (Protected)

## 🚨 Error Testing

The collection includes error testing scenarios:

- **Invalid Phone Number**: Test with malformed phone numbers
- **Wrong Verification Code**: Test with incorrect codes
- **Invalid PIN Format**: Test with non-4-digit PINs
- **Unauthorized Access**: Test protected routes without tokens
- **Invalid Token**: Test with malformed JWT tokens

## 🔄 Automated Testing

### Using Collection Runner
1. Go to "Collections" tab
2. Click on "JobPoper Authentication API"
3. Click "Run" button
4. Select the scenarios you want to test
5. Click "Run JobPoper Authentication API"

### Using Newman (CLI)
```bash
# Install Newman
npm install -g newman

# Run collection
newman run JobPoper_API.postman_collection.json -e JobPoper_Environment.postman_environment.json
```

## 📊 Response Examples

### Successful Registration Response
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

### Error Response Example
```json
{
  "status": "error",
  "message": "Phone number already registered"
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **Server Not Running**
   - Make sure the server is running on port 3001
   - Check the console for any error messages

2. **Database Connection Issues**
   - Update your MongoDB connection string in `.env`
   - Test database connection using health endpoints

3. **Token Issues**
   - Make sure to copy the token from login/register responses
   - Set it as `auth_token` in environment variables

4. **Verification Code Issues**
   - In development mode, check server logs for the actual code
   - The code is logged when you send a verification request

## 📝 Notes

- All protected routes require the `Authorization: Bearer <token>` header
- The collection automatically handles token management
- Environment variables make it easy to test with different values
- Error scenarios help test edge cases and validation

## 🎯 Next Steps

1. Import the collection and environment
2. Start your server
3. Run the "Full Registration Flow" test scenario
4. Test individual endpoints
5. Try error scenarios to test validation

Happy testing! 🚀
