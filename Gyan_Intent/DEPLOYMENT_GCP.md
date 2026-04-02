# GCP Deployment Guide - Gyan_Intent

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Google Cloud Platform                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (Cloud Run)          Backend (Cloud Run)           │
│  ├─ Next.js App                ├─ FastAPI                    │
│  ├─ Port: 3000                 ├─ Port: 8000                 │
│  └─ Auto-scaling               └─ Auto-scaling               │
│                                                               │
│  WhatsApp Bot (Compute Engine) Redis (Memorystore)           │
│  ├─ Node.js + Puppeteer        ├─ Managed Redis              │
│  ├─ Persistent Disk            ├─ Port: 6379                 │
│  └─ Always-on VM               └─ Private VPC                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **GCP Account** with billing enabled
2. **gcloud CLI** installed: `brew install google-cloud-sdk`
3. **Docker** installed
4. **GCP Project** created

## Step 1: Initial Setup

```bash
# Login to GCP
gcloud auth login

# Set your project ID
export PROJECT_ID="gyan-intent-prod"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  compute.googleapis.com \
  redis.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

## Step 2: Deploy Backend (Cloud Run)

### 2.1 Build and Push Docker Image

```bash
cd backend

# Configure Docker for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Create Artifact Registry repository (one-time)
gcloud artifacts repositories create gyan-backend \
  --repository-format=docker \
  --location=us-central1

# Build and push
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/$PROJECT_ID/gyan-backend/api:latest
```

### 2.2 Deploy to Cloud Run

```bash
gcloud run deploy gyan-backend \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/gyan-backend/api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --set-env-vars "OPENAI_API_KEY=your-key,SARVAM_API_KEY=your-key"
```

**Note the backend URL** (e.g., `https://gyan-backend-xxx.run.app`)

## Step 3: Deploy Frontend (Cloud Run)

### 3.1 Update API URL

```bash
cd ../frontend

# Create .env.production
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://gyan-backend-xxx.run.app/api/v1
EOF
```

### 3.2 Build and Deploy

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create gyan-frontend \
  --repository-format=docker \
  --location=us-central1

# Build and push
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/$PROJECT_ID/gyan-frontend/web:latest

# Deploy
gcloud run deploy gyan-frontend \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/gyan-frontend/web:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1
```

**Note the frontend URL** (e.g., `https://gyan-frontend-xxx.run.app`)

## Step 4: Set Up Redis (Memorystore)

```bash
# Create Redis instance
gcloud redis instances create gyan-redis \
  --size=1 \
  --region=us-central1 \
  --tier=basic \
  --redis-version=redis_7_0

# Get Redis host
gcloud redis instances describe gyan-redis \
  --region=us-central1 \
  --format="value(host)"
```

**Note the Redis host** (e.g., `10.0.0.3`)

## Step 5: Deploy WhatsApp Bot (Compute Engine)

### 5.1 Create VM Instance

```bash
cd ../whatsapp-bot

# Create VM with persistent disk
gcloud compute instances create whatsapp-bot \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --boot-disk-size=20GB \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --tags=whatsapp-bot \
  --metadata-from-file startup-script=startup.sh
```

### 5.2 Create Startup Script

```bash
cat > startup.sh << 'EOF'
#!/bin/bash

# Install Docker (Container-Optimized OS has it pre-installed)
docker pull us-central1-docker.pkg.dev/PROJECT_ID/gyan-whatsapp/bot:latest

# Run WhatsApp bot container with persistent volume
docker run -d \
  --name whatsapp-bot \
  --restart always \
  -p 3003:3003 \
  -v /mnt/disks/whatsapp-data:/app/.wwebjs_auth \
  -e REDIS_URL=redis://REDIS_HOST:6379 \
  -e BACKEND_URL=https://gyan-backend-xxx.run.app \
  us-central1-docker.pkg.dev/PROJECT_ID/gyan-whatsapp/bot:latest
EOF
```

### 5.3 Build and Push WhatsApp Bot Image

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create gyan-whatsapp \
  --repository-format=docker \
  --location=us-central1

# Build and push
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/$PROJECT_ID/gyan-whatsapp/bot:latest
```

### 5.4 SSH and Start Bot

```bash
# SSH into VM
gcloud compute ssh whatsapp-bot --zone=us-central1-a

# Pull and run container
docker pull us-central1-docker.pkg.dev/$PROJECT_ID/gyan-whatsapp/bot:latest

docker run -d \
  --name whatsapp-bot \
  --restart always \
  -p 3003:3003 \
  -v /home/whatsapp-data:/app/.wwebjs_auth \
  -e REDIS_URL=redis://REDIS_HOST:6379 \
  -e BACKEND_URL=https://gyan-backend-xxx.run.app \
  us-central1-docker.pkg.dev/$PROJECT_ID/gyan-whatsapp/bot:latest

# Get QR code
docker logs whatsapp-bot

# Or access via browser
curl http://localhost:3003/qr
```

## Step 6: Configure Firewall Rules

```bash
# Allow WhatsApp bot health check port
gcloud compute firewall-rules create allow-whatsapp-bot \
  --allow tcp:3003 \
  --target-tags whatsapp-bot \
  --source-ranges 0.0.0.0/0
```

## Step 7: Update CORS in Backend

Update `backend/app/main.py`:

```python
origins = [
    "https://gyan-frontend-xxx.run.app",  # Your frontend URL
    "http://localhost:3000",
]
```

Redeploy backend:

```bash
cd backend
gcloud builds submit --tag us-central1-docker.pkg.dev/$PROJECT_ID/gyan-backend/api:latest
gcloud run deploy gyan-backend --image us-central1-docker.pkg.dev/$PROJECT_ID/gyan-backend/api:latest
```

## Environment Variables Summary

### Backend (Cloud Run)
```
OPENAI_API_KEY=sk-...
SARVAM_API_KEY=...
REDIS_URL=redis://REDIS_HOST:6379
```

### Frontend (Cloud Run)
```
NEXT_PUBLIC_API_URL=https://gyan-backend-xxx.run.app/api/v1
```

### WhatsApp Bot (Compute Engine)
```
REDIS_URL=redis://REDIS_HOST:6379
BACKEND_URL=https://gyan-backend-xxx.run.app
INTERNAL_API_KEY=your-secret-key
```

## Monitoring & Logs

```bash
# Backend logs
gcloud run logs read gyan-backend --region us-central1

# Frontend logs
gcloud run logs read gyan-frontend --region us-central1

# WhatsApp bot logs
gcloud compute ssh whatsapp-bot --zone=us-central1-a
docker logs -f whatsapp-bot
```

## Cost Estimate (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Cloud Run (Backend) | 2 vCPU, 2GB RAM | ~$20-40 |
| Cloud Run (Frontend) | 1 vCPU, 1GB RAM | ~$10-20 |
| Compute Engine (Bot) | e2-medium | ~$25 |
| Memorystore Redis | 1GB Basic | ~$30 |
| **Total** | | **~$85-115/month** |

## Quick Deploy Script

Save this as `deploy.sh`:

```bash
#!/bin/bash
set -e

PROJECT_ID="gyan-intent-prod"
REGION="us-central1"

echo "🚀 Deploying Gyan_Intent to GCP..."

# Backend
echo "📦 Building backend..."
cd backend
gcloud builds submit --tag us-central1-docker.pkg.dev/$PROJECT_ID/gyan-backend/api:latest
gcloud run deploy gyan-backend --image us-central1-docker.pkg.dev/$PROJECT_ID/gyan-backend/api:latest --region $REGION

# Frontend
echo "📦 Building frontend..."
cd ../frontend
gcloud builds submit --tag us-central1-docker.pkg.dev/$PROJECT_ID/gyan-frontend/web:latest
gcloud run deploy gyan-frontend --image us-central1-docker.pkg.dev/$PROJECT_ID/gyan-frontend/web:latest --region $REGION

# WhatsApp Bot
echo "📦 Building WhatsApp bot..."
cd ../whatsapp-bot
gcloud builds submit --tag us-central1-docker.pkg.dev/$PROJECT_ID/gyan-whatsapp/bot:latest

echo "✅ Deployment complete!"
echo "Frontend: https://gyan-frontend-xxx.run.app"
echo "Backend: https://gyan-backend-xxx.run.app"
```

## Troubleshooting

### WhatsApp Bot Session Lost
```bash
# SSH into VM and check volume
gcloud compute ssh whatsapp-bot --zone=us-central1-a
ls -la /home/whatsapp-data/
```

### Backend Timeout
Increase timeout in Cloud Run:
```bash
gcloud run services update gyan-backend --timeout 600
```

### Redis Connection Failed
Check if Redis is in same VPC and update REDIS_URL with correct internal IP.
