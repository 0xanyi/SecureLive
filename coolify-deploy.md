# Coolify Deployment Guide

This guide will help you deploy the Secure Live Stream Portal to Coolify, a self-hosted deployment platform.

## Prerequisites

- Coolify instance running and accessible
- Docker support enabled on your Coolify server
- Git repository with your code
- Environment variables configured

## Deployment Steps

### 1. Prepare Your Repository

Ensure your repository contains the following files (already created):
- `Dockerfile` - Container configuration
- `docker-compose.yml` - Service orchestration
- `.dockerignore` - Files to exclude from Docker build
- `next.config.ts` - Updated with standalone output

### 2. Environment Variables

Configure these environment variables in Coolify:

#### Required Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Brevo Email Configuration
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=STPPL Events

# Application Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
JWT_SECRET=your_jwt_secret_key_here

# Flow Player Configuration (optional)
FLOW_PLAYER_EMBED_CODE=your_flow_player_embed_code
```

### 3. Coolify Configuration

1. **Create New Application**
   - Go to your Coolify dashboard
   - Click "New Application"
   - Choose "Docker Compose" or "Dockerfile" deployment

2. **Repository Setup**
   - Connect your Git repository
   - Set the branch (usually `main` or `master`)
   - Set build context to root directory (`/`)

3. **Build Configuration**
   - Build command: `npm run build`
   - Start command: `npm start`
   - Port: `3000`
   - Health check endpoint: `/api/health`

4. **Environment Variables**
   - Add all the environment variables listed above
   - Make sure `NEXT_PUBLIC_APP_URL` points to your actual domain

### 4. Domain Configuration

1. **Custom Domain**
   - Add your custom domain in Coolify
   - Configure DNS to point to your Coolify server
   - Enable SSL/TLS certificate (Let's Encrypt)

2. **Subdomain Setup** (if using subdomain)
   - Configure subdomain in your DNS provider
   - Add subdomain in Coolify domain settings

### 5. Database Setup

Ensure your Supabase database is properly configured:

1. **Run Database Migrations**
   ```sql
   -- Use the supabase-schema.sql file in your project root
   -- Or use missing-tables.sql if adding to existing setup
   ```

2. **Verify Database Connection**
   - Test connection from your deployed app
   - Check Supabase logs for any connection issues

### 6. Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Health check endpoint responds (`/api/health`)
- [ ] Database connection works
- [ ] Email sending functionality works
- [ ] Admin login works
- [ ] User authentication flow works
- [ ] Live streaming functionality works
- [ ] SSL certificate is active
- [ ] Domain redirects properly

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (should be 18+)
   - Verify all dependencies are in package.json
   - Check build logs for specific errors

2. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify URLs don't have trailing slashes

3. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check Supabase project status
   - Ensure database schema is up to date

4. **Email Issues**
   - Verify Brevo API key is valid
   - Check sender email is verified in Brevo
   - Test email functionality in admin panel

### Performance Optimization

1. **Resource Allocation**
   - Allocate sufficient RAM (minimum 512MB, recommended 1GB)
   - Ensure adequate CPU resources
   - Monitor resource usage after deployment

2. **Caching**
   - Enable CDN if available
   - Configure proper cache headers
   - Use Redis for session storage if needed

### Monitoring

1. **Health Checks**
   - Monitor `/api/health` endpoint
   - Set up alerts for downtime
   - Check application logs regularly

2. **Performance Monitoring**
   - Monitor response times
   - Track error rates
   - Monitor database performance

## Scaling Considerations

For high-traffic deployments:

1. **Horizontal Scaling**
   - Deploy multiple instances
   - Use load balancer
   - Configure session persistence

2. **Database Optimization**
   - Monitor Supabase usage
   - Optimize queries
   - Consider connection pooling

3. **CDN Integration**
   - Serve static assets via CDN
   - Cache API responses where appropriate
   - Optimize image delivery

## Security Considerations

1. **Environment Security**
   - Use strong JWT secrets
   - Rotate API keys regularly
   - Enable HTTPS only

2. **Database Security**
   - Review Supabase RLS policies
   - Monitor database access logs
   - Regular security updates

3. **Application Security**
   - Keep dependencies updated
   - Monitor for security vulnerabilities
   - Regular security audits

## Support

If you encounter issues during deployment:

1. Check Coolify logs for deployment errors
2. Review application logs for runtime issues
3. Verify all environment variables are correctly set
4. Test database connectivity separately
5. Contact the development team for application-specific issues

---

**Note**: This deployment guide assumes you have a working Coolify instance. For Coolify setup and configuration, refer to the official Coolify documentation.