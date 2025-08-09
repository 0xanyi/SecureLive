# Secure Live Stream Portal - Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account
- A Brevo (formerly Sendinblue) account
- Git

## 1. Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your environment variables in `.env.local`:

### Supabase Configuration
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings > API to get your keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

### Brevo Email Configuration
1. Go to [brevo.com](https://brevo.com) and create an account
2. Go to SMTP & API > API Keys to create a new API key:
   ```env
   BREVO_API_KEY=your_brevo_api_key_here
   BREVO_SENDER_EMAIL=noreply@yourdomain.com
   BREVO_SENDER_NAME=STPPL Events
   ```

### Application Configuration
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
```

### Flow Player (Optional)
```env
FLOW_PLAYER_EMBED_CODE=<your_flow_player_embed_code_here>
```

## 2. Database Setup

1. In your Supabase project, go to the SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the SQL to create all tables, functions, and policies
4. **Important**: Change the default admin password after setup!

## 3. Install Dependencies

```bash
npm install
```

## 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 5. Initial Admin Setup

1. The database schema creates a default admin user:
   - Email: `admin@stppl.com`
   - Password: `admin123`

2. **IMPORTANT**: Change this password immediately after first login!

3. Access the admin panel at: `http://localhost:3000/admin`

## 6. Testing the Application

### Test Code Authentication
1. Go to the admin panel
2. Generate a test access code
3. Use the code on the main page to test the login flow

### Test Email Integration
1. Generate codes with email addresses
2. Send test emails from the admin panel
3. Check that emails are delivered correctly

## 7. Production Deployment

### Vercel Deployment (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Add all environment variables from `.env.local`
   - Make sure to use production URLs and keys

### Environment Variables for Production
- Update `NEXT_PUBLIC_APP_URL` to your production domain
- Use production Supabase project
- Use production Brevo account
- Generate a new, secure `JWT_SECRET`

## 8. Post-Deployment Checklist

- [ ] Test code authentication flow
- [ ] Test video streaming (with Flow Player if configured)
- [ ] Test email sending
- [ ] Test admin dashboard functionality
- [ ] Test session management and concurrent limits
- [ ] Test attendance tracking
- [ ] Verify all environment variables are set
- [ ] Change default admin password
- [ ] Test on mobile devices
- [ ] Set up monitoring and error tracking

## 9. Generating Access Codes

### For Centers (Single Location Use)
1. Go to Admin > Codes
2. Select "Center" type
3. Set max concurrent sessions to 1
4. Generate codes and send via email

### For Individuals (Multiple Sessions)
1. Go to Admin > Codes  
2. Select "Individual" type
3. Set desired max concurrent sessions (e.g., 3)
4. Generate codes and send via email

## 10. Monitoring and Analytics

### Built-in Analytics
- Daily attendance tracking
- Session duration monitoring
- Code usage statistics
- Email delivery tracking

### Database Views Available
- `daily_attendance` - Daily attendance statistics
- `active_sessions` - Currently active sessions
- `dashboard_stats` - Overview statistics

## 11. Troubleshooting

### Common Issues

**"Invalid session" errors:**
- Check JWT_SECRET is set correctly
- Verify Supabase connection
- Check browser cookies are enabled

**Email not sending:**
- Verify Brevo API key
- Check sender email is verified in Brevo
- Check email logs in admin panel

**Video not loading:**
- Verify Flow Player embed code
- Check browser console for errors
- Test with fallback player

**Database connection issues:**
- Verify Supabase URL and keys
- Check RLS policies are set correctly
- Ensure service role key has proper permissions

### Support

For technical issues:
1. Check the browser console for errors
2. Check the server logs
3. Verify all environment variables
4. Test with a fresh browser session

## 12. Security Notes

- Always use HTTPS in production
- Regularly rotate API keys
- Monitor for suspicious activity
- Keep dependencies updated
- Use strong JWT secrets
- Regularly backup your database

## 13. Customization

### Branding
- Update colors in `src/lib/utils.ts`
- Modify email templates in `src/lib/email/brevo.ts`
- Update event dates in utility functions

### Features
- Add more analytics in admin dashboard
- Customize video player controls
- Add chat functionality (if needed)
- Integrate with other streaming services

---

**Event Dates**: August 14-17, 2025
**Support**: Contact your technical team for assistance