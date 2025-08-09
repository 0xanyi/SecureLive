# Secure Live Stream Portal

A secure, code-based authentication system for private live streaming events built with Next.js 15, TypeScript, and Supabase.

## 🎯 Overview

Secure Live Stream Portal provides a secure platform for hosting private live streaming events with temporary access codes. Perfect for exclusive events, private conferences, or limited-access streaming content.

### Key Features

- **🔐 Secure Code-Based Authentication**: Access control via unique, time-limited codes
- **📊 Real-time Analytics**: Track viewer engagement and session metrics
- **👥 Session Management**: Monitor active viewers and manage concurrent sessions
- **📧 Email Integration**: Automated code distribution via Brevo
- **🎥 Live Streaming**: Seamless video streaming with custom player
- **⚡ Real-time Updates**: Live session heartbeat monitoring
- **🛠️ Admin Dashboard**: Comprehensive admin panel for event management

## 🚀 Tech Stack

- **Frontend**: Next.js 15.4.6 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Custom code-based system with session management
- **Email Service**: Brevo API
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Brevo account (for email functionality)
- PostgreSQL database (via Supabase)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secure-live-stream-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your credentials:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Brevo Email
   BREVO_API_KEY=your_brevo_api_key
   BREVO_SENDER_EMAIL=your_sender_email
   BREVO_SENDER_NAME=your_sender_name
   
   # Admin Authentication
   ADMIN_USERNAME=your_admin_username
   ADMIN_PASSWORD=your_admin_password
   
   # Application
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up the database**
   
   Run the SQL schema in your Supabase project:
   ```bash
   # Use the supabase-schema.sql file in the project root
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
secure-live-stream-portal/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── admin/           # Admin dashboard pages
│   │   ├── api/             # API routes
│   │   ├── login/           # User login page
│   │   └── stream/          # Streaming page
│   ├── components/          # React components
│   │   ├── admin/           # Admin-specific components
│   │   ├── auth/            # Authentication components
│   │   ├── stream/          # Streaming components
│   │   └── ui/              # Shared UI components
│   ├── lib/                 # Utility functions and configurations
│   │   ├── auth/            # Authentication utilities
│   │   ├── email/           # Email service integration
│   │   └── supabase/        # Supabase client configuration
│   └── types/               # TypeScript type definitions
├── docs/                    # Documentation
├── migrations/              # Database migrations
└── public/                  # Static assets
```

## 🔧 Configuration

### Database Setup

The application requires the following database tables:
- `access_codes` - Stores authentication codes
- `sessions` - Manages active user sessions
- `analytics` - Tracks user engagement metrics
- `system_settings` - Stores application configuration

See `supabase-schema.sql` for the complete schema.

### Admin Access

Access the admin dashboard at `/admin` using the credentials set in your environment variables.

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Admin Setup](./ADMIN_SETUP.md) - Admin dashboard configuration
- [Architecture Plan](./docs/architecture-plan.md) - System architecture overview
- [Project Status](./PROJECT_STATUS.md) - Current development status

## 🧪 Testing

```bash
# Run tests (when available)
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📦 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

The application includes a `vercel.json` configuration file for optimal deployment settings.

## 🔐 Security Features

- Secure code-based authentication
- Session management with heartbeat monitoring
- Rate limiting on authentication endpoints
- Secure admin panel with separate authentication
- Environment variable protection for sensitive data
- SQL injection prevention via parameterized queries

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

For support, please contact the development team or raise an issue in the project repository.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database powered by [Supabase](https://supabase.com/)
- Email service by [Brevo](https://www.brevo.com/)
- Deployed on [Vercel](https://vercel.com/)

---

**Note**: This is a private streaming platform. Ensure all security measures are properly configured before deploying to production.
