## Resend Phone Verification API Documentation

### Overview

If a user does not receive the initial SMS verification code, this endpoint allows the app to request that the code be resent to the same phone number.

### Endpoint

- **URL**: `/api/auth/resend-verification`
- **Method**: `POST`
- **Auth**: Public (no token required)
- **Content-Type**: `application/json`

### Request Body

```json
{
  "phoneNumber": "+1234567890"
}
```

- **phoneNumber** (string, required): The phone number to resend the verification code to.

### Behavior

- Uses the same Twilio service as the initial `send-verification` endpoint.
- Fails if the phone number is already registered (same rule as the initial send).
- Logs and falls back to development/test mode when Twilio is not configured, just like `send-verification`.

### Responses

**200 OK**

```json
{
  "status": "success",
  "message": "Verification code resent successfully",
  "data": {
    "phoneNumber": "+1234567890",
    "twilioSid": "VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

**400 Bad Request – Missing Phone Number**

```json
{
  "status": "error",
  "message": "Phone number is required"
}
```

**400 Bad Request – Phone Already Registered**

```json
{
  "status": "error",
  "message": "Phone number already registered"
}
```

**500 Internal Server Error**

```json
{
  "status": "error",
  "message": "Failed to send verification code"
}
```

---

## Frontend Integration Example (React Native)

### Helper Function

```javascript
const API_BASE_URL = 'http://localhost:3001';

export const resendVerificationCode = async (phoneNumber) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phoneNumber })
  });

  const result = await response.json();

  if (result.status !== 'success') {
    throw new Error(result.message || 'Failed to resend verification code');
  }

  return result.data; // { phoneNumber, twilioSid }
};
```

### Example Usage in Verification Screen

```javascript
import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { resendVerificationCode } from './api/auth'; // path to helper above

const VerifyCodeScreen = ({ route }) => {
  const { phoneNumber } = route.params;
  const [status, setStatus] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (cooldown > 0) return;

    try {
      setStatus('');
      const { twilioSid } = await resendVerificationCode(phoneNumber);
      setStatus('Code resent. Please check your SMS.');

      // Simple 30s cooldown
      setCooldown(30);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>We sent a code to {phoneNumber}</Text>
      <Button
        title={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
        onPress={handleResend}
        disabled={cooldown > 0}
      />
      {status ? <Text style={{ marginTop: 12 }}>{status}</Text> : null}
    </View>
  );
};

export default VerifyCodeScreen;
```


