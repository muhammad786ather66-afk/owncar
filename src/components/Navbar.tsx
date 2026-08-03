import React, { useState } from 'react';
import { User, Driver, Role } from '../types';
import {
  Car,
  Bell,
  User as UserIcon,
  Shield,
  LogOut,
  Home,
  Info,
  MapPin,
  FileText,
  ShieldCheck,
  Mail,
  Menu,
  X,
  CreditCard,
  HelpCircle,
  Clock,
  Compass,
  KeyRound,
} from 'lucide-react';

interface Props {
  user: User | null;
  driver: Driver | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  onOpenProfile: () => void;
  activeRole: Role;
  onSwitchRole: (role: Role) => void;
  onHome?: () => void;
  onOpenInfo?: (tab?: 'about' | 'terms' | 'privacy' | 'contact') => void;
  onOpenRideHistory?: () => void;
  onOpenSubscription?: () => void;
  currentView?: string;
}

export const Navbar: React.FC<Props> = ({
  user,
  driver,
  onOpenAuth,
  onLogout,
  onOpenNotifications,
  unreadCount,
  onOpenProfile,
  activeRole,
  onSwitchRole,
  onHome,
  onOpenInfo,
  onOpenRideHistory,
  onOpenSubscription,
  currentView = 'dashboard',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleNav = (action: () => void) => {
    setMobileMenuOpen(false);
    action();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white py-2 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
        {/* Left: Brand Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer group shrink-0 py-1"
          onClick={() => handleNav(onHome || (() => {}))}
        >
          <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center font-black text-lg italic text-slate-950 shadow-md group-hover:scale-105 transition-transform">
            AC
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-black tracking-tight text-white">
                Apni Car
              </span>
              <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-300 font-extrabold text-[10px] uppercase tracking-wider rounded-full border border-yellow-400/30">
                Punjab
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium leading-none hidden sm:block">
              Zero Commission Rides
            </span>
          </div>
        </div>

        {/* Center Desktop Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {/* Home */}
          <button
            onClick={() => handleNav(onHome || (() => {}))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              currentView === 'dashboard' && activeRole === 'rider'
                ? 'bg-yellow-400 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-yellow-400" />
            <span>Home</span>
          </button>

          {/* Book Ride */}
          <button
            onClick={() => handleNav(() => onSwitchRole('rider'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeRole === 'rider' && currentView === 'dashboard'
                ? 'bg-slate-800 text-yellow-400 border border-slate-700 font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-yellow-400" />
            <span>Book Ride</span>
          </button>

          {/* Become Driver / Driver Dashboard */}
          <button
            onClick={() => handleNav(() => onSwitchRole('driver'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeRole === 'driver' && currentView === 'dashboard'
                ? 'bg-yellow-400 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-yellow-400" />
            <span>{driver ? 'Driver Dashboard' : 'Become Driver'}</span>
          </button>

          {/* My Trips */}
          {user && onOpenRideHistory && (
            <button
              onClick={() => handleNav(onOpenRideHistory)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                currentView === 'history'
                  ? 'bg-yellow-400 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              <span>My Trips</span>
            </button>
          )}

          {/* Subscription */}
          {onOpenSubscription && (
            <button
              onClick={() => handleNav(onOpenSubscription)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all"
            >
              <CreditCard className="w-3.5 h-3.5 text-yellow-400" />
              <span>Subscription</span>
            </button>
          )}

          {/* About */}
          {onOpenInfo && (
            <button
              onClick={() => handleNav(() => onOpenInfo('about'))}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all"
            >
              <Info className="w-3.5 h-3.5 text-yellow-400" />
              <span>About</span>
            </button>
          )}

          {/* Support / Contact */}
          {onOpenInfo && (
            <button
              onClick={() => handleNav(() => onOpenInfo('contact'))}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
              <span>Support</span>
            </button>
          )}

          {/* Admin Link - Strict Access: Only if user role is admin */}
          {isAdmin && (
            <button
              onClick={() => handleNav(() => onSwitchRole('admin'))}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border ${
                activeRole === 'admin'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/30'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-400/30'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>

        {/* Right User Actions & Mobile Hamburger */}
        <div className="flex items-center gap-2 shrink-0 py-1">
          {user ? (
            <div className="flex items-center gap-2">
              {/* Notifications Bell */}
              <button
                onClick={onOpenNotifications}
                className="relative p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-colors border border-slate-700"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-yellow-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center border border-slate-900">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Profile Pill */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 p-1 pl-2 pr-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
                title="My Profile"
              >
                <div className="w-6 h-6 rounded-lg bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-xs uppercase overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    user.full_name.charAt(0)
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-white leading-none truncate max-w-[90px]">
                    {user.full_name.split(' ')[0]}
                  </p>
                  <p className="text-[9px] text-yellow-400 font-extrabold capitalize tracking-tight mt-0.5">
                    {activeRole}
                  </p>
                </div>
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="hidden sm:flex p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors border border-transparent hover:border-rose-900"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all transform active:scale-95 flex items-center gap-2 shrink-0 border border-yellow-500"
            >
              <UserIcon className="w-3.5 h-3.5 fill-slate-950" />
              <span>Login / Sign Up</span>
            </button>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-yellow-400" /> : <Menu className="w-5 h-5 text-yellow-400" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-2 mt-2 animate-fade-in shadow-xl">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800">
            <button
              onClick={() => handleNav(onHome || (() => {}))}
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                currentView === 'dashboard' && activeRole === 'rider'
                  ? 'bg-yellow-400 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              <Home className="w-4 h-4 text-yellow-400" />
              <span>Home</span>
            </button>

            <button
              onClick={() => handleNav(() => onSwitchRole('rider'))}
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeRole === 'rider'
                  ? 'bg-yellow-400 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              <Car className="w-4 h-4 text-yellow-400" />
              <span>Book Ride</span>
            </button>

            <button
              onClick={() => handleNav(() => onSwitchRole('driver'))}
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeRole === 'driver'
                  ? 'bg-yellow-400 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              <Compass className="w-4 h-4 text-yellow-400" />
              <span>{driver ? 'Driver Dashboard' : 'Become Driver'}</span>
            </button>

            {user && onOpenRideHistory && (
              <button
                onClick={() => handleNav(onOpenRideHistory)}
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  currentView === 'history'
                    ? 'bg-yellow-400 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 text-yellow-400" />
                <span>My Trips</span>
              </button>
            )}
          </div>

          <div className="space-y-1 pt-1">
            {onOpenSubscription && (
              <button
                onClick={() => handleNav(onOpenSubscription)}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4 text-yellow-400" />
                <span>Subscription Plans</span>
              </button>
            )}

            {onOpenInfo && (
              <>
                <button
                  onClick={() => handleNav(() => onOpenInfo('about'))}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2"
                >
                  <Info className="w-4 h-4 text-yellow-400" />
                  <span>About Apni Car</span>
                </button>

                <button
                  onClick={() => handleNav(() => onOpenInfo('contact'))}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4 text-yellow-400" />
                  <span>Support & Contact</span>
                </button>
              </>
            )}

            {user && (
              <button
                onClick={() => handleNav(onOpenProfile)}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4 text-yellow-400" />
                <span>My Profile</span>
              </button>
            )}

            {/* Admin link for administrators */}
            {isAdmin && (
              <button
                onClick={() => handleNav(() => onSwitchRole('admin'))}
                className="w-full text-left px-3 py-2.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 font-extrabold rounded-xl flex items-center gap-2 mt-2"
              >
                <Shield className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span>Admin Dashboard</span>
              </button>
            )}

            {user && (
              <button
                onClick={() => handleNav(onLogout)}
                className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40 rounded-xl flex items-center gap-2 border border-rose-900/40 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

