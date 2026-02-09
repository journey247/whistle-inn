BEGIN;

INSERT INTO "EmailTemplate" (id, name, subject, body, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'booking_confirmation', 'Your reservation at Whistle Inn', '<p>Hi {{guestName}},</p><p>Your reservation from {{startDate}} to {{endDate}} is confirmed.</p>', now(), now())
ON CONFLICT (name) DO NOTHING;

COMMIT;