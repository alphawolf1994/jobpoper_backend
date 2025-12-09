## Phone Number Check API Documentation

### Overview

This endpoint lets the client check whether a phone number is already registered in JobPoper.  
It is useful for flows like:
- Showing different UI for "login" vs "register"
- Preventing duplicate registrations

### Endpoint

- **URL**: `/api/auth/check-phone`
- **Method**: `POST`
- **Auth**: Public (no token required)
- **Content-Type**: `application/json`

### Request Body

```json
{
  "phoneNumber": "+1234567890"
}
```

- **phoneNumber** (string, required): The phone number to check, in the same format used for login/register.

### Response

**200 OK**

```json
{
  "status": "success",
  "data": {
    "exists": true,
    "isActive": true
  }
}
```

- `exists`: `true` if a user with this phone number exists, otherwise `false`.
- `isActive`: `true` if the user exists and the account is active; `false` if no user or the account is deactivated.

**400 Bad Request – Missing Phone Number**

```json
{
  "status": "error",
  "message": "Phone number is required"
}
```

**500 Internal Server Error**

```json
{
  "status": "error",
  "message": "Failed to check phone number"
}
```

---

## Frontend Integration Example (React Native)

### 1. Check Phone Before Login/Register

```javascript
const API_BASE_URL = 'http://localhost:3001';

export const checkPhoneExists = async (phoneNumber) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/check-phone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phoneNumber })
  });

  const result = await response.json();

  if (result.status !== 'success') {
    throw new Error(result.message || 'Failed to check phone number');
  }

  return result.data; // { exists: boolean, isActive: boolean }
};
```

### 2. Example Usage in a Screen

```javascript
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { checkPhoneExists } from './api/auth'; // path to the function above

const PhoneCheckScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    try {
      setLoading(true);
      setStatus('');

      const { exists, isActive } = await checkPhoneExists(phoneNumber);

      if (!exists) {
        setStatus('No account found. Redirecting to registration...');
        // navigation.navigate('Register', { phoneNumber });
      } else if (!isActive) {
        setStatus('This account is deactivated. Please contact support.');
      } else {
        setStatus('Account found. Redirecting to PIN screen...');
        // navigation.navigate('EnterPin', { phoneNumber });
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        placeholder="+1234567890"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 12,
          borderRadius: 8,
          marginBottom: 12
        }}
      />
      <Button title={loading ? 'Checking...' : 'Continue'} onPress={handleContinue} disabled={loading} />
      {status ? <Text style={{ marginTop: 12 }}>{status}</Text> : null}
    </View>
  );
};

export default PhoneCheckScreen;
```


