import React from 'react';
import { User, Driver, Role } from '../types';
import { Car, Bell, User as UserIcon, Shield, LogOut, CheckCircle, Smartphone, Home, Info, MapPin } from 'lucide-react';
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
  const isInstalled = isPWAInstalled();

  return (
    <header className="sticky top-0 z-40 bg-slate-50/90 backdrop-blur-md py-2 px-2 sm:px-4 lg:px-8">
      <div className="max-w-7xl mx-auto min-h-[56px] sm:min-h-[64px] bg-white border border-slate-200 rounded-2xl sm:rounded-3xl flex items-center justify-between px-2.5 sm:px-6 py-2 shadow-sm gap-1.5 sm:gap-3">
        {/* Brand Logo & Home trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0" onClick={onHome}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-400 rounded-xl flex items-center justify-center font-black text-base sm:text-xl italic text-slate-900 shadow-sm shrink-0">
            AC
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-slate-900">
              Apni Car
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-amber-400/20 text-slate-900 font-bold text-[10px] uppercase tracking-wider rounded-full border border-amber-400/40">
              <MapPin className="w-3 h-3 text-amber-600" />
              Punjab
            </span>
          </div>
        </div>

        {/* Navigation / Role Toggles */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={onHome}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-full text-[11px] sm:text-xs font-extrabold flex items-center gap-1 transition-all border border-slate-200 shrink-0"
            title="Go to Home / Dashboard"
          >
            <Home className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden xs:inline">Home</span>
          </button>

          <button
            onClick={() => onSwitchRole('admin')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold flex items-center gap-1 transition-all border shrink-0 ${
              activeRole === 'admin'
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
            title="Open Admin Dashboard & Document Inspector"
          >
            <Shield className="w-3.5 h-3.5 text-slate-950" />
            <span>Admin</span>
          </button>

          <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-full border border-slate-200 shadow-2xs shrink-0">
            <button
              onClick={() => onSwitchRole('rider')}
              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
                activeRole === 'rider'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rider
            </button>
            <button
              onClick={() => onSwitchRole('driver')}
              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all ${
                activeRole === 'driver'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Driver
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA Install Button Header shortcut if not installed */}
          {!isInstalled && (
            <button
              onClick={() => promptPWAInstall()}
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-slate-900 border border-yellow-400/40 rounded-full text-xs font-bold transition-all shrink-0"
            >
              <Smartphone className="w-3.5 h-3.5 text-slate-900" />
              Install
            </button>
          )}

          {user ? (
            <>
              {/* Notifications Bell */}
              <button
                onClick={onOpenNotifications}
                className="relative p-2 bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors border border-slate-200 shrink-0"
                title="Notifications"
              >
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-yellow-400 text-slate-950 font-black text-[9px] sm:text-[10px] rounded-full flex items-center justify-center border border-white shadow-2xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Profile Button */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 p-1 sm:pl-2 sm:pr-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-all shadow-2xs shrink-0"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[10px] sm:text-xs uppercase overflow-hidden shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    user.full_name.charAt(0)
                  )}
                </div>
                <div className="text-left hidden xl:block">
                  <p className="text-xs font-bold text-slate-900 leading-none truncate max-w-[80px]">
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
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors border border-transparent hover:border-rose-200 shrink-0"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-full shadow-sm transition-all transform active:scale-95 flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span>Login / Sign Up</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
