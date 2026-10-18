-- Booking requests taken while online checkout is paused.
--
-- A 'requested' booking holds no dates: availability only counts paid and
-- unexpired pending bookings. Approving one moves it to 'pending' with a
-- Stripe payment link, and from then on it blocks the calendar like any other.
ALTER TYPE "BookingStatus" ADD VALUE 'requested';
