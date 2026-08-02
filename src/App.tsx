import React, { useState, useEffect } from 'react';
import { User, Driver, Role, NotificationItem } from './types';
import { api } from './api/client';
import { initPWA } from './utils/pwa';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { RiderDashboard } from './components/RiderDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { RideHistory } from './components/RideHistory';
import { ProfileModal } from './components/ProfileModal';
import { InfoPagesModal } from './components/InfoPagesModal';
import { Shield, Sparkles, Car, CheckCircle, Smartphone, MapPin, FileText, Info, Mail } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeRole, setActiveRole] = useState<Role>('rider');
  const [currentView, setCurrentView] = useState<'dashboard' | 'history'>('dashboard');

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoTab, setInfoTab] = useState<'about' | 'terms' | 'privacy' | 'contact'>('about');

  const openInfoPage = (tab: 'about' | 'terms' | 'privacy' | 'contact' = 'about') => {
    setInfoTab(tab);
    setShowInfoModal(true);
  };

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    initPWA();

    // Verify session with Cloudflare backend
    const savedToken = localStorage.getItem('apnicar_token');
    const savedUserJson = localStorage.getItem('apnicar_user');
    const savedDriverJson = localStorage.getItem('apnicar_driver');

    if (savedUserJson) {
      try {
        const u = JSON.parse(savedUserJson);
        setUser(u);
        setActiveRole(u.role === 'admin' ? 'admin' : u.role);
      } catch (e) {}
    }

    if (savedDriverJson) {
      try {
        setDriver(JSON.parse(savedDriverJson));
      } catch (e) {}
    }

    if (savedToken) {
      api
        .getMe()
        .then((res) => {
          if (res.user) {
            setUser(res.user);
            setActiveRole(res.user.role === 'admin' ? 'admin' : res.user.role);
            localStorage.setItem('apnicar_user', JSON.stringify(res.user));
          }
          if (res.driver) {
            setDriver(res.driver);
            localStorage.setItem('apnicar_driver', JSON.stringify(res.driver));
          } else if (res.user?.role === 'driver') {
            api.getDriverMe().then((drvRes: any) => {
              const drv = drvRes.driver || drvRes;
              if (drv && drv.id) {
                setDriver(drv);
                localStorage.setItem('apnicar_driver', JSON.stringify(drv));
              }
            }).catch(() => {});
          }
        })
        .catch((err) => {
          if (err.status === 401 || err.status === 403) {
            handleLogout();
          }
        });
    }
  }, []);

  // Sync notifications
  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const timer = setInterval(() => {
      fetchNotifs();
    }, 10000);
    return () => clearInterval(timer);
  }, [user]);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications(user.id);
      setNotifications(res.notifications || []);
    } catch (e) {}
  };

  const handleLoginSuccess = (usr: User, drv?: Driver | null, token?: string) => {
    setUser(usr);
    setDriver(drv || null);
    setActiveRole(usr.role === 'admin' ? 'admin' : usr.role);
    localStorage.setItem('apnicar_user', JSON.stringify(usr));
    if (drv) localStorage.setItem('apnicar_driver', JSON.stringify(drv));

    // Also fetch driver details if user is a driver and drv isn't set yet
    if (usr.role === 'driver' && !drv) {
      api.getDriverMe().then((drvRes: any) => {
        const fetchedDrv = drvRes.driver || drvRes;
        if (fetchedDrv && fetchedDrv.id) {
          setDriver(fetchedDrv);
          localStorage.setItem('apnicar_driver', JSON.stringify(fetchedDrv));
        }
      }).catch(() => {});
    }

    fetchNotifs();
  };

  const handleLogout = () => {
    api.logout().catch(() => {});
    setUser(null);
    setDriver(null);
    localStorage.removeItem('apnicar_token');
    localStorage.removeItem('apnicar_user');
    localStorage.removeItem('apnicar_driver');
  };

  const handleMarkNotifRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {}
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        user={user}
        driver={driver}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onOpenNotifications={() => setShowNotifDrawer(true)}
        unreadCount={unreadCount}
        onOpenProfile={() => setShowProfileModal(true)}
        activeRole={activeRole}
        onSwitchRole={(role) => {
          setActiveRole(role);
          setCurrentView('dashboard');
        }}
        onHome={() => setCurrentView('dashboard')}
        onOpenInfo={(tab) => openInfoPage(tab)}
      />

      {/* Main Content View */}
      <main className="flex-1">
        {currentView === 'history' && user ? (
          <RideHistory
            userId={user.id}
            role={activeRole}
            onBack={() => setCurrentView('dashboard')}
          />
        ) : (
          <>
            {activeRole === 'admin' && user?.role === 'admin' ? (
              <AdminDashboard />
            ) : activeRole === 'driver' && driver && user ? (
              <DriverDashboard
                user={user}
                driver={driver}
                onUpdateDriver={(updated) => {
                  setDriver(updated);
                  localStorage.setItem('apnicar_driver', JSON.stringify(updated));
                }}
                onOpenRideHistory={() => setCurrentView('history')}
              />
            ) : user ? (
              <RiderDashboard
                user={user}
                onOpenRideHistory={() => setCurrentView('history')}
              />
            ) : (
              /* GUEST LANDING / PROMO VIEW */
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Hero Bento Card */}
                <div className="bg-white border border-slate-200 rounded-[32px] p-8 sm:p-12 shadow-sm text-center max-w-4xl mx-auto space-y-6 relative overflow-hidden">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-400/20 text-slate-900 rounded-full text-xs font-bold border border-yellow-400/40">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Punjab's #1 Zero Commission Transport PWA</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                    Drive & Ride Across Punjab with <span className="bg-yellow-400 px-3 py-1 rounded-2xl text-slate-950 inline-block shadow-sm">Zero Commission</span>
                  </h1>

                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                    Apni Car connects passengers directly with verified drivers across Lahore, Faisalabad, Rawalpindi, Multan & all 30+ Punjab districts. Cash paid directly to drivers with zero per-ride cut.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="w-full sm:w-auto px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-base rounded-full shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>Book a Ride Now</span>
                      <span className="w-2 h-2 rounded-full bg-slate-950" />
                    </button>

                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-base rounded-full shadow-md transition-all"
                    >
                      Register as Driver (0% Fee)
                    </button>
                  </div>
                </div>

                {/* Features Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-slate-900 flex items-center justify-center font-black text-2xl shadow-2xs">
                      ⚡
                    </div>
                    <h3 className="text-lg font-black text-slate-900">Zero Ride Deduction</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Drivers keep 100% of the cash fare. No hidden percentage deductions per ride ever.
                    </p>
                  </div>

                  <div className="md:col-span-4 bg-yellow-400 rounded-[32px] p-6 shadow-sm space-y-3 text-slate-950">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-yellow-400 flex items-center justify-center font-black text-2xl shadow-2xs">
                      🗺️
                    </div>
                    <h3 className="text-lg font-black italic">Punjab GPS Map</h3>
                    <p className="text-xs text-slate-950 font-bold leading-relaxed">
                      OpenStreetMap GPS tracking displays active verified drivers across Punjab in real-time.
                    </p>
                  </div>

                  <div className="md:col-span-4 bg-slate-900 text-white rounded-[32px] p-6 shadow-lg space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-yellow-400 flex items-center justify-center font-black text-2xl shadow-2xs">
                      📲
                    </div>
                    <h3 className="text-lg font-black">Installable PWA</h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      Works offline, launches from your phone's home screen like a native app with zero store download size.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-300 font-bold">
            <button onClick={() => openInfoPage('about')} className="hover:text-yellow-400 transition-colors">
              About Us
            </button>
            <span className="text-slate-700">•</span>
            <button onClick={() => openInfoPage('terms')} className="hover:text-yellow-400 transition-colors">
              Terms & Conditions
            </button>
            <span className="text-slate-700">•</span>
            <button onClick={() => openInfoPage('privacy')} className="hover:text-yellow-400 transition-colors">
              Privacy Policy
            </button>
            <span className="text-slate-700">•</span>
            <button onClick={() => openInfoPage('contact')} className="hover:text-yellow-400 transition-colors">
              Contact Us
            </button>
          </div>

          <p className="font-semibold text-slate-300">
            Apni Car © {new Date().getFullYear()} • Powered by Cloudflare Workers, Cloudflare D1 (apnicar-db) & Cloudflare R2 (apnicar-documents)
          </p>

          <p className="text-[11px] text-slate-500 max-w-3xl mx-auto leading-relaxed">
            Zero-commission transport platform built specifically for Punjab, Pakistan. Serving Lahore, Faisalabad, Rawalpindi, Multan, Gujranwala, Sargodha, Sialkot, Bahawalpur, Gujarat, Sheikhupura, Sahiwal, Rahim Yar Khan, Jhelum, Attock, Kasur, Okara & all 30+ Punjab districts.
          </p>
        </div>
      </footer>

      {/* Centered PWA Installation Modal */}
      <PWAInstallModal />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={showNotifDrawer}
        onClose={() => setShowNotifDrawer(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotifRead}
      />

      {/* Profile Modal */}
      {user && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
          driver={driver}
          onUpdateUser={(updated) => {
            setUser(updated);
            localStorage.setItem('apnicar_user', JSON.stringify(updated));
          }}
        />
      )}

      {/* Info & Legal Pages Modal */}
      <InfoPagesModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        defaultTab={infoTab}
      />
    </div>
  );
}
