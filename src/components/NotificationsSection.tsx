import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  CheckCheck,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppNotification, ViewState } from '../types';

interface NotificationsSectionProps {
  onNavigate: (view: ViewState) => void;
}

const formatNotifTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getNotificationVisual = (notif: AppNotification) => {
  if (notif.kind === 'giftcard_approved' || notif.status === 'verified' || notif.status === 'redeemed') {
    return {
      icon: CheckCircle2,
      iconClass: 'text-emerald-300',
      label: 'Approved',
      labelClass: 'text-emerald-300',
    };
  }
  if (notif.kind === 'giftcard_rejected' || notif.status === 'rejected') {
    return {
      icon: XCircle,
      iconClass: 'text-rose-300',
      label: 'Rejected',
      labelClass: 'text-rose-300',
    };
  }
  return {
    icon: Clock,
    iconClass: 'text-amber-300',
    label: 'Pending',
    labelClass: 'text-amber-300',
  };
};

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({ onNavigate }) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <section
      id="notifications-section"
      aria-labelledby="notifications-section-heading"
      className="bg-black/50 backdrop-blur-md border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 id="notifications-section-heading" className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Notifications</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
            {notifications.length === 0
              ? 'Live Admin approve and reject updates appear here automatically'
              : unreadCount > 0
              ? `${unreadCount} unread · ${notifications.length} total`
              : `All caught up · ${notifications.length} total`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notifications.length > 0 && (
            <>
              <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    filter === 'all'
                      ? 'bg-white/15 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unread')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                    filter === 'unread'
                      ? 'bg-white/15 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="min-h-[36px] bg-white/10 hover:bg-white/20 border border-white/10 text-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}

              <button
                type="button"
                onClick={clearNotifications}
                className="min-h-[36px] bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/30 text-slate-300 hover:text-rose-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty State */}
      {visibleNotifications.length === 0 ? (
        <div className="py-6 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
            <Bell className="w-4 h-4" />
          </div>
          <p className="text-sm font-semibold text-slate-200">
            {filter === 'unread' && notifications.length > 0
              ? 'No unread notifications'
              : 'No notifications yet'}
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {filter === 'unread' && notifications.length > 0
              ? 'You have read all recent status alerts. Switch to All to review past updates.'
              : 'Whenever Admin approves or rejects your submitted gift card or verification request, a live notification appears here without refreshing.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {visibleNotifications.map((notif) => {
            const visual = getNotificationVisual(notif);
            const Icon = visual.icon;

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) markNotificationRead(notif.id);
                }}
                className={`py-3.5 px-2 -mx-2 rounded-xl transition-colors ${
                  !notif.read ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 shrink-0 ${visual.iconClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-white">{notif.title}</span>
                        <span aria-hidden="true" className="text-slate-500">·</span>
                        <span className={`font-semibold ${visual.labelClass}`}>{visual.label}</span>
                        {!notif.read && (
                          <>
                            <span aria-hidden="true" className="text-slate-500">·</span>
                            <span className="text-amber-300 font-semibold">New</span>
                          </>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed break-words">
                        {notif.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[11px] text-slate-400 tabular-nums">
                        <span>{formatNotifTime(notif.createdAt)}</span>
                        {notif.statusId && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{notif.statusId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {notif.actionView && notif.actionLabel && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationRead(notif.id);
                          onNavigate(notif.actionView!);
                        }}
                        className="min-h-[34px] bg-white/10 hover:bg-white/20 border border-white/15 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                      >
                        <span>{notif.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
