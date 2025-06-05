# Bitespeed Backend Task - Identity Reconciliation

**Note: This service is deployed on Render's free tier. Due to inactivity, the service may undergo a cold start when making initial requests. Please be patient during the first request as it may take a few seconds to wake up.**

This project implements an identity reconciliation service that helps track and manage customer identity data across multiple interactions.

## API Endpoints

The service exposes the following endpoints:

### Health Check

- **URL**: `/health`
- **Method**: `GET`

#### Sample Request

```bash
curl --location 'https://bitespeed-backend-task-3g7g.onrender.com/health'
```

### Identify

- **URL**: `/api/v1/identity/identify`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body

```json
{
    "phoneNumber": string | null,
    "email": string | null
}
```

Both `phoneNumber` and `email` are optional, but at least one must be provided.

#### Sample Request

```bash
curl --location 'https://bitespeed-backend-task-3g7g.onrender.com/api/v1/identity/identify' \
--header 'Content-Type: application/json' \
--data-raw '{
    "phoneNumber": "123456",
    "email": "mcfly@hillvalley.edu"
}'
```

#### Response Format

The response will contain a consolidated view of all related contact information:

```json
{
    "contact": {
        "primaryContatctId": number,
        "emails": string[],
        "phoneNumbers": string[],
        "secondaryContactIds": number[]
    }
}
```

## Deployment

The service is currently deployed at: https://bitespeed-backend-task-3g7g.onrender.com 
