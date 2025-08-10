# Deployment Troubleshooting Guide

## Common Coolify Deployment Issues

### 1. TypeScript Build Errors

**Error**: `Cannot find module 'typescript'`

**Solution**: 
- TypeScript and type definitions are now included in production dependencies
- Use `next.config.js` instead of `next.config.ts` if you prefer to avoid TypeScript in config

**Files Updated**:
- `package.json` - Moved TypeScript to dependencies
- `next.config.js` - JavaScript alternative to TypeScript config

### 2. Docker Build Warnings

**Warning**: `LegacyKeyValueFormat: "ENV key=value" should be used`

**Solution**: 
- Updated Dockerfile to use proper ENV format: `ENV KEY=value`
- All ENV statements now follow modern Docker syntax

### 3. Missing Dependencies During Build

**Error**: Build fails due to missing devDependencies

**Solution**:
- Dockerfile now installs all dependencies during build stage
- Production runtime only includes necessary files

### 4. Health Check Failures

**Error**: Container starts but health check fails

**Solution**:
- Health check endpoint created at `/api/health`
- Returns JSON with application status
- Includes uptime, environment, and version info

### 5. Environment Variable Issues

**Error**: Application starts but features don't work

**Common Issues**:
- Missing required environment variables
- Incorrect URL formats (trailing slashes)
- Invalid API keys

**Solution**:
- Use `.env.production.example` as template
- Verify all required variables are set in Coolify
- Test each service (Supabase, Brevo) independently

## Quick Fixes

### Use JavaScript Config (Recommended for Docker)

If you continue having TypeScript issues, delete `next.config.ts` and use the provided `next.config.js`:

```bash
rm next.config.ts
# next.config.js is already created and ready to use
```

### Test Docker Build Locally

```bash
# Build the image
docker build -t live-streaming-portal .

# Run the container
docker run -p 3000:3000 --env-file .env.local live-streaming-portal

# Test health endpoint
curl http://localhost:3000/api/health
```

### Verify Environment Variables

```bash
# In Coolify, ensure these are set:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
BREVO_API_KEY=your_brevo_key
BREVO_SENDER_EMAIL=your_email
BREVO_SENDER_NAME=Your Name
NEXT_PUBLIC_APP_URL=https://yourdomain.com
JWT_SECRET=your_secure_secret
```

### Check Build Logs

In Coolify:
1. Go to your application
2. Click on "Deployments"
3. Click "Show Debug Logs" for detailed build information
4. Look for specific error messages

### Database Connection Issues

1. **Verify Supabase URL**: Should not have trailing slash
2. **Check API Keys**: Ensure they're from the correct project
3. **Test Connection**: Use Supabase dashboard to verify project status
4. **RLS Policies**: Ensure Row Level Security policies are properly configured

### Email Service Issues

1. **Verify Brevo API Key**: Check it's active and has proper permissions
2. **Sender Email**: Must be verified in Brevo dashboard
3. **Test Email**: Use admin panel to send test email

## Deployment Steps (Revised)

1. **Prepare Repository**
   ```bash
   git add .
   git commit -m "Prepare for Coolify deployment"
   git push origin main
   ```

2. **Configure Coolify**
   - Create new application
   - Connect Git repository
   - Set build context to root (`/`)
   - Configure environment variables

3. **Deploy**
   - Trigger deployment
   - Monitor build logs
   - Check health endpoint once deployed

4. **Verify**
   - Test application functionality
   - Check database connectivity
   - Verify email sending
   - Test admin access

## Support

If issues persist:

1. **Check Coolify Logs**: Look for specific error messages
2. **Test Locally**: Ensure Docker build works on your machine
3. **Verify Services**: Test Supabase and Brevo connections independently
4. **Environment Variables**: Double-check all required variables are set correctly

## Alternative Deployment Options

If Coolify continues to have issues, consider:

1. **Railway**: Similar to Coolify but with different build process
2. **Render**: Supports Docker deployments
3. **DigitalOcean App Platform**: Docker-based deployments
4. **Vercel**: Original deployment target (may require config changes)

---

**Note**: The application is now optimized for Docker deployment with proper dependency management and build configuration.