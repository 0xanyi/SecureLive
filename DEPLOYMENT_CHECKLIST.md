# Coolify Deployment Checklist

Use this checklist to ensure a successful deployment of the Secure Live Stream Portal to Coolify.

## Pre-Deployment Preparation

### 1. Code Preparation
- [ ] All code committed and pushed to repository
- [ ] Latest changes tested locally
- [ ] Database schema up to date
- [ ] Environment variables documented

### 2. Dependencies Check
- [ ] All dependencies listed in `package.json`
- [ ] No dev dependencies in production build
- [ ] Node.js version compatibility (18+)
- [ ] Docker configuration tested locally

### 3. Configuration Files
- [ ] `Dockerfile` present and configured
- [ ] `docker-compose.yml` configured
- [ ] `.dockerignore` excludes unnecessary files
- [ ] `next.config.ts` has standalone output enabled
- [ ] Health check endpoint (`/api/health`) implemented

## Environment Setup

### 4. Supabase Configuration
- [ ] Supabase project created and accessible
- [ ] Database schema deployed (`supabase-schema.sql`)
- [ ] Row Level Security (RLS) policies configured
- [ ] API keys generated and secured
- [ ] Connection tested from local environment

### 5. Email Service (Brevo)
- [ ] Brevo account created
- [ ] API key generated
- [ ] Sender email verified
- [ ] Email templates configured (if using)
- [ ] Test email sent successfully

### 6. Domain & SSL
- [ ] Domain purchased and configured
- [ ] DNS records pointing to Coolify server
- [ ] SSL certificate ready (Let's Encrypt)
- [ ] Subdomain configured (if applicable)

## Coolify Configuration

### 7. Application Setup
- [ ] New application created in Coolify
- [ ] Repository connected and accessible
- [ ] Build settings configured
- [ ] Port mapping set to 3000
- [ ] Health check endpoint configured

### 8. Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `BREVO_API_KEY` - Brevo API key
- [ ] `BREVO_SENDER_EMAIL` - Verified sender email
- [ ] `BREVO_SENDER_NAME` - Sender display name
- [ ] `NEXT_PUBLIC_APP_URL` - Production domain URL
- [ ] `JWT_SECRET` - Strong secret key (32+ characters)
- [ ] `FLOW_PLAYER_EMBED_CODE` - Flow Player code (if using)
- [ ] `NODE_ENV=production`

### 9. Resource Allocation
- [ ] Minimum 512MB RAM allocated
- [ ] Adequate CPU resources assigned
- [ ] Storage space sufficient for builds
- [ ] Network access configured

## Deployment Process

### 10. Initial Deployment
- [ ] First deployment triggered
- [ ] Build process completed successfully
- [ ] Container started without errors
- [ ] Health check endpoint responding
- [ ] Application accessible via domain

### 11. Database Verification
- [ ] Database connection established
- [ ] Tables created and accessible
- [ ] Sample data inserted (if applicable)
- [ ] Admin user created
- [ ] Authentication flow tested

### 12. Feature Testing
- [ ] Homepage loads correctly
- [ ] User authentication works
- [ ] Admin login functional
- [ ] Event management working
- [ ] Email sending operational
- [ ] Live streaming functional
- [ ] Session management active

## Post-Deployment

### 13. Security Verification
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] API endpoints secured
- [ ] Admin access restricted
- [ ] Environment variables secured

### 14. Performance Testing
- [ ] Page load times acceptable
- [ ] API response times good
- [ ] Database queries optimized
- [ ] Memory usage within limits
- [ ] No memory leaks detected

### 15. Monitoring Setup
- [ ] Health check monitoring active
- [ ] Error logging configured
- [ ] Performance metrics tracked
- [ ] Uptime monitoring enabled
- [ ] Alert notifications set up

## Production Readiness

### 16. Documentation
- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Troubleshooting guide available
- [ ] Admin procedures documented
- [ ] Backup procedures defined

### 17. Backup & Recovery
- [ ] Database backup strategy implemented
- [ ] Application data backup configured
- [ ] Recovery procedures tested
- [ ] Rollback plan prepared
- [ ] Disaster recovery plan documented

### 18. Final Verification
- [ ] All features working in production
- [ ] Performance meets requirements
- [ ] Security measures active
- [ ] Monitoring systems operational
- [ ] Team trained on production system

## Go-Live Checklist

### 19. Launch Preparation
- [ ] Stakeholders notified
- [ ] Support team briefed
- [ ] Launch timeline confirmed
- [ ] Rollback plan ready
- [ ] Communication plan active

### 20. Post-Launch
- [ ] System stability confirmed
- [ ] User feedback collected
- [ ] Performance metrics reviewed
- [ ] Issues logged and addressed
- [ ] Success metrics tracked

---

## Emergency Contacts

- **Development Team**: [Your contact info]
- **Coolify Admin**: [Server admin contact]
- **Database Admin**: [Supabase contact]
- **Domain/DNS**: [Domain provider contact]

## Quick Commands

```bash
# Check application health
curl https://yourdomain.com/api/health

# View container logs
docker logs [container-id]

# Restart application (in Coolify)
# Use Coolify dashboard to restart service

# Database connection test
# Use Supabase dashboard or SQL editor
```

---

**Note**: Complete each section before proceeding to the next. Mark items as complete only after thorough testing.