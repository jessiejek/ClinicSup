# SUPABASE_REQUIRED_NOTIFICATIONS_SQL.md

## Purpose

Add a `notifications` table to the Supabase project so `NotificationService` (frontend) can read and update real notifications instead of using mock data.

## Table

```sql
-- 1. Create the notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  navigate_to TEXT
);

-- 2. Indexes for common query patterns
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- 3. Enable Row-Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS: users read only their own notifications
CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- 5. RLS: users update only their own notifications (mark read / mark all read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. RLS: any authenticated user/system can insert notifications
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

## Usage from the Frontend

The `NotificationService` uses `SupabaseService.client` to:

- **SELECT** `notifications` where `user_id = auth.uid()`, ordered by `created_at DESC`
- **UPDATE** `is_read = true` WHERE `id = <notificationId>` (mark single read)
- **UPDATE** `is_read = true` WHERE `user_id = <userId>` (mark all read)

Since the frontend uses the **anon key**, RLS ensures users can only see/update their own notifications.

## Edge Function Helper (Optional)

For automated notifications (e.g., when a booking is created/cancelled), a Supabase Edge Function or a DB trigger can insert into this table:

```sql
-- Example trigger: notify patient on booking creation
CREATE OR REPLACE FUNCTION notify_booking_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, navigate_to)
  VALUES (
    NEW.patient_user_id,
    'Booking Confirmed',
    'Your appointment has been confirmed.',
    '/patient/bookings/' || NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.patient_user_id IS NOT NULL)
  EXECUTE FUNCTION notify_booking_created();
```

Deploy triggers only when the notification workflow is confirmed.
