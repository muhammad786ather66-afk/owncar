import React from 'react';
import { User, Driver, Role } from '../types';
import { Car, Bell, User as UserIcon, Shield, LogOut, CheckCircle, Smartphone } from 'lucide-react';
import { isPWAInstalled, promptPWAInstall } from '../utils/pwa';

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
}) => {
  const isInstalled = isPWAInstalled();

  return (
    <header className="sticky top-0 z-40 bg-slate-50/90 backdrop-blur-md py-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto h-20 bg-white border border-slate-200 rounded-3xl flex items-center justify-between px-4 sm:px-8 shadow-sm">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center font-black text-xl italic text-slate-900 shadow-sm shrink-0">
            AC
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Apni Car
            </span>
            <span className="hidden sm:inline-block px-3 py-1 bg-yellow-400/20 text-slate-900 font-bold text-[10px] uppercase tracking-wider rounded-full border border-yellow-400/40">
              0% Commission
            </span>
          </div>
        </div>

        {/* Center Role Toggles (if logged in) */}
        {user && (
          <div className="flex items-center bg-slate-100 p-1.5 rounded-full border border-slate-200 shadow-2xs">
            <button
              onClick={() => onSwitchRole('rider')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeRole === 'rider'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rider
            </button>
            <button
              onClick={() => onSwitchRole('driver')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeRole === 'driver'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Driver
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => onSwitchRole('admin')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeRole === 'admin'
                    ? 'bg-yellow-400 text-slate-950 shadow-sm'
                    : 'text-amber-700 hover:text-slate-900'
                }`}
              >
                Admin
              </button>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button Header shortcut if not installed */}
          {!isInstalled && (
            <button
              onClick={() => promptPWAInstall()}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-slate-900 border border-yellow-400/40 rounded-full text-xs font-bold transition-all"
            >
              <Smartphone className="w-4 h-4 text-slate-900" />
              Install PWA
            </button>
          )}

          {user ? (
            <>
              {/* Notifications Bell */}
              <button
                onClick={onOpenNotifications}
                className="relative p-2.5 bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors border border-slate-200"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center border border-white shadow-2xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Profile Button */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 p-1.5 pl-2.5 pr-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-all shadow-2xs"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs uppercase overflow-hidden shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    user.full_name.charAt(0)
                  )}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-slate-900 leading-none truncate max-w-[100px]">
                    {user.full_name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] text-amber-600 font-extrabold capitalize tracking-tight mt-0.5">
                    {activeRole}
                  </p>
                </div>
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors border border-transparent hover:border-rose-200"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-full shadow-sm transition-all transform active:scale-95 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              Login / Sign Up
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
