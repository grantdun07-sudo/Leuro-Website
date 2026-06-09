CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'lapsed', 'revoked', 'expired')),
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  trial_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  payfast_subscription_id TEXT,
  last_payment_date TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON subscriptions
  FOR ALL USING (auth.jwt() ->> 'email' = 'hello@leuroai.co.za');

CREATE POLICY "Users read own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
