import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setError('Check your email for the confirmation link!');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl border border-[#E7E5E4] shadow-2xl shadow-black/5 overflow-hidden"
      >
        <div className="p-8 bg-[#0C0A09] text-white text-center">
          <h1 className="text-3xl font-bold tracking-tight">Bowls Manager</h1>
          <p className="text-[#A8A29E] mt-2 text-sm">Manage your teams, players, and fixtures with ease.</p>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] group-focus-within:text-[#0C0A09] transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] group-focus-within:text-[#0C0A09] transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0C0A09] text-white rounded-xl font-bold hover:bg-[#1C1917] transition-all flex items-center justify-center shadow-lg shadow-black/10 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  Sign In <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E7E5E4]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[#A8A29E] font-bold">New to the app?</span>
            </div>
          </div>

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full py-3 bg-white border border-[#E7E5E4] text-[#0C0A09] rounded-xl font-bold hover:bg-[#F5F5F4] transition-all flex items-center justify-center active:scale-[0.98]"
          >
            Create an Account
          </button>
        </div>
        
        <div className="p-6 bg-[#FAFAF9] border-t border-[#E7E5E4] text-center">
          <p className="text-xs text-[#78716C]">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
