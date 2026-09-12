import { canPromote, vipShortfall, vipTimeLeft } from './walletModel';
import { viewsOf, favoritesOf } from '../../listingStats';

export function listingRow(listing, deps) {
  const {
    statusOf,
    hoursOf,
    agoOf,
    clock,
    isConfirmed,
    isConfirmBusy,
    isVipBusy,
    t,
    txt,
    returnToFeed,
    confirmBySms,
    activateVip,
    colors,
    wallet,
    now,
    say
  } = deps;
  const { TEAL, TEAL_T, TEAL_TX, RED, RED_T, RED_TX, SOFT, FAINT, MUTED, INK } = colors;

  const st = () => statusOf(listing);
  const done = () => (listing.remote ? hoursOf(listing) < 1 : !!isConfirmed(listing.id));
  const confirmBusy = () => !!(isConfirmBusy && isConfirmBusy(listing.id));
  const hasPendingRevision = () => !!listing.pendingRevision;
  const isArch = () => st() === 'archived';
  const isFlag = () => st() === 'flagged';
  const isDue = () => st() === 'due';
  const views = viewsOf(listing);
  const favorites = favoritesOf(listing);

  const vipEligible = !!listing.remote && st() === 'fresh';
  const vipBusy = () => !!(isVipBusy && isVipBusy(listing.id));
  const vipRemaining = () => vipTimeLeft(listing.promotedUntil, (now || Date.now)());
  const vipActive = () => !!listing.promoted && !!vipRemaining();
  const walletInfo = () => (wallet ? wallet() : { loading: false, ready: false, cost: 0, balance: 0 });
  const vipCost = () => walletInfo().cost;
  const vipReady = () => walletInfo().ready;
  const vipInsufficient = () => vipReady() && !canPromote(walletInfo().balance, vipCost());
  const vipDisabled = () => vipActive() || vipBusy() || !vipReady();
  const vipLabel = () => {
    if (vipActive()) return t().vipActive;
    if (!vipReady()) return t().vipCheckingW;
    if (vipInsufficient()) return txt('vipMissingTokens', { n: vipShortfall(walletInfo().balance, vipCost()) });
    return txt('vipPromoteCost', { cost: vipCost() });
  };
  const vipTimeLabel = () => {
    const left = vipRemaining();
    if (!left) return '';
    if (left.days > 0) return txt('vipLeftDays', { d: left.days, h: left.hours });
    if (left.hours > 0) return txt('vipLeftHours', { h: left.hours, m: left.minutes });
    return txt('vipLeftMinutes', { m: Math.max(1, left.minutes) });
  };
  const onVip = () => {
    if (vipDisabled()) return;
    if (vipInsufficient()) {
      if (say) say(txt('vipInsufficientToast', { n: vipShortfall(walletInfo().balance, vipCost()) }));
      return;
    }
    activateVip(listing.id);
  };

  return {
    listing,
    st,
    done,
    isArch,
    isFlag,
    isDue,
    hasPendingRevision,
    views,
    favorites,
    promoted: !!listing.promoted,
    vipEligible,
    vipActive,
    vipDisabled,
    vipLabel,
    vipTimeLabel,
    onVip,
    complaints: () => (isFlag() ? Math.max(1, 2) : 0),
    chipBg: () => (st() === 'fresh' ? TEAL_T : st() === 'aging' ? SOFT : isArch() ? SOFT : RED_T),
    chipFg: () => (st() === 'fresh' ? TEAL_TX : st() === 'aging' ? MUTED : isArch() ? FAINT : RED_TX),
    chipText: () =>
      st() === 'fresh' || st() === 'aging'
        ? txt('stToday', { x: agoOf(listing) })
        : isDue()
          ? t().stDue
          : isFlag()
            ? t().stFlag
            : t().stArch,
    left: () => (isArch() ? t().hiddenW : isFlag() ? t().reviewW : clock(Math.max(0, (72 - hoursOf(listing)) * 3600))),
    leftFg: () => (isDue() && !done() ? RED : INK),
    btnLabel: () =>
      isArch() ? t().actReturn : isFlag() ? t().actAnswer : confirmBusy() ? t().actConfirming : done() ? t().actConfirmed : t().actConfirm,
    btnBg: () => ((done() || confirmBusy()) && !isArch() && !isFlag() ? SOFT : isDue() || isFlag() ? RED : isArch() ? '#fff' : TEAL),
    btnFg: () => ((done() || confirmBusy()) && !isArch() && !isFlag() ? MUTED : isArch() ? INK : '#fff'),
    btnBd: () => (isArch() ? '#e8e7e4' : 'transparent'),
    act: () => {
      if (confirmBusy()) return;
      if (isArch()) returnToFeed(listing.id);
      else if (isFlag() || !done()) confirmBySms(listing.id);
    }
  };
}
