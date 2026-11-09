// packages/ui/src/AppLauncherModal.jsx - Visual 8-Application Connected Hub Switcher
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ENTERPRISE_APPS,
  useEnterpriseAuthStore,
  getAppUrl
} from '@unikart/auth';
import {
  ShoppingBag,
  ShieldAlert,
  Boxes,
  TrendingUp,
  Warehouse,
  Receipt,
  Truck,
  Headphones,
  X,
  CheckCircle,
  ExternalLink,
  Lock
} from 'lucide-react';

const ICON_MAP = {
  ShoppingBag,
  ShieldAlert,
  Boxes,
  TrendingUp,
  Warehouse,
  Receipt,
  Truck,
  Headphones
};

export default function AppLauncherModal({ isOpen, onClose, currentAppId }) {
  const navigate = useNavigate();
  const { currentUser, hasAppAccess } = useEnterpriseAuthStore();

  if (!isOpen) return null;

  const handleSelectApp = (app) => {
    onClose();
    if (app.port && window.location.port !== String(app.port)) {
      window.location.href = getAppUrl(app.id);
    } else {
      navigate(app.route);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-[#252525] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E31837] flex items-center justify-center font-black text-white text-base">
              U
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                UNIKART Business Ecosystem
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-600/40 text-sky-200 border border-sky-500/30">
                  2 Maintained Applications
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Single-Company Unified Platform &bull; Logged in as: <span className="text-white font-semibold">{currentUser?.name || 'Administrator'} ({currentUser?.roleName || 'Staff'})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#333333] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 8-App Grid */}
        <div className="p-6 max-h-[75vh] overflow-y-auto bg-[#F8FAFC]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ENTERPRISE_APPS.map((app) => {
              const IconComp = ICON_MAP[app.icon] || Boxes;
              const isCurrent = currentAppId === app.id;
              const canAccess = hasAppAccess ? hasAppAccess(app.id) : true;

              return (
                <div
                  key={app.id}
                  onClick={() => canAccess && handleSelectApp(app)}
                  className={`relative rounded-xl p-4 transition-all border text-left flex flex-col justify-between ${
                    canAccess
                      ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
                      : 'opacity-50 cursor-not-allowed'
                  } ${
                    isCurrent
                      ? 'bg-red-50/50 border-[#E31837] ring-2 ring-[#E31837]/20 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Top Bar with Number & Status */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      APP {app.number}
                    </span>
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#E31837] bg-red-100/70 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : canAccess ? (
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                  </div>

                  {/* App Icon & Title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: `${app.color}15`, color: app.color }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#222222] leading-tight mb-1">
                        {app.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Role: {app.primaryRole}</span>
                    <span className="font-mono text-[10px] text-gray-500">:{app.port}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-gray-100 p-4 px-6 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Single Central FastAPI Engine &bull; Supabase PostgreSQL</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors"
          >
            Close Switcher
          </button>
        </div>
      </div>
    </div>
  );
}
