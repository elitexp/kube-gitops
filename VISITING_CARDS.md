# Visiting Cards Feature

This document describes the visiting cards upload feature added to the Globomantics Guestbook application.

## Overview

The visiting cards feature allows guests to upload their visiting card images, which are stored in S3-compatible storage (MinIO) while metadata is stored in MongoDB.

## Architecture

- **Frontend**: Angular component with file upload UI
- **Backend**: Express.js API with file upload endpoint
- **Storage**: MinIO (S3-compatible) for image storage
- **Database**: MongoDB for metadata storage

## Features

1. **Upload Visiting Cards**: Guests can upload image files (visiting cards) with optional name and message
2. **View Visiting Cards**: Display all uploaded visiting cards in a table with thumbnails
3. **Image Storage**: Images are stored in S3/MinIO bucket named `visiting-cards`
4. **Metadata Storage**: File metadata (name, message, file URL, upload date) stored in MongoDB

## Deployment

### Prerequisites

- Kubernetes cluster
- MongoDB deployed (already configured)
- MinIO/S3 storage (can use MinIO deployment provided)

### Step 1: Deploy MinIO Storage

```bash
cd yaml/storage
./install.sh
```

This will create:
- MinIO Deployment (1 replica)
- MinIO Service (ports 9000 for API, 9001 for console)
- MinIO Secret (access keys)

### Step 2: Update Backend Configuration

The backend deployment has been updated with S3/MinIO environment variables:
- `S3_ENDPOINT`: MinIO endpoint (default: `minio:9000`)
- `S3_BUCKET`: Bucket name (default: `visiting-cards`)
- `S3_ACCESS_KEY`: Access key (from secret)
- `S3_SECRET_KEY`: Secret key (from secret)
- `S3_REGION`: AWS region (default: `us-east-1`)
- `S3_USE_SSL`: Use SSL (default: `false`)

### Step 3: Deploy Updated Backend

```bash
cd yaml/backend
./install.sh
```

### Step 4: Deploy Updated Frontend

```bash
cd yaml/frontend
./install.sh
```

## Configuration

### S3/MinIO Configuration

Edit `yaml/backend/configmap.yaml` to configure:
- `s3-endpoint`: MinIO service endpoint
- `s3-bucket`: Bucket name for storing visiting cards
- `s3-region`: AWS region
- `s3-use-ssl`: Enable/disable SSL

Edit `yaml/backend/secret.yaml` to configure:
- `s3-access-key`: Base64 encoded access key
- `s3-secret-key`: Base64 encoded secret key

Default values:
- Access Key: `minioadmin` (base64: `bWluaW9hZG1pbg==`)
- Secret Key: `minioadmin` (base64: `bWluaW9hZG1pbg==`)

### Using AWS S3

To use AWS S3 instead of MinIO:

1. Update `yaml/backend/configmap.yaml`:
   ```yaml
   s3-endpoint: "s3.amazonaws.com"
   s3-use-ssl: "true"
   ```

2. Update `yaml/backend/secret.yaml` with your AWS credentials:
   ```yaml
   s3-access-key: <base64-encoded-aws-access-key>
   s3-secret-key: <base64-encoded-aws-secret-key>
   ```

## API Endpoints

### GET /visiting-cards
Retrieve all visiting cards with metadata.

**Response:**
```json
[
  {
    "name": "John Doe",
    "message": "Nice to meet you!",
    "fileName": "visiting-card-1234567890-abc123.jpg",
    "originalName": "my-card.jpg",
    "fileUrl": "http://minio:9000/visiting-cards/visiting-card-1234567890-abc123.jpg",
    "fileSize": 245678,
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### POST /visiting-cards
Upload a visiting card image.

**Request:** multipart/form-data
- `visitingCard`: Image file (required)
- `name`: Guest name (optional)
- `message`: Optional message (optional)

**Response:**
```json
{
  "name": "John Doe",
  "message": "Nice to meet you!",
  "fileName": "visiting-card-1234567890-abc123.jpg",
  "originalName": "my-card.jpg",
  "fileUrl": "http://minio:9000/visiting-cards/visiting-card-1234567890-abc123.jpg",
  "fileSize": 245678,
  "uploadedAt": "2024-01-15T10:30:00.000Z"
}
```

## Frontend Usage

1. Navigate to the guestbook page
2. Scroll to "Upload Your Visiting Card" section
3. Enter your name (optional)
4. Enter a message (optional)
5. Select an image file
6. Click "Upload Visiting Card"

The uploaded visiting cards will appear in the "Visiting Cards" table above the upload form.

## File Limits

- Maximum file size: 10MB
- Allowed file types: Image files only (image/*)

## Troubleshooting

### Images not displaying
- Check if MinIO service is accessible from the frontend
- Verify the file URL is correct
- Check MinIO bucket permissions

### Upload fails
- Verify MinIO is running: `kubectl get pods -l app=minio`
- Check backend logs: `kubectl logs <backend-pod-name>`
- Verify S3 credentials in secret

### Bucket not created
- The backend automatically creates the bucket on startup
- Check backend logs for bucket creation errors
- Manually create bucket using MinIO console (port 9001)

## MinIO Console Access

To access MinIO console:
1. Port-forward MinIO service: `kubectl port-forward svc/minio 9001:9001`
2. Open browser: `http://localhost:9001`
3. Login with credentials from secret (default: minioadmin/minioadmin)

