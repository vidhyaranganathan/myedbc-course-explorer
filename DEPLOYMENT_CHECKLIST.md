# Deployment Checklist

Use this checklist to deploy BC Course Finder to Vercel.

## Pre-Deployment

- [ ] Backend is working locally (`cd backend && npm run dev`)
- [ ] Frontend is working locally (`cd frontend && npm run dev`)
- [ ] API connection works (green indicator on homepage)
- [ ] Search page works at http://localhost:3000/search
- [ ] Supabase has data imported (12,741 courses)
- [ ] All changes committed to git
- [ ] Git pushed to GitHub/remote

## Backend Deployment

- [ ] Navigate to backend directory: `cd backend`
- [ ] Deploy: `vercel --prod`
- [ ] Copy the deployment URL (e.g., https://myedbc-api.vercel.app)
- [ ] Go to Vercel Dashboard → Project Settings → Environment Variables
- [ ] Add environment variables:
  - [ ] `SUPABASE_URL` = Your Supabase project URL
  - [ ] `SUPABASE_ANON_KEY` = Your Supabase anonymous key
- [ ] Redeploy after adding env vars: `vercel --prod`
- [ ] Test health endpoint: `https://your-api.vercel.app/api/health`
- [ ] Verify response shows courseCount: 12741

## Frontend Deployment

- [ ] Navigate to frontend directory: `cd frontend`
- [ ] Add API URL environment variable:
  ```bash
  vercel env add NEXT_PUBLIC_API_URL
  # Enter your backend URL when prompted
  ```
- [ ] Select all environments (Production, Preview, Development)
- [ ] Deploy: `vercel --prod`
- [ ] Visit your frontend URL
- [ ] Check API status indicator (should be green)
- [ ] Test search functionality at `/search`

## Verification

- [ ] Backend health check returns 200 OK
- [ ] Backend returns correct course count
- [ ] Frontend loads without errors
- [ ] API status shows green with course count
- [ ] Search page loads
- [ ] Can search for courses
- [ ] Filters work (grade, category)
- [ ] Course results display correctly

## Optional: Custom Domains

- [ ] Add custom domain for backend: `vercel domains add api.yourdomain.com`
- [ ] Add custom domain for frontend: `vercel domains add yourdomain.com`
- [ ] Update `NEXT_PUBLIC_API_URL` to use custom API domain
- [ ] Redeploy frontend: `vercel --prod`

## Troubleshooting

### Backend Issues
- **Build fails**: Check Node.js version, run `npm install` locally first
- **Database error**: Verify Supabase env vars are correct
- **No courses returned**: Check data was imported to Supabase

### Frontend Issues
- **Can't connect to API**: Verify `NEXT_PUBLIC_API_URL` is set correctly
- **CORS errors**: Backend has CORS enabled, check network tab for actual error
- **Red status indicator**: Backend might not be deployed or env vars missing

### Environment Variables Not Working
- Make sure to redeploy after adding env vars
- Check env var names exactly match (case-sensitive)
- For frontend, must use `NEXT_PUBLIC_` prefix

## Post-Deployment

- [ ] Update README.md with live URLs
- [ ] Test on different browsers
- [ ] Test on mobile devices
- [ ] Monitor Vercel logs for errors
- [ ] Set up monitoring/alerts (optional)

## Quick Commands Reference

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Remove deployment
vercel remove [deployment-url]

# List environment variables
vercel env ls

# Pull environment variables locally
vercel env pull
```

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Project Issues**: Check DEPLOYMENT.md for detailed troubleshooting
