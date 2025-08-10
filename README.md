# Secure Live Stream Portal

A secure, code-based authentication system for private live streaming events built with Next.js 15, TypeScript, and Supabase.

## 🎯 Overview

Secure Live Stream Portal provides a secure platform for hosting private live streaming events with temporary access codes. Perfect for exclusive events, private conferences, or limited-access streaming content.

### Key Features

- **🔐 Secure Code-Based Authentication**: Access control via unique, time-limited codes
- **� Automated Event Management**: Create and manage live streaming events with automatic activation
- **🎯 Dynamic Event Display**: Login page adapts to show active events in real-time
- **� Real-time Analytics**: Track viewer engagement and session metrics
- **👥 Session Management**: Monitor active viewers and manage concurrent sessions
- **📧 Email Integration**: Automated code distribution via Brevo
- **🎥 Live Streaming**: Seamless video streaming with custom player
- **⚡ Real-time Updates**: Live session heartbeat monitoring
- **🛠️ Admin Dashboard**: Comprehensive admin panel for event and access code management

## 🆕 Latest Features (v2.0)

### Dynamic Streaming Configuration
- **Admin-Controlled HLS Settings**: Update streaming URLs, player IDs, and tokens from the admin panel
- **Real-time Stream Updates**: Changes take effect immediately without code deployment
- **Flexible Player Configuration**: Control autoplay, muted state, and other player options
- **Multi-Provider Support**: Works with Wowza, custom HLS streams, and other providers

### Role-Based User Management
- **Three-Tier Admin System**:
  - **Super Admin**: Full system access including user management
  - **Admin**: Most features except user management
  - **Code Generator**: Limited to access code generation only
- **Granular Permissions**: Custom permission sets for each user
- **Secure User Creation**: Bcrypt password hashing and session management
- **Permission-Based Navigation**: Users only see features they can access

### Enhanced Security & Access Control
- **API Permission Validation**: All endpoints check user permissions
- **Role Hierarchy Protection**: Prevents privilege escalation
- **Self-Protection**: Users cannot delete their own accounts
- **Session-Based Authentication**: JWT tokens with secure cookie handling

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

   # Admin Authentication (Default Super Admin)
   ADMIN_USERNAME=your_admin_username
   ADMIN_PASSWORD=your_admin_password

   # JWT Secret for Admin Sessions
   JWT_SECRET=your_jwt_secret_key

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
│   │   │   ├── events/      # Events management
│   │   │   ├── codes/       # Access codes management
│   │   │   ├── analytics/   # Analytics dashboard
│   │   │   ├── sessions/    # Session management
│   │   │   ├── users/       # **NEW**: Admin user management
│   │   │   └── settings/    # **UPDATED**: System & streaming settings
│   │   ├── api/             # API routes
│   │   │   ├── admin/       # Admin API endpoints
│   │   │   │   ├── events/  # Events CRUD operations
│   │   │   │   ├── users/   # **NEW**: User management API
│   │   │   │   ├── settings/ # System settings API
│   │   │   │   └── streaming-settings/ # **NEW**: Streaming config API
│   │   │   └── events/      # Public events API
│   │   ├── login/           # User login page
│   │   └── stream/          # Streaming page
│   ├── components/          # React components
│   │   ├── admin/           # Admin-specific components
│   │   │   ├── EventsManagement.tsx  # Events admin interface
│   │   │   ├── UserManagement.tsx    # **NEW**: Admin user management
│   │   │   ├── SystemSettings.tsx    # **UPDATED**: Settings with streaming config
│   │   │   └── AdminSidebar.tsx      # **UPDATED**: Role-based navigation
│   │   ├── auth/            # Authentication components
│   │   ├── stream/          # Streaming components
│   │   │   ├── EventInfo.tsx  # Event info sidebar
│   │   │   └── VideoPlayer.tsx # **UPDATED**: Dynamic streaming configuration
│   │   └── ui/              # Shared UI components
│   │       ├── DynamicHeader.tsx  # Dynamic login header
│   │       └── CurrentEvent.tsx   # Event banner component
│   ├── lib/                 # Utility functions and configurations
│   │   ├── auth/            # Authentication utilities
│   │   ├── email/           # Email service integration
│   │   ├── supabase/        # Supabase client configuration
│   │   └── utils.ts         # Utility functions (date formatting, etc.)
│   └── types/               # TypeScript type definitions
├── docs/                    # Documentation
├── supabase-schema.sql      # Complete database schema
├── missing-tables.sql       # Additional tables for existing setups
└── public/                  # Static assets
```

## 🔧 Configuration

### Database Setup

The application requires the following database tables:

- `admin_users` - **UPDATED**: Admin authentication with role-based permissions
- `access_codes` - Stores authentication codes for centers and individuals
- `sessions` - Manages active user sessions with heartbeat monitoring
- `attendance_logs` - Daily attendance tracking and session duration
- `email_logs` - Email sending history and status tracking
- `system_settings` - **UPDATED**: Includes streaming configuration and system settings
- `events` - Live streaming events with automatic scheduling

#### Events System

The events system provides:

- **Automated Event Management**: Events automatically go live based on start/end dates
- **Real-time Status Updates**: Live, Upcoming, and Past event tracking
- **Dynamic User Interface**: Login page adapts to show active events
- **Event Progress Tracking**: Visual progress indicators and time calculations
- **Professional Date Formatting**: Clean, readable date ranges

See `supabase-schema.sql` for the complete schema, or use `missing-tables.sql` to add events to existing setups.

### Admin Access & User Roles

Access the admin dashboard at `/admin` using the credentials set in your environment variables.

#### User Roles & Permissions

**Super Admin** (Full Access)
- ✅ Manage admin users (create, edit, delete)
- ✅ Configure system settings and streaming
- ✅ Manage events and access codes
- ✅ View analytics and manage emails
- ✅ Monitor active sessions

**Admin** (Most Features)
- ❌ Cannot manage admin users
- ✅ Configure system settings and streaming
- ✅ Manage events and access codes
- ✅ View analytics and manage emails
- ✅ Monitor active sessions

**Code Generator** (Limited Access)
- ❌ Cannot manage users or settings
- ❌ Cannot manage events or view analytics
- ✅ Generate and manage access codes only
- ✅ Monitor active sessions

#### Creating Additional Admin Users

1. Log in as a Super Admin
2. Navigate to **Admin → Admin Users**
3. Click **Add User** and configure:
   - Email and name
   - Password (securely hashed)
   - Role (Super Admin, Admin, or Code Generator)
   - Custom permissions (optional)

#### Streaming Configuration

Super Admins and Admins can update streaming settings:

1. Navigate to **Admin → Settings → Streaming**
2. Update HLS URL, Player ID, and authentication token
3. Configure autoplay and muted settings
4. Save changes (takes effect immediately)

## 🔌 API Endpoints

### New Admin User Management APIs

- `GET /api/admin/users` - List all admin users (Super Admin only)
- `POST /api/admin/users` - Create new admin user (Super Admin only)
- `PUT /api/admin/users/[id]` - Update admin user (Super Admin only)
- `DELETE /api/admin/users/[id]` - Delete admin user (Super Admin only)

### Streaming Configuration APIs

- `GET /api/admin/streaming-settings` - Get current streaming configuration
- `POST /api/admin/settings` - Update system settings including streaming config

### Enhanced Admin APIs

- `GET /api/admin/validate` - **UPDATED**: Returns user info with permissions
- `POST /api/admin/settings` - **UPDATED**: Includes streaming configuration

### Permission Validation

All admin APIs now validate user permissions:
- **Super Admin**: Full access to all endpoints
- **Admin**: Access based on specific permissions
- **Code Generator**: Limited to code-related endpoints only

## 📚 Documentation

- [Events Setup Guide](./EVENTS_SETUP.md) - Complete events feature documentation
- [Events Implementation Summary](./EVENTS_IMPLEMENTATION_SUMMARY.md) - Technical implementation details
- [Quick Database Setup](./QUICK_DATABASE_SETUP.md) - Database setup troubleshooting
- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Admin Setup](./ADMIN_SETUP.md) - Admin dashboard configuration
- [Architecture Plan](./docs/architecture-plan.md) - System architecture overview
- [Project Status](./PROJECT_STATUS.md) - Current development status

### Events Feature Documentation

The events system is fully documented with:

- **Setup Instructions**: Step-by-step database and feature setup
- **Usage Guide**: How to create and manage events
- **Technical Details**: API endpoints, database schema, and component architecture
- **Troubleshooting**: Common issues and solutions

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

### Coolify Deployment (Recommended for Self-Hosting)

This application is optimized for deployment on Coolify, a self-hosted deployment platform.

1. **Prepare for deployment**
   ```bash
   # All necessary files are included:
   # - Dockerfile
   # - docker-compose.yml
   # - .dockerignore
   # - Health check endpoint
   ```

2. **Configure environment variables in Coolify**
   - Use `.env.production.example` as a template
   - Set all required variables in Coolify dashboard

3. **Deploy**
   - Connect your Git repository to Coolify
   - Configure build settings (Node.js 18+, port 3000)
   - Deploy and monitor health check endpoint

📋 **See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for complete deployment guide**

📖 **See [coolify-deploy.md](./coolify-deploy.md) for detailed Coolify instructions**

### Alternative: Vercel Deployment

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

The application includes a `vercel.json` configuration file for optimal deployment settings.

## 🔐 Security Features

- **Secure Code-Based Authentication**: Unique access codes for centers and individuals
- **Role-Based Access Control**: Multi-tier admin system with granular permissions
- **Session Management**: Heartbeat monitoring with automatic cleanup
- **Admin Authentication**: JWT-based sessions with secure cookie handling
- **Password Security**: Bcrypt hashing with salt rounds for admin accounts
- **Permission Validation**: All API endpoints validate user permissions
- **Database Security**: Row Level Security (RLS) policies and parameterized queries
- **Environment Protection**: Sensitive data secured via environment variables
- **Rate Limiting**: Protection against brute force attacks
- **Automated Event Security**: Events automatically activate/deactivate based on dates
- **Self-Protection**: Users cannot delete their own accounts or escalate privileges

## 🎯 Events System Features

### For Administrators

- **Event Creation**: Simple form-based event creation with title, description, and dates
- **Automated Scheduling**: Events automatically go live and end based on configured dates
- **Real-time Status**: Live dashboard showing current event status and details
- **Event Management**: Full CRUD operations with professional admin interface
- **Date Validation**: Automatic validation ensuring end dates are after start dates

### For Users

- **Dynamic Login Experience**: Login page adapts to show active events
- **Event Information**: Clear event details with professional date formatting
- **Stream Integration**: Event information displayed in streaming interface
- **Real-time Updates**: Event status updates automatically every minute

### Technical Features

- **Automatic Activation**: No manual intervention required for event lifecycle
- **Professional Date Formatting**: "Sunday, 10 August 25 - Monday, 18 August 25" format
- **Real-time Calculations**: Live progress tracking and time remaining calculations
- **Database Functions**: PostgreSQL functions for efficient event queries
- **API Endpoints**: RESTful API for both admin and public event access

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
