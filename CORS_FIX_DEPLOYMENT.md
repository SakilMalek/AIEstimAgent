# CORS Fix and Deployment Guide

## Problem Summary
The EstimAgent application was experiencing CORS errors when the frontend (Vercel) tried to access the ML service (Render):
- Error: `Access to fetch at 'https://aiestimagent.onrender.com/analyze' from origin 'https://estimagent.vercel.app' has been blocked by CORS policy`
- Error: `502 Bad Gateway` from ML service

## Root Causes
1. **Missing CORS preflight handling**: The ML service wasn't properly handling OPTIONS requests
2. **Incomplete CORS headers**: Missing `expose_headers` and `max_age` configurations
3. **Missing environment variables**: `CORS_ALLOW_ORIGINS` not set in production
4. **502 errors**: Render free tier cold starts causing service unavailability

## Fixes Applied

### 1. ML Service (ml/app.py)
**Changes:**
- Added `expose_headers=["*"]` to CORS middleware
- Added `max_age=3600` for preflight caching
- Added explicit OPTIONS handler for `/analyze` endpoint
- Added OPTIONS handler for root endpoint `/`
- Added `HEAD` method to allowed methods list

**Updated CORS Configuration:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)
```

**New Endpoints:**
```python
@app.options("/analyze", response_class=PlainTextResponse)
def options_analyze():
    """Handle CORS preflight requests for /analyze endpoint."""
    return PlainTextResponse("ok", status_code=200)

@app.options("/", response_class=PlainTextResponse)
def options_root():
    return PlainTextResponse("ok", status_code=200)
```

### 2. API Service (api/routes.ts)
**Changes:**
- Enhanced CORS middleware with more comprehensive headers
- Added `Access-Control-Expose-Headers` header
- Added `Access-Control-Max-Age` header for preflight caching
- Improved OPTIONS request handling
- Added `HEAD` method support

**Updated CORS Middleware:**
```typescript
res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
res.header('Access-Control-Max-Age', '3600');
```

### 3. Environment Configuration
**Updated Files:**
- `.env.production`: Added `CORS_ALLOW_ORIGINS` variable
- `render.yaml`: Added `CORS_ALLOW_ORIGINS` and `API_BASE_URL` environment variables

## Deployment Steps

### Step 1: Deploy ML Service to Render
1. **Push changes to GitHub**:
   ```bash
   git add ml/app.py .env.production render.yaml
   git commit -m "Fix CORS configuration for ML service"
   git push origin main
   ```

2. **Configure Render Environment Variables**:
   Go to Render Dashboard → ML Service → Environment:
   - Add `CORS_ALLOW_ORIGINS=https://estimagent.vercel.app,http://localhost:5173,http://localhost:5001`
   - Verify all API keys are set (ROOM_API_KEY, WALL_API_KEY, DOORWINDOW_API_KEY)
   - Set `UPLOAD_DIR=/opt/render/project/src/uploads`

3. **Trigger Manual Deploy** or wait for auto-deploy

### Step 2: Deploy API Service to Render
1. **Push changes to GitHub** (if not already done):
   ```bash
   git add api/routes.ts
   git commit -m "Fix CORS configuration for API service"
   git push origin main
   ```

2. **Configure Render Environment Variables**:
   Go to Render Dashboard → API Service → Environment:
   - Add `CORS_ALLOW_ORIGINS=https://estimagent.vercel.app,http://localhost:5173,http://localhost:5001`
   - Add `API_BASE_URL=https://aiestimagent-api.onrender.com`
   - Add `ML_API_URL=https://aiestimagent.onrender.com`
   - Verify `DATABASE_URL` is set

3. **Trigger Manual Deploy** or wait for auto-deploy

### Step 3: Deploy Frontend to Vercel
1. **Configure Vercel Environment Variables**:
   Go to Vercel Dashboard → EstimAgent Project → Settings → Environment Variables:
   - Add `VITE_API_URL=https://aiestimagent-api.onrender.com`
   - Add `VITE_ML_URL=https://aiestimagent.onrender.com`

2. **Trigger Deployment**:
   ```bash
   git push origin main
   ```
   Or manually trigger deployment from Vercel dashboard

### Step 4: Verify Deployment
1. **Test ML Service**:
   ```bash
   curl -I https://aiestimagent.onrender.com/healthz
   ```
   Should return `200 OK`

2. **Test API Service**:
   ```bash
   curl -I https://aiestimagent-api.onrender.com/api/projects
   ```
   Should return `200 OK`

3. **Test Frontend**:
   - Open https://estimagent.vercel.app
   - Upload a drawing and run analysis
   - Check browser console for CORS errors (should be none)

## Important Notes

### Render Free Tier Limitations
- **Cold Starts**: Services spin down after 15 minutes of inactivity
- **First Request Delay**: Can take 30-60 seconds to wake up
- **502 Errors**: Common during cold start period
- **Solution**: Consider upgrading to paid tier or implement keep-alive pings

### CORS Best Practices
1. **Never use wildcard (`*`) with credentials**: This will cause CORS errors
2. **Always specify exact origins**: Use specific URLs in production
3. **Handle OPTIONS requests**: Required for preflight checks
4. **Set appropriate headers**: Include `expose_headers` and `max_age`
5. **Log CORS requests**: Helps debug issues in production

### Environment Variables Checklist
**ML Service (Render):**
- [ ] CORS_ALLOW_ORIGINS
- [ ] ROOM_API_KEY
- [ ] ROOM_WORKSPACE
- [ ] ROOM_PROJECT
- [ ] ROOM_VERSION
- [ ] WALL_API_KEY
- [ ] WALL_WORKSPACE
- [ ] WALL_PROJECT
- [ ] WALL_VERSION
- [ ] DOORWINDOW_API_KEY
- [ ] DOORWINDOW_WORKSPACE
- [ ] DOORWINDOW_PROJECT
- [ ] DOORWINDOW_VERSION
- [ ] UPLOAD_DIR

**API Service (Render):**
- [ ] CORS_ALLOW_ORIGINS
- [ ] API_BASE_URL
- [ ] ML_API_URL
- [ ] DATABASE_URL
- [ ] NODE_ENV=production
- [ ] PORT=5000

**Frontend (Vercel):**
- [ ] VITE_API_URL
- [ ] VITE_ML_URL

## Troubleshooting

### Issue: Still getting CORS errors
**Solution:**
1. Check browser console for exact error message
2. Verify environment variables are set correctly in Render/Vercel dashboards
3. Check that services are running (not in cold start)
4. Clear browser cache and hard reload

### Issue: 502 Bad Gateway
**Solution:**
1. Wait 30-60 seconds for service to wake up from cold start
2. Check Render logs for errors
3. Verify all environment variables are set
4. Check if service is out of memory (upgrade plan if needed)

### Issue: OPTIONS requests failing
**Solution:**
1. Verify OPTIONS handlers are deployed
2. Check CORS middleware is configured correctly
3. Test with curl: `curl -X OPTIONS https://aiestimagent.onrender.com/analyze -v`

### Issue: Frontend can't reach backend
**Solution:**
1. Verify environment variables in Vercel dashboard (not just .env.production)
2. Check network tab in browser for actual URLs being called
3. Verify services are deployed and running

## Testing CORS Locally

### Test ML Service:
```bash
# Start ML service
cd ml
python -m uvicorn app:app --reload --port 8000

# Test OPTIONS request
curl -X OPTIONS http://localhost:8000/analyze \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### Test API Service:
```bash
# Start API service
npm run dev

# Test OPTIONS request
curl -X OPTIONS http://localhost:5001/api/analyze \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### Test Frontend:
```bash
# Start frontend
cd client
npm run dev

# Open http://localhost:5173 and test file upload
```

## Additional Resources
- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [FastAPI CORS Middleware](https://fastapi.tiangolo.com/tutorial/cors/)
- [Express CORS Middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [Render Deployment Guide](https://render.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
