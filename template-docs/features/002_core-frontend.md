# Feature 00c: Core Frontend

ip> Status: ✅ Complete

## Overview

Establish the core frontend infrastructure including layout, navigation, routing, notifications, and essential user-facing pages. This creates the foundation for all future frontend features.

## Dependencies

- [00_project-setup.md](000_setup.md) - Base project structure
- [01a_user-auth.md](004_user-auth.md) - Authentication (login/register)
- [00d_system-settings.md](003_system-settings.md) - Admin settings page

---

## Scope

### Layout & Navigation

- **TopNav (AppBar)**
  - Logo/brand on left
  - Theme toggle
  - User menu (profile, admin link if admin, logout)
  - Login/Register buttons when not authenticated
  
- **Sidebar**
  - Collapsible navigation for main app sections
  - Icons + labels
  - Active state highlighting
  - Mobile: drawer that slides in
  - Keep minimal - expand as features are added
  
- **Footer**
  - Minimal: copyright, version

- **Responsive Design**
  - Mobile hamburger menu for TopNav
  - Sidebar becomes drawer on mobile

### Landing Page

- Public page at `/`
- Hero section with tagline and CTA
- Feature highlights (3-4 cards)
- "Get Started" button → Register
- Beautiful, modern, minimal

### Routing & Navigation

- All routes defined and navigable
- Navigation links in Sidebar
- Admin section in sidebar (conditional on isAdmin)
- Proper 404 page

### User Feedback

- **Toast/Snackbar system** using notistack
- Global notification provider
- Success/error/info/warning variants
- Stacking support

### Loading & Error States

- Loading spinners/skeletons
- Error boundary component
- 404 Not Found page
- Network error handling

### User Profile

- Profile page at `/profile`
- View user info (email, created date, role)
- Change password form
- Preferences management (theme, future settings)

---

## Data Model Changes

```typescript
// Add to users table
preferences: jsonb('preferences').default('{}'),

// Preferences structure (extensible)
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  // Future: notifications, language, timezone, etc.
}
```

---

## API Endpoints

Following REST best practices:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Get current user profile |
| PATCH | `/api/v1/users/me` | Update current user profile |
| PATCH | `/api/v1/users/me/password` | Change password |
| GET | `/api/v1/users/me/preferences` | Get preferences |
| PATCH | `/api/v1/users/me/preferences` | Update preferences |

---

## Routes

| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | LandingPage | No | Public landing |
| `/login` | LoginPage | No | Login form |
| `/register` | RegisterPage | No | Registration |
| `/home` | HomePage | Yes | User dashboard |
| `/profile` | ProfilePage | Yes | User profile |
| `/admin/settings` | SettingsPage | Admin | System settings |
| `/*` | NotFoundPage | No | 404 catch-all |

---

## Acceptance Criteria

### Layout
- [ ] TopNav with logo, theme toggle, user menu
- [ ] Sidebar with navigation links
- [ ] Footer with minimal info
- [ ] Responsive design works on mobile

### Landing Page
- [ ] Beautiful hero section
- [ ] Feature highlights
- [ ] CTA buttons work

### Routing
- [ ] All routes accessible via navigation
- [ ] 404 page for unknown routes
- [ ] Redirect after login works

### Notifications
- [ ] Toast notifications display
- [ ] Multiple notifications stack
- [ ] Auto-dismiss after timeout

### Profile
- [ ] Can view user info
- [ ] Can change password
- [ ] Can change theme preference
- [ ] Preferences sync to DB

### Error Handling
- [ ] Error boundary catches crashes
- [ ] Network errors show friendly message
- [ ] Loading states during data fetch

---

## Dependencies (npm)

```bash
pnpm --filter web add notistack
```

---

## Notes

- Keep landing page content generic/placeholder for now
- Sidebar items will expand as features are added
- Preferences stored as JSONB for extensibility
- Theme preference syncs to DB to persist across devices
