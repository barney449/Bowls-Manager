import React, { useState } from 'react';
import { Player } from '../types';
import { UserCircle, Shield, LogIn, UserPlus, Loader2 } from 'lucide-react';

interface LoginViewProps {
  players: Player[];
  onLogin: (player: Player) => void;
  onRequestAccess: (name: string, email: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onRequestAccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isLoginMode ? '/api/auth-login' : '/api/auth/signup';
      const netlifyEndpoint = isLoginMode ? '/.netlify/functions/auth-login' : '/.netlify/functions/auth/signup';
      const body = isLoginMode ? { email, password } : { name, email, password };

      let response;
      const tryAuth = async (url: string) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        // If we got HTML back (likely from a SPA redirect) or a 404, it's not the real API
        const contentType = res.headers.get('content-type');
        if (res.status === 404 || (contentType && contentType.includes('text/html'))) {
          throw new Error('Endpoint not found');
        }
        return res;
      };

      try {
        response = await tryAuth(endpoint);
      } catch (e) {
        // Fallback to Netlify function if local API fails or returns HTML
        try {
          response = await tryAuth(netlifyEndpoint);
        } catch (netlifyErr) {
          throw new Error('Authentication service unavailable. Please check your connection.');
        }
      }

      let data;
      const text = await response.text();
      
      if (!text) {
        throw new Error(`The server returned an empty response (Status: ${response.status}). Please try again or contact support.`);
      }

      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON response:', text);
        if (!response.ok) {
          throw new Error(`Server error (${response.status}): ${response.statusText}. The response was not valid JSON.`);
        }
        throw new Error('The server sent an invalid response format. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // If rememberMe is checked, we could store something in localStorage,
      // but the session cookie already has a 30-day maxAge.
      // We'll just pass it along if needed or use it to pre-fill email next time.
      if (rememberMe) {
        localStorage.setItem('bowls_remembered_email', email);
      } else {
        localStorage.removeItem('bowls_remembered_email');
      }

      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fill email if remembered
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('bowls_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password');
    setError('');
    setIsLoading(true);

    try {
      let response;
      const tryAuth = async (url: string, body: any) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        const contentType = res.headers.get('content-type');
        if (res.status === 404 || (contentType && contentType.includes('text/html'))) {
          throw new Error('Endpoint not found');
        }
        return res;
      };

      const loginBody = { email: demoEmail, password: 'password' };
      try {
        response = await tryAuth('/api/auth-login', loginBody);
      } catch (e) {
        // Fallback to Netlify function if local API fails
        try {
          response = await tryAuth('/.netlify/functions/auth-login', loginBody);
        } catch (netlifyErr) {
          throw new Error('Authentication service unavailable. Please check your connection.');
        }
      }

      let data;
      const text = await response.text();
      
      if (!text) {
        throw new Error(`The server returned an empty response (Status: ${response.status}). Please try again.`);
      }

      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON response:', text);
        if (!response.ok) {
          throw new Error(`Server error (${response.status}): ${response.statusText}. The response was not valid JSON.`);
        }
        throw new Error('The server sent an invalid response format. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-bowls-darkGreen p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-bowls-darkGreen font-bold text-2xl border-4 border-bowls-green mx-auto mb-4 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
            B
          </div>
          <h1 className="text-2xl font-bold text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]">BowlsManager</h1>
          <p className="text-bowls-green text-sm mt-1">Club Management System</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            {isLoginMode ? 'Member Login' : 'Create Account'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bowls-green focus:border-transparent outline-none"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bowls-green focus:border-transparent outline-none"
                placeholder="e.g. john@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bowls-green focus:border-transparent outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-bowls-darkGreen focus:ring-bowls-green cursor-pointer"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-bowls-darkGreen text-white font-bold py-3 rounded-lg hover:bg-bowls-green transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLoginMode ? (
                <>
                  <LogIn className="w-5 h-5" /> Login
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" /> Sign Up
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError('');
              }}
              className="text-sm text-gray-500 hover:text-bowls-darkGreen font-medium"
            >
              {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </button>
          </div>
                {/* Quick Login Helper for Demo */}
        <div className="bg-gray-50 p-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-[1px] flex-1 bg-gray-200"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Quick Demo Access</p>
            <div className="h-[1px] flex-1 bg-gray-200"></div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => handleQuickLogin('gary@example.com')} 
              disabled={isLoading}
              className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-bowls-darkGreen hover:shadow-md hover:bg-bowls-darkGreen/5 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-bowls-darkGreen/10 flex items-center justify-center text-bowls-darkGreen font-bold text-xs">GS</div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-bold text-gray-700 group-hover:text-bowls-darkGreen">Gary Stubbs</span>
                  <span className="text-[10px] text-gray-400">Administrator</span>
                </div>
              </div>
              <LogIn className="w-4 h-4 text-gray-300 group-hover:text-bowls-darkGreen group-hover:translate-x-0.5 transition-transform" />
            </button>
            
            <button 
              onClick={() => handleQuickLogin('sean@example.com')} 
              disabled={isLoading}
              className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-bowls-darkGreen hover:shadow-md hover:bg-bowls-darkGreen/5 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-xs">ST</div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-bold text-gray-700 group-hover:text-bowls-darkGreen">Sean Thompson</span>
                  <span className="text-[10px] text-gray-400">Admin Editor</span>
                </div>
              </div>
              <LogIn className="w-4 h-4 text-gray-300 group-hover:text-bowls-darkGreen group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button 
              onClick={() => handleQuickLogin('jacob@example.com')} 
              disabled={isLoading}
              className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-bowls-darkGreen hover:shadow-md hover:bg-bowls-darkGreen/5 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold text-xs">JI</div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-bold text-gray-700 group-hover:text-bowls-darkGreen">Jacob Inch</span>
                  <span className="text-[10px] text-gray-400">Active Member</span>
                </div>
              </div>
              <LogIn className="w-4 h-4 text-gray-300 group-hover:text-bowls-darkGreen group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-400 bg-white/50 py-2 rounded-lg border border-dashed border-gray-200">
            <Shield className="w-3 h-3" />
            <span>Password for all demo accounts is <span className="font-bold text-gray-600">"password"</span></span>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};

export default LoginView;
