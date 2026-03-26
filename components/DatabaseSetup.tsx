import React from 'react';
import { Database, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';

interface DatabaseSetupProps {
  onClose: () => void;
}

const DatabaseSetup: React.FC<DatabaseSetupProps> = ({ onClose }) => {
  const [copied, setCopied] = React.useState(false);

  const sqlScript = `-- 1. Players Table
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
CREATE POLICY "Allow all access" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Supabase Setup Required</h2>
              <p className="text-blue-100 text-sm">Tables are missing from your database.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">Why am I seeing this?</p>
                <p>Your application is connected to Supabase, but the required tables haven't been created yet. Follow the steps below to initialize your database.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
              Open Supabase SQL Editor
            </h3>
            <p className="text-sm text-gray-600 ml-8">
              Go to your <a href="https://app.supabase.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a>, select your project, and click on <strong>SQL Editor</strong> in the left sidebar.
            </p>

            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
              Copy and Run the Script
            </h3>
            <p className="text-sm text-gray-600 ml-8">
              Click the button below to copy the SQL script, paste it into a <strong>New Query</strong> in the SQL Editor, and click <strong>Run</strong>.
            </p>

            <div className="ml-8 relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto max-h-48 border border-gray-800">
                {sqlScript}
              </pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all backdrop-blur-md border border-white/10"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy Script'}
              </button>
            </div>

            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
              Refresh the App
            </h3>
            <p className="text-sm text-gray-600 ml-8">
              Once the script finishes running, close this window or refresh the page. The errors will disappear and your data will begin syncing.
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            I've Run the Script
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSetup;
