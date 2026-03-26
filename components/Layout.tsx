import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Calendar, 
  Trophy, 
  LogOut, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'Players', path: '/players', icon: UserCircle },
    { name: 'Fixtures', path: '/fixtures', icon: Calendar },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex font-sans text-[#1C1917]">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-[#E7E5E4] transition-all duration-300 flex flex-col fixed h-full z-50",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <span className="font-bold text-xl tracking-tight text-[#0C0A09]">Bowls Manager</span>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-[#F5F5F4] rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center p-3 rounded-xl transition-all group relative",
                  isActive 
                    ? "bg-[#0C0A09] text-white shadow-lg shadow-black/5" 
                    : "text-[#57534E] hover:bg-[#F5F5F4] hover:text-[#0C0A09]"
                )}
              >
                <Icon size={20} className={cn("min-w-[20px]", !isSidebarOpen && "mx-auto")} />
                {isSidebarOpen && (
                  <span className="ml-3 font-medium text-sm">{item.name}</span>
                )}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-[#0C0A09] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E7E5E4]">
          {user ? (
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center p-3 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] transition-colors",
                !isSidebarOpen && "justify-center"
              )}
            >
              <LogOut size={20} />
              {isSidebarOpen && <span className="ml-3 font-medium text-sm">Logout</span>}
            </button>
          ) : (
            <Link
              to="/login"
              className={cn(
                "w-full flex items-center p-3 rounded-xl text-[#0C0A09] hover:bg-[#F5F5F4] transition-colors",
                !isSidebarOpen && "justify-center"
              )}
            >
              <UserCircle size={20} />
              {isSidebarOpen && <span className="ml-3 font-medium text-sm">Login</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "flex-1 transition-all duration-300 min-h-screen",
          isSidebarOpen ? "ml-64" : "ml-20"
        )}
      >
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[#E7E5E4] flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center text-sm text-[#57534E]">
            <span>App</span>
            <ChevronRight size={14} className="mx-2" />
            <span className="text-[#0C0A09] font-medium capitalize">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1)}
            </span>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-[#0C0A09]">{user.email}</p>
                <p className="text-xs text-[#78716C]">Member</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#E7E5E4] flex items-center justify-center text-[#0C0A09] font-bold border-2 border-white shadow-sm">
                {user.email?.[0].toUpperCase()}
              </div>
            </div>
          )}
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
