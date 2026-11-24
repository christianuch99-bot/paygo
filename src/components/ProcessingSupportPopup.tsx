import React, { useEffect, useState } from 'react';
import { Send, ExternalLink, X, Clock, Copy, Check, ShieldCheck, MessageCircle } from 'lucide-react';
import { TELEGRAM_SUPPORT_CONTACTS } from './TelegramSupportModal';

interface ProcessingSupportPopupProps {
  isWaiting: boolean;
  contextLabel: string;
  referenceId?: string | null;
  userEmail?: string;
  delaySeconds?: number;
}

export const ProcessingSupportPopup: React.FC<ProcessingSupportPopupProps> = ({
  isWaiting,
  contextLabel,
  referenceId,
  userEmail,
  delaySeconds = 30,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    if (!isWaiting) {
      setElapsedSeconds(0);
      setIsModalOpen(false);
      setHasAutoOpened(false);
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isWaiting]);

  useEffect(() => {
    if (isWaiting && elapsedSeconds >= delaySeconds && !hasAutoOpened) {
      setHasAutoOpened(true);
      setIsModalOpen(true);
    }
  }, [isWaiting, elapsedSeconds, delaySeconds, hasAutoOpened]);

  if (!isWaiting) return null;

  const remainingToAssist = Math.max(0, delaySeconds - elapsedSeconds);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsedLabel = `${minutes}:${String(seconds).padStart(2, '0')}`;

  const prefilledText = encodeURIComponent(
    `Hello PayGo Support, my ${contextLabel} payment is currently processing.${
      referenceId ? ` Reference ID: ${referenceId}.` : ''
    }${userEmail ? ` Account: ${userEmail}.` : ''} Please help confirm and activate my order.`
  );

  const handleCopyRef = () => {
    if (!referenceId) return;
    navigator.clipboard.writeText(referenceId);
    setCopiedRef(true);
    window.setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <>
      {/* Live Processing Elapsed & 30s Support Prompt Banner */}
      <div className="w-full max-w-sm space-y-2">
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="font-semibold">
              {elapsedSeconds < delaySeconds
                ? 'Processing payment...'
                : 'Taking longer than usual'}
            </span>
          </div>
          <span className="font-mono font-bold text-purple-700 tabular-nums">
            {elapsedLabel}
          </span>
        </div>

        {elapsedSeconds < delaySeconds ? (
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(100, Math.round((elapsedSeconds / delaySeconds) * 100))}%`,
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 rounded-xl p-3 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center space-x-2 text-left">
              <MessageCircle className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Need faster confirmation? Text our Telegram Support</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-sky-600 shrink-0 ml-2" />
          </button>
        )}

        {elapsedSeconds < delaySeconds && (
          <p className="text-[11px] text-gray-400 tabular-nums">
            Priority support options appear automatically in {remainingToAssist}s if processing continues.
          </p>
        )}
      </div>

      {/* 30-Second Auto Popup Leading Directly to Telegram Support */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-purple-100 space-y-4 text-left text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full mb-0.5">
                    Priority Assistance
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                    Taking a Moment to Process?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close support popup"
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your <strong>{contextLabel}</strong> payment is currently processing in our verification queue. To avoid waiting and get your account confirmed right away, please send a quick text to our official PayGo Telegram support team below.
            </p>

            {referenceId && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-purple-600 block">
                    Your Reference ID
                  </span>
                  <span className="font-mono font-bold text-purple-950 truncate block">
                    {referenceId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                >
                  {copiedRef ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              {TELEGRAM_SUPPORT_CONTACTS.map((contact) => (
                <a
                  key={contact.handle}
                  href={`${contact.url}?text=${prefilledText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all group ${
                    contact.rank === 1
                      ? 'bg-sky-600 hover:bg-sky-700 border-sky-500 text-white shadow-md'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 tabular-nums ${
                        contact.rank === 1
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-white'
                      }`}
                    >
                      #{contact.rank}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">
                        Text {contact.handle}
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          contact.rank === 1 ? 'text-sky-100' : 'text-slate-500'
                        }`}
                      >
                        {contact.role} • Direct Telegram Chat
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex items-center space-x-1 text-xs font-bold shrink-0 whitespace-nowrap ${
                      contact.rank === 1 ? 'text-white' : 'text-sky-600'
                    }`}
                  >
                    <span>Chat Now</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </a>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-3">
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified PayGo Support</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Keep Waiting
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
