// src/components/NotificationCentreDrawer.jsx - Unified Central Notification Centre Tray & Preferences
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@unikart/api-client';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Filter,
  Mail,
  MessageSquare,
  Smartphone,
  Send,
  Settings,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Radio,
  Sliders,
  Sparkles
} from 'lucide-react';

export default function NotificationCentreDrawer({ isOpen, onClose, onUnreadChange }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isDispatcherOpen, setIsDispatcherOpen] = useState(false);

  // Notification Preferences State
  const [preferences, setPreferences] = useState({
    email_enabled: 1,
    sms_enabled: 1,
    whatsapp_enabled: 1,
    push_enabled: 1,
    order_alerts: 1,
    inventory_alerts: 1,
    approval_alerts: 1,
    security_alerts: 1
  });

  // Test Dispatcher State
  const [dispatchTitle, setDispatchTitle] = useState('');
  const [dispatchMessage, setDispatchMessage] = useState('');
  const [dispatchCategory, setDispatchCategory] = useState('TASK');
  const [dispatchPriority, setDispatchPriority] = useState('NORMAL');
  const [dispatchChannels, setDispatchChannels] = useState(['IN_APP', 'EMAIL', 'WHATSAPP']);

  // Fetch notifications
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/notifications?category=${selectedCategory}`);
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
        if (onUnreadChange) onUnreadChange(res.data.unreadCount || 0);
      }
    } catch (e) {
      console.warn("Could not load notifications:", e);
      setNotifications([]);
      setUnreadCount(0);
      if (onUnreadChange) onUnreadChange(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch preferences
  const loadPreferences = async () => {
    try {
      const res = await api.get('/notifications/preferences');
      if (res.data?.preferences) setPreferences(res.data.preferences);
    } catch (e) {
      // Keep defaults
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      loadPreferences();
    }
  }, [isOpen, selectedCategory]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      if (onUnreadChange) onUnreadChange(newCount);
    } catch (e) {
      // Local fallback
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      if (onUnreadChange) onUnreadChange(0);
    } catch (e) {
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    try {
      await api.put('/notifications/preferences', preferences);
      setIsPreferencesOpen(false);
    } catch (err) {
      setIsPreferencesOpen(false);
    }
  };

  const handleSendTestNotification = async (e) => {
    e.preventDefault();
    if (!dispatchTitle.trim() || !dispatchMessage.trim()) return;

    try {
      await api.post('/notifications/send', {
        title: dispatchTitle.trim(),
        message: dispatchMessage.trim(),
        category: dispatchCategory,
        priority: dispatchPriority,
        channels: dispatchChannels,
        type: dispatchPriority === 'URGENT' ? 'ALERT' : dispatchPriority === 'HIGH' ? 'WARNING' : 'INFO'
      });
      setDispatchTitle('');
      setDispatchMessage('');
      setIsDispatcherOpen(false);
      loadNotifications();
    } catch (err) {
      setIsDispatcherOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/10 flex justify-end animate-fadeIn font-sans text-[#222222]">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between">
        
        {/* Header */}
        <div className="p-4 bg-[#252525] text-white flex items-center justify-between border-b border-[#383838]">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Bell className="w-5 h-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#E31837] rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">Notification Centre</h3>
              <p className="text-[10px] text-gray-400">
                {unreadCount} Unread &bull; Omnichannel Engine (In-App, Email, SMS, WhatsApp)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreferencesOpen(true)}
              className="p-1.5 rounded-lg bg-[#383838] hover:bg-[#4a4a4a] text-gray-300 hover:text-white transition-colors"
              title="Notification Channel Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-[#383838] hover:bg-[#E31837] flex items-center justify-center text-gray-300 hover:text-white transition-colors text-sm font-bold"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Action Bar: Category Filter & Mark All Read */}
        <div className="p-3 bg-gray-50 border-b border-[#E8E8E8] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'PURCHASE_APPROVAL', label: 'Approvals' },
              { id: 'INVENTORY_ALERT', label: 'Inventory' },
              { id: 'PAYMENT', label: 'Payments' },
              { id: 'DELIVERY', label: 'Delivery' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-[#E31837] text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-[#E31837] hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-gray-100 text-xs">
          {loading ? (
            <div className="p-8 text-center text-gray-400 space-y-2">
              <Clock className="w-6 h-6 mx-auto animate-spin text-[#E31837]" />
              <p className="text-xs">Loading real-time notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <Bell className="w-10 h-10 mx-auto text-gray-300 stroke-1" />
              <p className="font-bold text-gray-700">All caught up!</p>
              <p className="text-[11px] text-gray-400">No unread alerts for this category.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const channels = (n.channels_sent || 'IN_APP').split(',');
              return (
                <div
                  key={n.id}
                  className={`pt-2.5 first:pt-0 p-2.5 rounded-xl transition-all border ${
                    n.is_read
                      ? 'bg-white border-transparent'
                      : 'bg-red-50/40 border-red-100 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {n.type === 'ALERT' ? (
                        <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : n.type === 'WARNING' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : n.type === 'SUCCESS' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      )}

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-gray-900 leading-snug">{n.title}</h4>
                          {n.priority === 'URGENT' && (
                            <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-black animate-pulse">
                              URGENT
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    </div>

                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n.id)}
                        className="text-gray-400 hover:text-emerald-600 p-1 shrink-0"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Channel Delivery Footnote & Deep Link Action */}
                  <div className="mt-2.5 pt-1.5 border-t border-gray-100/80 flex items-center justify-between text-[10px] text-gray-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>Delivered via:</span>
                      {channels.includes('EMAIL') && <Mail className="w-3 h-3 text-blue-600" title="Email sent" />}
                      {channels.includes('SMS') && <Smartphone className="w-3 h-3 text-purple-600" title="SMS sent" />}
                      {channels.includes('WHATSAPP') && <MessageSquare className="w-3 h-3 text-emerald-600" title="WhatsApp sent" />}
                      {channels.includes('IN_APP') && <Bell className="w-3 h-3 text-amber-600" title="In-App Feed" />}
                    </div>

                    {n.action_url && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(n.action_url);
                        }}
                        className="text-[#E31837] hover:underline font-bold flex items-center gap-0.5"
                      >
                        Open <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Quick Dispatch Simulator Trigger */}
        <div className="p-3 bg-gray-50 border-t border-[#E8E8E8] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setIsDispatcherOpen(true)}
            className="text-[11px] font-bold text-gray-700 hover:text-[#E31837] flex items-center gap-1.5"
          >
            <Send className="w-3 h-3" /> Dispatch Test Enterprise Alert
          </button>
          <span className="text-[10px] text-gray-400 font-mono">Real-time Webhook Active</span>
        </div>

      </div>

      {/* NOTIFICATION PREFERENCES MODAL */}
      {isPreferencesOpen && (
        <div className="fixed inset-0 z-60 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden text-xs">
            <div className="bg-[#252525] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#E31837]" />
                <h3 className="font-bold text-sm">Delivery Preferences</h3>
              </div>
              <button onClick={() => setIsPreferencesOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleSavePreferences} className="p-4 space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-2">Delivery Channels</span>
                <div className="space-y-2">
                  {[
                    { key: 'email_enabled', label: 'Email Notifications', icon: Mail },
                    { key: 'sms_enabled', label: 'SMS Instant Alerts', icon: Smartphone },
                    { key: 'whatsapp_enabled', label: 'WhatsApp Business Feed', icon: MessageSquare },
                    { key: 'push_enabled', label: 'Browser Push Notifications', icon: Bell }
                  ].map(ch => {
                    const IconComp = ch.icon;
                    return (
                      <label key={ch.key} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                        <div className="flex items-center gap-2 text-gray-800 font-semibold text-xs">
                          <IconComp className="w-3.5 h-3.5 text-[#E31837]" />
                          <span>{ch.label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!preferences[ch.key]}
                          onChange={(e) => setPreferences({ ...preferences, [ch.key]: e.target.checked ? 1 : 0 })}
                          className="accent-[#E31837] w-4 h-4"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-2">Notification Categories</span>
                <div className="space-y-1.5 text-gray-700">
                  {[
                    { key: 'order_alerts', label: 'Orders & Payments' },
                    { key: 'inventory_alerts', label: 'Inventory Reorder & Low Stock' },
                    { key: 'approval_alerts', label: 'Purchase & Leave Approvals' },
                    { key: 'security_alerts', label: 'Security & Login Threat Alerts' }
                  ].map(cat => (
                    <label key={cat.key} className="flex items-center justify-between text-[11px] cursor-pointer">
                      <span>{cat.label}</span>
                      <input
                        type="checkbox"
                        checked={!!preferences[cat.key]}
                        onChange={(e) => setPreferences({ ...preferences, [cat.key]: e.target.checked ? 1 : 0 })}
                        className="accent-[#E31837] w-3.5 h-3.5"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white font-bold text-xs"
                >
                  Save Channels
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENTERPRISE DISPATCHER MODAL */}
      {isDispatcherOpen && (
        <div className="fixed inset-0 z-60 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden text-xs">
            <div className="bg-[#252525] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Dispatch Enterprise Alert</h3>
              </div>
              <button onClick={() => setIsDispatcherOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleSendTestNotification} className="p-4 space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Alert Title</label>
                <input
                  type="text"
                  required
                  value={dispatchTitle}
                  onChange={(e) => setDispatchTitle(e.target.value)}
                  placeholder="e.g. Urgent PO Approval Required"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Message Body</label>
                <textarea
                  rows="2"
                  required
                  value={dispatchMessage}
                  onChange={(e) => setDispatchMessage(e.target.value)}
                  placeholder="Details of event or task..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={dispatchCategory}
                    onChange={(e) => setDispatchCategory(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                  >
                    <option value="PURCHASE_APPROVAL">PO Approval</option>
                    <option value="INVENTORY_ALERT">Inventory Alert</option>
                    <option value="PAYMENT">Online Payment</option>
                    <option value="DELIVERY">Delivery Alert</option>
                    <option value="TASK">Staff Task</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Priority</label>
                  <select
                    value={dispatchPriority}
                    onChange={(e) => setDispatchPriority(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Red Alert)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsDispatcherOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#E31837] hover:bg-[#C7122E] text-white font-bold"
                >
                  Dispatch Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
