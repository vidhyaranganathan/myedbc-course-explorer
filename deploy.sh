#!/bin/bash

# Deployment script for BC Course Finder
# This script helps deploy both frontend and backend to Vercel

set -e

echo "🚀 BC Course Finder Deployment"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

echo -e "${BLUE}Choose deployment target:${NC}"
echo "1) Backend API only"
echo "2) Frontend only"
echo "3) Both (Backend first, then Frontend)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo -e "${GREEN}📦 Deploying Backend API...${NC}"
        cd backend
        vercel --prod
        echo ""
        echo -e "${GREEN}✅ Backend deployed!${NC}"
        echo -e "${YELLOW}⚠️  Don't forget to set environment variables:${NC}"
        echo "   - SUPABASE_URL"
        echo "   - SUPABASE_ANON_KEY"
        ;;
    2)
        echo -e "${GREEN}📦 Deploying Frontend...${NC}"
        cd frontend
        vercel --prod
        echo ""
        echo -e "${GREEN}✅ Frontend deployed!${NC}"
        echo -e "${YELLOW}⚠️  Make sure NEXT_PUBLIC_API_URL is set to your backend URL${NC}"
        ;;
    3)
        echo -e "${GREEN}📦 Step 1: Deploying Backend API...${NC}"
        cd backend
        vercel --prod
        BACKEND_URL=$(vercel --prod 2>&1 | grep -o 'https://[^[:space:]]*' | head -1)
        cd ..

        echo ""
        echo -e "${GREEN}✅ Backend deployed!${NC}"
        echo -e "${BLUE}Backend URL: $BACKEND_URL${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  Set these environment variables in backend:${NC}"
        echo "   - SUPABASE_URL"
        echo "   - SUPABASE_ANON_KEY"
        echo ""

        read -p "Press Enter after setting backend env vars to continue with frontend..."

        echo ""
        echo -e "${GREEN}📦 Step 2: Deploying Frontend...${NC}"
        cd frontend

        if [ -n "$BACKEND_URL" ]; then
            echo -e "${BLUE}Setting NEXT_PUBLIC_API_URL to: $BACKEND_URL${NC}"
            vercel env add NEXT_PUBLIC_API_URL production <<< "$BACKEND_URL"
        fi

        vercel --prod
        cd ..

        echo ""
        echo -e "${GREEN}✅ Both deployed successfully!${NC}"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "1. Verify backend health: $BACKEND_URL/api/health"
        echo "2. Check frontend and look for green API status indicator"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
