# Active Context

## Current Goals

- **CMS Implementation**: Convert hardcoded text/images in `HomeClient` to use `content` from DB.
  - [x] Hero Section Text
  - [x] Hero Slider Images
  - [x] House Rules
  - [x] Concierge Services
  - [x] Admin Content Editor Auth Fix (Fixed `jwt malformed` error)
  - [ ] Rooms Section (Check if fully dynamic)
  - [ ] Gallery Section (Check if fully dynamic)
- **Stability**: Ensure dev server runs without file locking issues.

## Recent Changes

- Fixed `EPERM` error by stopping zombie Node processes and regenerating Prisma Client.
- Updated `seed-content.js` with new images (`16xx.jpg`) and tone adjustments (removed "silence").
- Refactored `HeroImageSlider` and `Concierge` components to accept dynamic props.

## Current State

- Dev server is running on localhost:3000.
- Database seeded with latest content.
