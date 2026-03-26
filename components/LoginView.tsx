import React, { useState } from 'react';
import { Player } from '../types';
import { UserCircle, Shield, LogIn, UserPlus } from 'lucide-react';

interface LoginViewProps {
  players: Player[];
  onLogin: (player: Player) => void;
  onRequestAccess: (name: string, email: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ players, onLogin, onRequestAccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLoginMode) {
      // Simple login check
      const user = players.find(p => p.email?.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        setError('User not found. Please check your email or request access.');
        return;
      }

      if (user.password !== password) {
        setError('Incorrect password.');
        return;
      }

      if (!user.isApproved) {
        setError('Your account is pending approval by an administrator.');
        return;
      }

      onLogin(user);
    } else {
      // Request Access
      if (!name || !email || !password) {
        setError('Please fill in all fields.');
        return;
      }

      const existingUser = players.find(p => p.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        setError('A user with this email already exists.');
        return;
      }

      onRequestAccess(name, email);
      // Reset form or show success message
      alert('Request sent! Please wait for an admin to approve your account.');
      setIsLoginMode(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-bowls-darkGreen p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-bowls-darkGreen font-bold text-2xl border-4 border-bowls-green mx-auto mb-4">
            B
          </div>
          <h1 className="text-2xl font-bold text-white">BowlsManager</h1>
          <p className="text-bowls-green text-sm mt-1">Club Management System</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            {isLoginMode ? 'Member Login' : 'Request Access'}
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
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bowls-green focus:border-transparent outline-none"
                placeholder="e.g. john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bowls-green focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-bowls-darkGreen text-white font-bold py-3 rounded-lg hover:bg-bowls-green transition-colors flex items-center justify-center gap-2"
            >
              {isLoginMode ? (
                <>
                  <LogIn className="w-5 h-5" /> Login
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" /> Request Access
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
              {isLoginMode ? "Don't have an account? Request Access" : "Already have an account? Login"}
            </button>
          </div>
        </div>
        
        {/* Quick Login Helper for Demo */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 text-xs text-gray-500 text-center">
          <p className="font-bold mb-2">Demo Credentials (password: password):</p>
          <div className="flex flex-col items-center gap-2">
            <button onClick={() => { setEmail('gary@example.com'); setPassword('password'); }} className="hover:text-bowls-darkGreen underline">
              Gary (Admin) - gary@example.com
            </button>
            <button onClick={() => { setEmail('sean@example.com'); setPassword('password'); }} className="hover:text-bowls-darkGreen underline">
              Sean (Editor) - sean@example.com
            </button>
            <button onClick={() => { setEmail('jacob@example.com'); setPassword('password'); }} className="hover:text-bowls-darkGreen underline">
              Jacob (Member) - jacob@example.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
