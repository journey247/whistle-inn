-- ExternalBooking is scanned on every availability check and every checkout
-- conflict check, but had no indexes at all. Booking already carries the
-- equivalent (startDate, endDate) index.
CREATE INDEX IF NOT EXISTS "ExternalBooking_startDate_endDate_idx"
  ON "ExternalBooking"("startDate", "endDate");

-- The iCal sync deletes all rows for a source on each run before re-inserting.
CREATE INDEX IF NOT EXISTS "ExternalBooking_source_idx"
  ON "ExternalBooking"("source");
