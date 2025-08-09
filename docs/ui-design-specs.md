# Secure Live Stream Portal - UI/UX Design Specifications

## Design Principles
- **Minimal & Clean**: Focus on content, reduce distractions
- **Accessible**: WCAG 2.1 AA compliance
- **Responsive**: Mobile-first approach
- **Fast**: Optimized loading times
- **Modern**: Contemporary design patterns

## Color Palette

### Primary Colors
```css
--primary-blue: #2563EB;      /* Main brand color */
--primary-dark: #1E40AF;      /* Hover states */
--primary-light: #60A5FA;     /* Accents */
```

### Neutral Colors
```css
--gray-900: #111827;          /* Text primary */
--gray-700: #374151;          /* Text secondary */
--gray-500: #6B7280;          /* Text muted */
--gray-300: #D1D5DB;          /* Borders */
--gray-100: #F3F4F6;          /* Backgrounds */
--white: #FFFFFF;             /* Base */
```

### Semantic Colors
```css
--success: #10B981;           /* Success states */
--warning: #F59E0B;           /* Warning states */
--error: #EF4444;             /* Error states */
--info: #3B82F6;              /* Info states */
```

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, sans-serif;
```

### Font Sizes
```css
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
```

## Page Layouts

### 1. Landing Page
```
┌─────────────────────────────────────┐
│          STPPL UK & Europe          │
│                                     │
│     [Event Logo/Banner Image]       │
│                                     │
│    August 14-17, 2025              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Enter Your Access Code     │   │
│  │                               │   │
│  │   [___________________]      │   │
│  │                               │   │
│  │   [  Access Stream  ]         │   │
│  └─────────────────────────────┘   │
│                                     │
│     [Admin Login] (small link)      │
└─────────────────────────────────────┘
```

### 2. Code Entry Page
```
┌─────────────────────────────────────┐
│         Access Your Stream          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                               │   │
│  │   Access Code *               │   │
│  │   ┌─────────────────────┐    │   │
│  │   │                     │    │   │
│  │   └─────────────────────┘    │   │
│  │                               │   │
│  │   [?] Code provided via email │   │
│  │                               │   │
│  │   ┌──────────────────┐       │   │
│  │   │  Enter Stream    │       │   │
│  │   └──────────────────┘       │   │
│  │                               │   │
│  │   [Error message area]        │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 3. Video Stream Page
```
┌─────────────────────────────────────┐
│  [← Exit]     STPPL UK & Europe     │
├─────────────────────────────────────┤
│                                     │
│     ┌───────────────────────┐      │
│     │                       │      │
│     │    Video Player       │      │
│     │                       │      │
│     │                       │      │
│     └───────────────────────┘      │
│                                     │
│  Event Schedule                     │
│  ┌─────────────────────────────┐   │
│  │ Day 1 - Aug 14              │   │
│  │ Day 2 - Aug 15              │   │
│  │ Day 3 - Aug 16              │   │
│  │ Day 4 - Aug 17              │   │
│  └─────────────────────────────┘   │
│                                     │
│  Currently Viewing: [Center Name]   │
└─────────────────────────────────────┘
```

### 4. Admin Dashboard
```
┌─────────────────────────────────────┐
│  STPPL Admin    [User] [Logout]     │
├────┬────────────────────────────────┤
│    │                                │
│ 📊 │  Dashboard Overview            │
│ 🎫 │  ┌──────────┬──────────┐      │
│ 📧 │  │  Active  │  Total   │      │
│ 📈 │  │  Users   │  Codes   │      │
│ ⚙️ │  │   247    │   500    │      │
│    │  └──────────┴──────────┘      │
│    │                                │
│    │  Recent Activity               │
│    │  ┌─────────────────────┐      │
│    │  │ • New login: CTR-001 │      │
│    │  │ • Code generated     │      │
│    │  │ • Email sent         │      │
│    │  └─────────────────────┘      │
└────┴────────────────────────────────┘
```

## Component Specifications

### 1. Code Input Component
```tsx
// Design specifications
interface CodeInputProps {
  maxLength: 20
  placeholder: "Enter your access code"
  pattern: /^[A-Z0-9-]+$/
  autoComplete: "off"
  autoFocus: true
  showValidation: boolean
}

// Visual states
- Default: Gray border, white background
- Focus: Blue border, slight shadow
- Error: Red border, red error text below
- Success: Green border, green checkmark icon
- Disabled: Gray background, reduced opacity
```

### 2. Button Component
```tsx
// Variants
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

// Sizes
type ButtonSize = 'sm' | 'md' | 'lg'

// States
- Default: Base color
- Hover: Darker shade, cursor pointer
- Active: Even darker, slight scale(0.98)
- Disabled: Reduced opacity, cursor not-allowed
- Loading: Spinner icon, disabled state
```

### 3. Card Component
```tsx
// Admin dashboard cards
interface CardProps {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

// Styling
- Background: White
- Border: 1px solid gray-200
- Border radius: 8px
- Shadow: 0 1px 3px rgba(0,0,0,0.1)
- Padding: 24px
```

### 4. Table Component (Admin)
```tsx
// Access codes table
interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
}

// Features
- Sortable columns
- Pagination
- Search/filter
- Bulk actions
- Row selection
- Responsive scroll
```

## Mobile Responsive Design

### Breakpoints
```css
--mobile: 640px;     /* sm */
--tablet: 768px;     /* md */
--laptop: 1024px;    /* lg */
--desktop: 1280px;   /* xl */
--wide: 1536px;      /* 2xl */
```

### Mobile Adaptations

#### Landing Page (Mobile)
- Full-width code input
- Larger touch targets (min 44px)
- Stacked layout
- Simplified navigation

#### Video Stream (Mobile)
- Full-screen video option
- Collapsible schedule
- Swipe gestures for navigation
- Portrait/landscape optimization

#### Admin Dashboard (Mobile)
- Hamburger menu
- Card-based layout
- Horizontal scroll for tables
- Touch-optimized controls

## Accessibility Features

### WCAG 2.1 AA Compliance
- Color contrast ratio: minimum 4.5:1
- Focus indicators: visible outline
- Keyboard navigation: full support
- Screen reader: ARIA labels
- Alt text: all images
- Error messages: clear and descriptive

### Keyboard Shortcuts
```
Tab         - Navigate forward
Shift+Tab   - Navigate backward
Enter       - Submit/Select
Escape      - Close modal/Cancel
Space       - Play/Pause video
F           - Fullscreen video
M           - Mute/Unmute
```

## Loading States

### Skeleton Screens
```tsx
// Video player skeleton
<div className="animate-pulse">
  <div className="aspect-video bg-gray-200 rounded-lg" />
  <div className="mt-4 h-4 bg-gray-200 rounded w-3/4" />
  <div className="mt-2 h-4 bg-gray-200 rounded w-1/2" />
</div>
```

### Progress Indicators
- Initial load: Full-page spinner
- Data fetch: Inline spinner
- Form submit: Button spinner
- Video buffer: Progress bar

## Error States

### Error Messages
```tsx
interface ErrorMessage {
  type: 'error' | 'warning' | 'info'
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}
```

### Common Error Scenarios
1. **Invalid Code**
   - Message: "The code you entered is invalid or has expired."
   - Action: "Try again" or "Contact support"

2. **Session Limit**
   - Message: "Maximum concurrent sessions reached for this code."
   - Action: "Sign out from another device"

3. **Network Error**
   - Message: "Unable to connect. Please check your internet connection."
   - Action: "Retry"

4. **Video Error**
   - Message: "Unable to load video stream."
   - Action: "Refresh page"

## Animation & Transitions

### Micro-interactions
```css
/* Button hover */
transition: all 0.2s ease;

/* Page transitions */
animation: fadeIn 0.3s ease-in-out;

/* Modal appearance */
animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Loading spinner */
animation: spin 1s linear infinite;
```

### Page Transitions
- Fade in/out: 300ms
- Slide animations: 400ms
- Skeleton to content: 200ms
- Error messages: slide down 300ms

## Icons Library

Using Lucide React icons:
```tsx
import {
  User,
  Lock,
  Mail,
  Calendar,
  Clock,
  Users,
  BarChart,
  Settings,
  LogOut,
  Play,
  Pause,
  Volume2,
  Maximize,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  Send,
  Copy,
  Edit,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
  Loader2
} from 'lucide-react'
```

## Form Validation

### Visual Feedback
```tsx
// Real-time validation
- Show validation as user types (debounced)
- Green checkmark for valid fields
- Red X for invalid fields
- Helper text below input

// Error display
<div className="mt-1 text-sm text-red-600">
  {error.message}
</div>

// Success display
<div className="mt-1 text-sm text-green-600">
  ✓ Code validated successfully
</div>
```

## Performance Metrics

### Target Metrics
- First Contentful Paint: < 1.2s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1
- First Input Delay: < 100ms
- Lighthouse Score: > 90

### Optimization Strategies
1. Lazy load non-critical components
2. Optimize images with Next.js Image
3. Minimize JavaScript bundle
4. Use CSS-in-JS sparingly
5. Implement virtual scrolling for lists
6. Cache static assets
7. Preload critical fonts

## Browser Support

### Minimum Requirements
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari 14+
- Chrome Mobile 90+

### Progressive Enhancement
- Basic functionality without JavaScript
- Fallback for unsupported features
- Polyfills for critical features
- Graceful degradation for older browsers