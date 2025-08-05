# Supabase Schema

## Table: `credit_events`

Stores anonymous credit usage data points from the extension.

### SQL

```sql
-- Create table for credit events
CREATE TABLE IF NOT EXISTS public.credit_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  extension_id UUID NOT NULL,
  credit INT NOT NULL,
  ts TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.credit_events ENABLE ROW LEVEL SECURITY;

-- Create policy: allow extensions to insert their own events
CREATE POLICY "Extensions can insert their own events"
ON public.credit_events
FOR INSERT
WITH CHECK (true); -- No check needed for anonymous data, or you could match against a user ID if you add auth

-- Note: Select policies would be required if users need to read their own data back.
-- For this MVP, we are only concerned with INSERT.