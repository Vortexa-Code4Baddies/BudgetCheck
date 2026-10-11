import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  UploadCloud,
  Scale,
  AlertTriangle,
  CheckSquare,
  FileText,
  History,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast, { Toaster } from 'react-hot-toast';

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Datasets', href: '/datasets', icon: Database },
    { name: 'Upload Data', href: '/upload', icon: UploadCloud },
    { name: 'Reconciliation', href: '/reconciliation', icon: Scale },
    { name: 'Findings', href: '/findings', icon: AlertTriangle },
    { name: 'Review Center', href: '/reviews', icon: CheckSquare },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Audit History', href: '/audit-history', icon: History },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  const handleLoadDemoData = async () => {
    setDemoLoading(true);
    const toastId = toast.loading('Loading state expenditure demonstration dataset...');
    try {
      const res = await api.post('/demo/load');
      toast.success(res.data.message || 'Demo dataset loaded successfully!', { id: toastId });
      // If we are on dashboard or datasets, trigger a refresh or navigate
      navigate('/datasets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load demo data', { id: toastId });
    } finally {
      setDemoLoading(false);
    }
  };

  // Determine current page title
  const currentNav = navigation.find((n) => n.href === location.pathname);
  const pageTitle = currentNav ? currentNav.name : 'Financial Audit Intelligence';

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Wordmark */}
        <div className="h-18 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-900/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xl tracking-tight text-white font-sans">FISCORA</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">AI</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Audit & Reconciliation</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tagline */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/60">
          <p className="text-[11px] text-slate-400 italic">
            "Every rupee accounted for. Every anomaly explained."
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Demo Data Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <button
            onClick={handleLoadDemoData}
            disabled={demoLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg border border-slate-700 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>{demoLoading ? 'Loading Sample...' : 'Load Demo Dataset'}</span>
          </button>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-teal-400 text-sm">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AU'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Reviewer'}</p>
              <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] rounded bg-slate-800 text-slate-300 capitalize">
                {user?.role || 'Auditor'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-18 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Public Accounts & Forensic Spending Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Deterministic Rule Engine Active
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <span className="text-xs font-medium text-slate-700 hidden md:inline">
                {user?.organization || 'State Audit'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
