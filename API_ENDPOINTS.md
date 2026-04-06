# Reviews API Endpoints

## Base URL
```
http://localhost:5000/api/v1
```

## Endpoints

### 1. Get Latest Reviews (Public)
**GET** `/reviews/latest`

Get the latest reviews for public display on the reviews page.

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "user": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "John Doe"
      },
      "event": {
        "_id": "507f1f77bcf86cd799439013",
        "title": "Summer Music Festival"
      },
      "rating": 5,
      "reviewText": "Amazing event! Highly recommended!",
      "createdAt": "2024-04-02T10:30:00Z",
      "updatedAt": "2024-04-02T10:30:00Z"
    }
  ]
}
```

---

### 2. Create Review (Authenticated)
**POST** `/reviews`

Create a new review for an event. User must have booked and completed the event.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventId": "507f1f77bcf86cd799439013",
  "rating": 5,
  "reviewText": "Amazing event! Highly recommended!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review created successfully",
  "review": {
    "_id": "507f1f77bcf86cd799439014",
    "user": "507f1f77bcf86cd799439012",
    "event": "507f1f77bcf86cd799439013",
    "rating": 5,
    "reviewText": "Amazing event! Highly recommended!",
    "createdAt": "2024-04-02T10:30:00Z"
  }
}
```

**Validation:**
- Rating must be between 1 and 5
- Event must exist
- User must have a completed booking for the event
- Event date must be in the past
- User can only have one review per event (updates existing if present)

---

### 3. Get Event Reviews
**GET** `/reviews/event/:eventId`

Get all reviews for a specific event.

**Query Parameters:**
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 10) - Number of reviews per page

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "user": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "John Doe"
      },
      "event": "507f1f77bcf86cd799439013",
      "rating": 5,
      "reviewText": "Amazing event!",
      "createdAt": "2024-04-02T10:30:00Z"
    }
  ],
  "totalReviews": 15,
  "currentPage": 1,
  "totalPages": 2
}
```

---

### 4. Get User's Reviews (Authenticated)
**GET** `/reviews/my-reviews`

Get all reviews submitted by the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "user": "507f1f77bcf86cd799439012",
      "event": {
        "_id": "507f1f77bcf86cd799439013",
        "title": "Summer Music Festival",
        "category": "Music"
      },
      "rating": 5,
      "reviewText": "Amazing event!",
      "createdAt": "2024-04-02T10:30:00Z"
    }
  ]
}
```

---

### 5. Delete Review (Authenticated)
**DELETE** `/reviews/:reviewId`

Delete a review. Only the review author can delete their own review.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

**Errors:**
- 404: Review not found or user doesn't have permission to delete

---

### 6. Seed Sample Reviews (Development Only)
**POST** `/reviews/seed/sample`

Create sample reviews for development/testing. Requires existing users and events.

**Response:**
```json
{
  "success": true,
  "message": "Created 15 sample reviews",
  "count": 15
}
```

**Errors:**
- 400: Not enough users or events in database

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Rating must be between 1 and 5 stars"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You can only review events you have booked"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Event not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create review"
}
```

---

## Example Usage

### Get Latest Reviews
```bash
curl http://localhost:5000/api/v1/reviews/latest
```

### Create a Review
```bash
curl -X POST http://localhost:5000/api/v1/reviews \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "507f1f77bcf86cd799439013",
    "rating": 5,
    "reviewText": "Amazing event!"
  }'
```

### Get Event Reviews
```bash
curl http://localhost:5000/api/v1/reviews/event/507f1f77bcf86cd799439013?page=1&limit=10
```

### Get My Reviews
```bash
curl http://localhost:5000/api/v1/reviews/my-reviews \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Delete a Review
```bash
curl -X DELETE http://localhost:5000/api/v1/reviews/507f1f77bcf86cd799439014 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Seed Sample Reviews
```bash
curl -X POST http://localhost:5000/api/v1/reviews/seed/sample
```

---

## Database Schema

### Review Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  event: ObjectId (ref: Event),
  rating: Number (1-5),
  reviewText: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- Unique index on (user, event) - prevents duplicate reviews

---

## Authentication

All endpoints marked as "Authenticated" require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Get a token by logging in:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "User@123"
  }'
```

---

## Rate Limiting

No rate limiting is currently implemented. Consider adding rate limiting for production.

---

## CORS

The API accepts requests from:
- http://localhost:5173
- http://localhost:5174
- http://127.0.0.1:5173
- http://127.0.0.1:5174
- http://192.168.1.16:5173

---

## Notes

- Reviews are only visible on the public `/reviews` page
- Reviews are NOT shown in user/merchant/admin dashboards
- Each user can only submit one review per event
- Reviews can only be submitted after an event is completed
- The event date must be in the past to submit a review
