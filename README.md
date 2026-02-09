# Whistle Inn Private Getaway Website

This is the official website for the Whistle Inn Private Getaway in Alta, California.

## Features

### iCal Calendar Synchronization
The website includes an advanced iCal synchronization system for real-time booking management:

- **Automatic Sync**: iCal feeds are automatically synced every 30 minutes for near real-time updates
- **Multi-Platform Support**: Supports Airbnb, VRBO, Booking.com, and other platforms
- **Admin Dashboard**: Full admin panel for managing feeds and monitoring sync status
- **Manual Override**: Manual sync option available in the admin panel

**Automated Booking Conflict Prevention:**
- **Real-Time Blocking**: Dates booked on external platforms (Airbnb, etc.) are automatically blocked on your website
- **Frontend Validation**: Calendar shows unavailable dates in red and prevents selection
- **Backend Validation**: Server-side checks prevent double-bookings even if frontend validation fails
- **Live Updates**: Availability updates every 30 minutes to reflect new bookings

**Why 30-minute syncs?** Airbnb and other platforms don't provide direct API access for hosts. iCal feeds are their official integration method, but they only update every 3 hours. Our 30-minute sync schedule provides much more timely updates while remaining within platform guidelines.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app/page.tsx`: The main landing page requiring the property details.
- `src/app/layout.tsx`: The root layout (HTML structure).
- `src/app/globals.css`: Global styles and Tailwind directives.

## Technologies

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/) (Icons)
