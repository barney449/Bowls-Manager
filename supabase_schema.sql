-- Supabase Schema for Bowls Team Manager

-- 1. Players Table
CREATE TABLE IF NOT EXISTS public.players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "avatarUrl" TEXT,
    status TEXT,
    role TEXT,
    email TEXT,
    password TEXT,
    "isApproved" BOOLEAN DEFAULT false,
    "unavailablePeriods" JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id TEXT PRIMARY KEY,
    date TEXT,
    time TEXT,
    venue TEXT,
    "isHome" BOOLEAN,
    competition TEXT,
    opponent TEXT,
    disciplines JSONB DEFAULT '[]'::jsonb,
    "lastEmailSent" TEXT,
    "selector1Id" TEXT,
    "selector2Id" TEXT,
    "selector1Picks" JSONB DEFAULT '[]'::jsonb,
    "selector2Picks" JSONB DEFAULT '[]'::jsonb,
    "isConfirmed" BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Database Matches Table
CREATE TABLE IF NOT EXISTS public.database_matches (
    id TEXT PRIMARY KEY,
    date TEXT,
    time TEXT,
    venue TEXT,
    "isHome" BOOLEAN,
    competition TEXT,
    opponent TEXT,
    disciplines JSONB DEFAULT '[]'::jsonb,
    "lastEmailSent" TEXT,
    "selector1Id" TEXT,
    "selector2Id" TEXT,
    "selector1Picks" JSONB DEFAULT '[]'::jsonb,
    "selector2Picks" JSONB DEFAULT '[]'::jsonb,
    "isConfirmed" BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Club Champs Table
CREATE TABLE IF NOT EXISTS public.club_champs (
    id TEXT PRIMARY KEY,
    competition TEXT,
    "selectedType" TEXT,
    "playByDate" TEXT,
    "isHome" BOOLEAN,
    "teamA" JSONB,
    "teamB" JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    "backgroundImage" TEXT,
    "backgroundScale" NUMERIC DEFAULT 1,
    "backgroundPosition" JSONB DEFAULT '{"x": 50, "y": 50}'::jsonb,
    "backgroundBlur" NUMERIC DEFAULT 0,
    "backgroundOverlay" NUMERIC DEFAULT 0.2,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and allow all access for the demo
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_champs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid errors on re-run
DROP POLICY IF EXISTS "Allow all access" ON public.players;
DROP POLICY IF EXISTS "Allow all access" ON public.matches;
DROP POLICY IF EXISTS "Allow all access" ON public.database_matches;
DROP POLICY IF EXISTS "Allow all access" ON public.club_champs;
DROP POLICY IF EXISTS "Allow all access" ON public.app_settings;

-- Create policies
CREATE POLICY "Allow all access" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.database_matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.club_champs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
