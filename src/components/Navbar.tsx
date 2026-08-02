import React from 'react';
import { User, Driver, Role } from '../types';
import { Car, Bell, User as UserIcon, Shield, LogOut, Home, Info, MapPin, FileText, ShieldCheck, Mail } from 'lucide-react';

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
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white py-2 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Brand Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer group shrink-0 py-1"
          onClick={onHome}
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

        {/* Center: Primary Role Navigation & Admin Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center py-1">
          {/* Home Button */}
          <button
            onClick={onHome}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 shrink-0"
            title="Go to Home"
          >
            <Home className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden xs:inline">Home</span>
          </button>

          {/* Admin Dashboard Button — PROMINENT YELLOW BADGE */}
          <button
            onClick={() => onSwitchRole('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border shrink-0 shadow-sm ${
              activeRole === 'admin'
                ? 'bg-yellow-400 text-slate-950 border-yellow-500 ring-2 ring-yellow-400/30'
                : 'bg-yellow-400/15 text-yellow-300 border-yellow-400/40 hover:bg-yellow-400/30'
            }`}
            title="Open Admin Dashboard & Driver Approvals"
          >
            <Shield className="w-4 h-4 text-slate-950 fill-yellow-400" />
            <span>Admin Panel</span>
          </button>

          {/* Rider / Driver Role Segment */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0">
            <button
              onClick={() => onSwitchRole('rider')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                activeRole === 'rider'
                  ? 'bg-yellow-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Rider
            </button>
            <button
              onClick={() => onSwitchRole('driver')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                activeRole === 'driver'
                  ? 'bg-yellow-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Driver
            </button>
          </div>
        </div>

        {/* Right: Info Links & User / Login Actions */}
        <div className="flex items-center gap-2 shrink-0 py-1">
          {/* Quick Info Menu Link (desktop) */}
          {onOpenInfo && (
            <button
              onClick={() => onOpenInfo('about')}
              className="hidden lg:flex items-center gap-1 text-slate-300 hover:text-yellow-400 text-xs font-bold px-2 py-1 transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-yellow-400" />
              <span>Info</span>
            </button>
          )}

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
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors border border-transparent hover:border-rose-900"
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
        </div>
      </div>
    </header>
  );
};
