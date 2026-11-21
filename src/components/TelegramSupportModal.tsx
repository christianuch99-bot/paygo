import React from 'react';
import { Send, ExternalLink, X, ShieldCheck } from 'lucide-react';

export const TELEGRAM_SUPPORT_CONTACTS = [
  {
    rank: 1,
    handle: '@Mike_Aper_PayGo',
    url: 'https://t.me/Mike_Aper_PayGo',
    role: 'Primary Support Representative',
  },
  {
    rank: 2,
    handle: '@Lindaburge',
    url: 'https://t.me/Lindaburge',
    role: 'Customer Care Representative',
  },
] as const;

interface TelegramSupportModalProps {
  onClose: () => void;
}

export const TelegramSupportModal: React.FC<TelegramSupportModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 space-y-4 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                Telegram Help &amp; Support
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose who to message directly on Telegram
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Telegram support options"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 pt-1">
          {TELEGRAM_SUPPORT_CONTACTS.map((contact) => (
            <a
              key={contact.handle}
              href={contact.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all group ${
                contact.rank === 1
                  ? 'bg-sky-50/90 hover:bg-sky-100 border-sky-300 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg font-extrabold text-xs flex items-center justify-center shrink-0 tabular-nums ${
                    contact.rank === 1
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-700 text-white'
                  }`}
                >
                  #{contact.rank}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate group-hover:text-sky-700 transition-colors">
                    {contact.handle}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {contact.role}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-xs font-bold text-sky-600 shrink-0 whitespace-nowrap">
                <span>Message</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>
          ))}
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Verified PayGo Telegram support handles</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
