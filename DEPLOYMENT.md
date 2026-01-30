# Deployment Guide

This guide covers deploying both the frontend and backend to Vercel.

## Architecture

- **Backend API**: Separate Vercel project for the API (Next.js 14)
- **Frontend**: Separate Vercel project for the web app (Next.js 16)

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed: `npm i -g vercel`
3. Supabase project with data imported

## Step 1: Deploy Backend API

### 1.1 Navigate to backend directory

```bash
cd backend
```

### 1.2 Deploy to Vercel

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- Project name: `myedbc-api` (or your preferred name)
- Directory: `./`
- Override settings? **N**

### 1.3 Add Environment Variables

After deployment, add your Supabase credentials:

```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
```

Or via Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add:
   - `SUPABASE_URL` (from Supabase dashboard)
   - `SUPABASE_ANON_KEY` (from Supabase dashboard)

### 1.4 Redeploy with environment variables

```bash
vercel --prod
```

### 1.5 Note your API URL

Your backend will be deployed at: `https://myedbc-api.vercel.app` (or similar)

**Save this URL - you'll need it for the frontend!**

## Step 2: Deploy Frontend

### 2.1 Navigate to frontend directory

```bash
cd ../frontend
```

### 2.2 Add the API URL environment variable

```bash
vercel env add NEXT_PUBLIC_API_URL
```

When prompted, enter your backend API URL (from Step 1.5):
```
https://myedbc-api.vercel.app
```

Make sure to add it for **Production**, **Preview**, and **Development** environments.

### 2.3 Deploy to Vercel

```bash
vercel --prod
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **Y** (if you already have the frontend deployed)
  - Or **N** for new project: `myedbc-course-explorer`
- Directory: `./`
- Override settings? **N**

## Step 3: Verify Deployment

### 3.1 Test Backend API

Visit: `https://your-api-url.vercel.app/api/health`

You should see:
```json
{
  "status": "healthy",
  "database": "connected",
  "courseCount": 12741,
  "timestamp": "2024-..."
}
```

### 3.2 Test Frontend

Visit your frontend URL: `https://myedbc-course-explorer.vercel.app`

Check the API status indicator in the bottom-right corner:
- ✅ Green = Connected
- ❌ Red = Connection failed

### 3.3 Test Search

Navigate to `/search` and try searching for courses.

## Alternative: Deploy from Vercel Dashboard

### Backend
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Set root directory to `backend`
4. Add environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)
5. Deploy

### Frontend
1. Go to https://vercel.com/new
2. Import your GitHub repository again
3. Set root directory to `frontend`
4. Add environment variable: `NEXT_PUBLIC_API_URL` = your backend URL
5. Deploy

## Environment Variables Summary

### Backend (API)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

### Frontend (Web)
```
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

## Troubleshooting

### API Connection Failed
- Verify `NEXT_PUBLIC_API_URL` is set correctly in frontend
- Check backend health endpoint works
- Ensure CORS is enabled in backend (already configured)

### Database Connection Failed
- Verify Supabase environment variables in backend
- Check Supabase project is active
- Ensure data has been imported

### Build Errors
- Check all dependencies are installed
- Verify Node.js version compatibility
- Review build logs in Vercel dashboard

## Monitoring

- **Vercel Dashboard**: Monitor deployments, logs, and analytics
- **API Health**: Check `/api/health` endpoint regularly
- **Supabase Dashboard**: Monitor database usage and queries

## Custom Domains (Optional)

### Backend API
```bash
vercel domains add api.yourdomain.com --project=myedbc-api
```

### Frontend
```bash
vercel domains add yourdomain.com --project=myedbc-course-explorer
```

Update `NEXT_PUBLIC_API_URL` in frontend to use custom API domain.
