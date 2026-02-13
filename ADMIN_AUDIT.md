# Admin Panel Audit & Roadmap

## Implemented Modernizations ✅
- **Visual Feedback**: Replaced browser alerts with a modern Toast notification system (`ToastProvider`).
- **Data Visualization**: Added specific `RevenueChart` component for analytics trends.
- **UX Improvements**: Added `DashboardSkeleton` for better loading states.
- **Export Capabilities**: Added CSV export for Newsletter Subscribers.
- **Mobile Responsiveness**: Optimized Bookings Table for mobile devices.

## Missing Features & Suggestions 🔍

### 1. Content Management (CMS)
**Severity: Medium**
- Currently, there is no interface to edit site content (Hero text, About Us, FAQ).
- **Suggestion**: Add a "Content" tab to manage:
    - Homepage Hero Image & Text
    - "House Rules" text
    - Testimonials

### 2. User & Role Management
**Severity: High (for security)**
- Admin users are currently created via CLI scripts (`npm run create-admin`).
- **Suggestion**: Add a "Settings" tab to:
    - List current admin users.
    - Invite/Create new admins.
    - Change passwords.

### 3. Calendar Management
**Severity: High**
- `CalendarView` is currently read-only.
- **Suggestion**: Allow clicking on dates to:
    - manually block off dates (maintenance/personal use) without creating a full "booking".
    - View booking details popover.

### 4. Booking Details & Editing
**Severity: Medium**
- Bookings table is summary-only.
- **Suggestion**: Click a booking to open a Detailed Modal showing:
    - Stripe Transaction ID / Link.
    - Full raw logs associated with the booking.
    - Ability to edit dates (if guest requests change).

### 5. Activity Logs
**Severity: Low**
- Database tracks changes, but UI doesn't show "Who approved this booking?".
- **Suggestion**: Add an "Audit Log" tab under Settings.

### 6. Promotions / Coupons
**Severity: Low**
- No discount logic visible in checkout flow.
- **Suggestion**: Add a "Coupons" system for marketing (e.g., `SUMMER2026`).

## Next Steps
Recommended priority order:
1.  **Calendar Interactivity**: Critical for managing availability.
2.  **Booking Detail View**: Important for customer support.
3.  **Content Management**: Unlocks non-technical site updates.
