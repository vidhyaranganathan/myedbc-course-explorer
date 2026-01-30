# BC Course Finder

An AI-powered search tool that helps BC high school students discover and plan their courses using official BC Ministry of Education data.

## Project Structure

```
myedbc-course-explorer/
├── frontend/          # Next.js 16 frontend (React, Tailwind CSS)
│   ├── src/app/       # App router pages
│   ├── src/lib/       # API client
│   └── package.json   # Runs on port 3000
├── backend/           # Next.js 14 API backend
│   ├── src/app/api/   # API routes
│   └── package.json   # Runs on port 3001
├── vercel.json        # Deployment configuration
└── README.md
```

## Quick Start

### 1. Backend Setup (Port 3001)

```bash
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your Supabase credentials

# Run the backend
npm run dev
```

The backend API will be available at [http://localhost:3001](http://localhost:3001).

### 2. Frontend Setup (Port 3000)

```bash
cd frontend
npm install

# The frontend is pre-configured to connect to localhost:3001
# You can customize this in .env.local if needed

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- TypeScript

### Backend
- Next.js 14
- TypeScript
- Supabase (PostgreSQL)
- Zod validation

## API Connection

The frontend connects to the backend API using the configuration in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

The API status is displayed in the bottom-right corner of the homepage.

## Deployment

### Quick Deploy

Use the deployment script:

```bash
./deploy.sh
```

Choose from:
1. Backend API only
2. Frontend only
3. Both (recommended for first deployment)

### Manual Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Environment Variables

**Backend (Required):**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

**Frontend (Required):**
- `NEXT_PUBLIC_API_URL` - Your deployed backend URL

### Live URLs

- **Frontend**: https://frontend-tau-orpin-67.vercel.app
- **Backend API**: https://backend-opal-delta-67.vercel.app
- **API Health Check**: https://backend-opal-delta-67.vercel.app/api/health

## License

See [LICENSE](LICENSE) for details.
