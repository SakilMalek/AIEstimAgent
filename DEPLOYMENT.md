# Deployment Guide

## Frontend Deployment on Vercel

### Environment Variables
The following environment variables have been configured for your deployment:

- `VITE_API_URL=https://aiestimagent-api.onrender.com`
- `VITE_ML_URL=https://aiestimagent.onrender.com`

### Files Created/Modified

1. **`.env.production`** - Production environment variables
2. **`.env.example`** - Example environment file
3. **`vercel.json`** - Vercel deployment configuration
4. **`client/src/config/api.ts`** - API configuration with environment variable handling
5. **`vite.config.ts`** - Updated base path for production

### Deployment Steps

1. **Push your code to GitHub** (already done)

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your repository: `SakilMalek/AIEstimAgent`

3. **Configure Build Settings:**
   - Framework Preset: Vite
   - Root Directory: `./` (keep as root)
   - Build Command: `npm run build`
   - Output Directory: `dist/client`
   - Install Command: `npm install`

4. **Environment Variables in Vercel:**
   The `vercel.json` file should automatically set these, but you can also add them manually in the Vercel dashboard:
   - `VITE_API_URL` = `https://aiestimagent-api.onrender.com`
   - `VITE_ML_URL` = `https://aiestimagent.onrender.com`

5. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your frontend

### Usage in Code

To use the API configuration in your components, import from the config file:

```typescript
import { createApiUrl, createMlUrl } from '@/config/api';

// For API calls
const apiUrl = createApiUrl('/api/projects');
const response = await fetch(apiUrl);

// For ML calls  
const mlUrl = createMlUrl('/analyze');
const mlResponse = await fetch(mlUrl);
```

### Notes

- The configuration automatically detects the environment (development vs production)
- In development, it uses Vite's proxy for API calls
- In production, it uses the full URLs from environment variables
- The base path has been set to "/" for Vercel deployment
