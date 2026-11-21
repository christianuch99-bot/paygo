import React, { useState } from 'react';
import {
  Gift,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TrackedGiftCard, ViewState } from '../types';

interface GiftCardStatusCardProps {
  onNavigate: (view: ViewState) => void;
}

const formatRelativeOrLocalTime = (iso?: string): string => {
  if (!iso) return 'Just now';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getStatusMeta = (status: TrackedGiftCard['status']) => {
  switch (status) {
    case 'verified':
      return {
        label: 'Approved',
        icon: CheckCircle2,
        textClass: 'text-emerald-300',
        surfaceClass: 'bg-emerald-500/10 border-emerald-400/25',
        description: 'Confirmed by Admin. Your access is now unlocked.',
      };
    case 'redeemed':
      return {
        label: 'Approved & Redeemed',
        icon: CheckCircle2,
        textClass: 'text-emerald-300',
        surfaceClass: 'bg-emerald-500/10 border-emerald-400/25',
        description: 'Gift card verified and redeemed. Account access unlocked.',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        icon: XCircle,
        textClass: 'text-rose-300',
        surfaceClass: 'bg-rose-500/10 border-rose-400/25',
        description: 'Rejected by Admin. Submit an unused, valid gift card.',
      };
    case 'pending':
    default:
      return {
        label: 'Pending Review',
        icon: Clock,
        textClass: 'text-amber-300',
        surfaceClass: 'bg-amber-500/10 border-amber-400/25',
        description: 'Awaiting Admin review. Status updates here live without refreshing.',
      };
  }
};

export const GiftCardStatusCard: React.FC<GiftCardStatusCardProps> = ({ onNavigate }) => {
  const { trackedGiftCards, removeTrackedGiftCard } = useAuth();
  const [showAll, setShowAll] = useState(false);

  const latest = trackedGiftCards[0] || null;
  const previousList = trackedGiftCards.slice(1);
  const visiblePrevious = showAll ? previousList : previousList.slice(0, 3);

  const pendingCount = trackedGiftCards.filter((c) => c.status === 'pending').length;
  const approvedCount = trackedGiftCards.filter(
    (c) => c.status === 'verified' || c.status === 'redeemed'
  ).length;
  const rejectedCount = trackedGiftCards.filter((c) => c.status === 'rejected').length;

  const getCardAction = (card: TrackedGiftCard): { label: string; view: ViewState } => {
    const isUpgrade = card.type.startsWith('Stage ');
    if (card.status === 'rejected') {
      return {
        label: 'Resubmit Card',
        view: isUpgrade ? 'upgrade' : 'buy-pay-id',
      };
    }
    if (card.status === 'verified' || card.status === 'redeemed') {
      return {
        label: isUpgrade ? 'View Tier' : 'Go to Transfer',
        view: isUpgrade ? 'upgrade' : 'transfer',
      };
    }
    return {
      label: 'Check Details',
      view: isUpgrade ? 'upgrade' : 'buy-pay-id',
    };
  };

  return (
    <section
      aria-labelledby="gift-card-status-heading"
      className="bg-black/50 backdrop-blur-md border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 id="gift-card-status-heading" className="text-base font-bold text-white flex items-center gap-2">
            <Gift className="w-4 h-4 text-purple-300 shrink-0" />
            <span>Gift Card Status</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
            {trackedGiftCards.length === 0
              ? 'Live approval tracking for PAY ID & tier upgrades'
              : `${trackedGiftCards.length} total · ${pendingCount} pending · ${approvedCount} approved · ${rejectedCount} rejected`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('buy-pay-id')}
          className="min-h-[40px] bg-white/10 hover:bg-white/20 border border-white/15 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <span>Submit Gift Card</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Empty State */}
      {!latest ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-purple-300">
            <Gift className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <p className="text-sm font-semibold text-slate-100">No gift cards submitted yet</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Submit an unused gift card to activate your PAY ID or upgrade your account tier. Approval or rejection updates will appear here live without refreshing.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('buy-pay-id')}
              className="min-h-[40px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Verify PAY ID ($25)
            </button>
            <button
              type="button"
              onClick={() => onNavigate('upgrade')}
              className="min-h-[40px] bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Upgrade Tier
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-4 space-y-4">
          {/* Primary Latest Submission Status */}
          {(() => {
            const meta = getStatusMeta(latest.status);
            const StatusIcon = meta.icon;
            const action = getCardAction(latest);

            return (
              <div className={`rounded-2xl border p-4 space-y-3 ${meta.surfaceClass}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className={`flex items-center gap-1.5 text-sm font-bold ${meta.textClass}`}>
                      <StatusIcon className="w-4 h-4 shrink-0" />
                      <span>{meta.label}</span>
                    </div>
                    <h3 className="text-base font-bold text-white tabular-nums">
                      {latest.cardBrand}
                      {latest.amount > 0 ? ` · $${latest.amount.toLocaleString()}` : ''}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300 tabular-nums">
                      <span>{latest.type}</span>
                      <span aria-hidden="true">·</span>
                      <span>{latest.cardFormat === 'physical' ? 'Physical Card' : 'Digital E-Code'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{latest.maskedCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>Updated {formatRelativeOrLocalTime(latest.updatedAt || latest.submittedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigate(action.view)}
                      className="min-h-[40px] bg-white/15 hover:bg-white/25 border border-white/15 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {action.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTrackedGiftCard(latest.statusId)}
                      title="Remove from list"
                      aria-label="Remove gift card status entry"
                      className="min-w-[40px] min-h-[40px] bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {latest.status === 'rejected' && latest.rejectionReason ? (
                  <p className="text-xs text-rose-200 leading-relaxed bg-black/30 border border-rose-400/20 rounded-xl px-3 py-2.5">
                    <span className="font-semibold text-rose-100">Reason: </span>
                    {latest.rejectionReason}
                  </p>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed">{meta.description}</p>
                )}

                <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                  Ref: {latest.statusId}
                </div>
              </div>
            );
          })()}

          {/* Earlier Submissions List */}
          {previousList.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-300">Earlier Submissions</p>
                {previousList.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAll((prev) => !prev)}
                    className="text-xs text-purple-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <span>{showAll ? 'Show less' : `Show all (${previousList.length})`}</span>
                    {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="divide-y divide-white/10 border-t border-white/10">
                {visiblePrevious.map((card) => {
                  const meta = getStatusMeta(card.status);
                  const RowIcon = meta.icon;
                  return (
                    <div
                      key={card.statusId}
                      className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-100 tabular-nums">
                          <span>{card.cardBrand}</span>
                          {card.amount > 0 && (
                            <>
                              <span aria-hidden="true" className="text-slate-500">·</span>
                              <span>${card.amount.toLocaleString()}</span>
                            </>
                          )}
                          <span aria-hidden="true" className="text-slate-500">·</span>
                          <span className="text-slate-300 font-normal">{card.type}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 tabular-nums">
                          <span className="font-mono">{card.maskedCode}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeOrLocalTime(card.updatedAt || card.submittedAt)}</span>
                          {card.status === 'rejected' && card.rejectionReason && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-rose-300 truncate max-w-[260px]">{card.rejectionReason}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${meta.textClass}`}>
                          <RowIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{meta.label}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTrackedGiftCard(card.statusId)}
                          title="Remove entry"
                          aria-label="Remove earlier gift card entry"
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
