# JobPoper Locations API Documentation

## Overview
The Locations API provides comprehensive location management functionality including creating, retrieving, and deleting user-specific locations. Each user can save multiple locations (like Home, Office, etc.) with unique names.

## Base URL
```
http://localhost:3001/api/locations
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Database Schema

### Location Schema
```javascript
{
  user: ObjectId (required, reference to User),
  name: String (required, max 100 chars, unique per user),
  fullAddress: String (required),
  latitude: Number (required, -90 to 90),
  longitude: Number (required, -180 to 180),
  addressDetails: String (optional, max 500 chars),
  createdAt: Number (timestamp, default: Date.now()),
  timestamps: true (createdAt, updatedAt)
}
```

**Unique Constraint**: Each user can only have ONE location with the same name. For example, a user cannot save two "Home" locations.

---

## Endpoints

### 1. Save a New Location
**POST** `/api/locations`

Create a new location for the authenticated user.

**Request Body:**
```json
{
  "name": "Home",
  "fullAddress": "123 Main St, New York, NY 10001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "addressDetails": "Floor 5, Apartment 12",
  "createdAt": 1704115200000
}
```

**Required Fields:**
- `name`: Location name (e.g., "Home", "Office", "Gym")
- `fullAddress`: Complete address string
- `latitude`: Latitude coordinate (-90 to 90)
- `longitude`: Longitude coordinate (-180 to 180)

**Optional Fields:**
- `addressDetails`: Additional address details (floor, apartment, etc.)
- `createdAt`: Timestamp (defaults to current time if not provided)

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Home",
    "fullAddress": "456 Park Avenue, New York, NY 10022",
    "latitude": 40.7589,
    "longitude": -73.9851,
    "addressDetails": "Building A, Unit 301"
  }'
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Location saved successfully",
  "data": {
    "location": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "name": "Home",
      "fullAddress": "456 Park Avenue, New York, NY 10022",
      "latitude": 40.7589,
      "longitude": -73.9851,
      "addressDetails": "Building A, Unit 301",
      "createdAt": 1704115200000
    }
  }
}
```

**Error Responses:**

**400 Bad Request - Missing Required Fields:**
```json
{
  "status": "error",
  "message": "Name, full address, latitude, and longitude are required"
}
```

**400 Bad Request - Invalid Coordinates:**
```json
{
  "status": "error",
  "message": "Latitude must be between -90 and 90"
}
```

**400 Bad Request - Duplicate Location Name:**
```json
{
  "status": "error",
  "message": "Location with name \"Home\" already exists. Please choose a different name."
}
```

---

### 2. Get All Locations
**GET** `/api/locations`

Retrieve all locations for the authenticated user.

**Example Request:**
```bash
curl http://localhost:3001/api/locations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Locations retrieved successfully",
  "data": {
    "locations": [
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d1",
        "name": "Home",
        "fullAddress": "456 Park Avenue, New York, NY 10022",
        "latitude": 40.7589,
        "longitude": -73.9851,
        "addressDetails": "Building A, Unit 301",
        "createdAt": 1704115200000
      },
      {
        "id": "64f8a1b2c3d4e5f6a7b8c9d2",
        "name": "Office",
        "fullAddress": "789 Broadway, New York, NY 10003",
        "latitude": 40.7282,
        "longitude": -73.9942,
        "addressDetails": "Floor 15, Suite 1502",
        "createdAt": 1704115300000
      }
    ]
  }
}
```

**Empty Response (200 OK):**
```json
{
  "status": "success",
  "message": "Locations retrieved successfully",
  "data": {
    "locations": []
  }
}
```

**Note:** Locations are sorted by creation date in descending order (newest first).

---

### 3. Delete a Location
**DELETE** `/api/locations/:id`

Delete a specific location by ID. Only the owner can delete their location.

**Example Request:**
```bash
curl -X DELETE http://localhost:3001/api/locations/64f8a1b2c3d4e5f6a7b8c9d1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Location deleted successfully",
  "data": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d1"
  }
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Location not found"
}
```

**403 Forbidden:**
```json
{
  "status": "error",
  "message": "Not authorized to delete this location"
}
```

---

## Frontend Integration Example

Based on the provided React Native code, here's how to integrate these APIs:

### Save Location
```javascript
const saveLocation = async (locationData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch('http://localhost:3001/api/locations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: locationData.name || 'Saved place',
        fullAddress: locationData.fullAddress,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        addressDetails: locationData.addressDetails || '',
        createdAt: locationData.createdAt || Date.now()
      })
    });

    const result = await response.json();
    if (result.status === 'success') {
      return result.data.location;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error saving location:', error);
    throw error;
  }
};
```

### Get All Locations
```javascript
const getMyLocations = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch('http://localhost:3001/api/locations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    if (result.status === 'success') {
      return result.data.locations;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
};
```

### Delete Location
```javascript
const deleteLocation = async (locationId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`http://localhost:3001/api/locations/${locationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    if (result.status === 'success') {
      return true;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
};
```

---

## Security Features

- **JWT Authentication**: All endpoints require valid JWT token
- **User Isolation**: Users can only access their own locations
- **Ownership Verification**: Users can only delete their own locations
- **Unique Constraint**: Prevents duplicate location names per user
- **Input Validation**: Coordinates are validated to be within valid ranges
- **SQL Injection Protection**: Using Mongoose ODM with parameterized queries

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error, duplicate name, etc.) |
| 401 | Unauthorized (missing or invalid JWT token) |
| 403 | Forbidden (not authorized to access/modify resource) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Testing with cURL

### 1. Save a location (Replace YOUR_JWT_TOKEN)
```bash
curl -X POST http://localhost:3001/api/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Home",
    "fullAddress": "123 Main Street, City, State 12345",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "addressDetails": "Apartment 4B"
  }'
```

### 2. Get all locations
```bash
curl http://localhost:3001/api/locations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Delete a location
```bash
curl -X DELETE http://localhost:3001/api/locations/LOCATION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Notes

- **Unique Name Constraint**: The database enforces that each user can only have one location with the same name. Attempting to save a second "Home" location will return an error.
- **Coordinate Validation**: Latitude must be between -90 and 90, and longitude must be between -180 and 180.
- **Sorting**: Locations are automatically sorted by creation date in descending order (newest first).
- **Timestamps**: Both MongoDB timestamps (`createdAt`, `updatedAt`) and custom `createdAt` number field are available.
- **User Reference**: Each location is linked to a user via the `user` field, which references the User collection.

---

## Environment Variables

No additional environment variables are required beyond the standard JobPoper backend configuration:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT secret for token verification
- `JWT_EXPIRE`: JWT token expiration time
- `PORT`: Server port (default: 3001)

