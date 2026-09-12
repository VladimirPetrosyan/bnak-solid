import { myItems, state, statusOf, hoursOf, agoOf, clock, t, txt, returnToFeed, confirmBySms, activateVip, say } from '../../store';
import { TEAL, TEAL_T, TEAL_TX, RED, RED_T, RED_TX, SOFT, FAINT, MUTED, INK } from '../../theme';
import { listingRow } from './listingRow';

const colors = { TEAL, TEAL_T, TEAL_TX, RED, RED_T, RED_TX, SOFT, FAINT, MUTED, INK };

function walletInfo() {
  const w = state.tokenWallet;
  const data = w.data;
  const cost = data?.vipCost || 0;
  return { loading: w.loading, ready: !w.loading && !!data && cost > 0, cost, balance: data?.balance || 0 };
}

function nowMs() {
  void state.tick;
  return Date.now();
}

export function useCabinetRows() {
  const rows = () =>
    myItems().map((listing) =>
      listingRow(listing, {
        statusOf,
        hoursOf,
        agoOf,
        clock,
        isConfirmed: (id) => !!state.confirmed[id],
        isConfirmBusy: (id) => !!state.confirmBusy[id],
        isVipBusy: (id) => !!state.promoteBusy[id],
        t,
        txt,
        returnToFeed,
        confirmBySms,
        activateVip,
        wallet: walletInfo,
        now: nowMs,
        say,
        colors
      })
    );

  const dueLeft = () => rows().filter((r) => (r.isDue() || r.isFlag()) && !r.done()).length;
  const activeNow = () => rows().filter((r) => !r.isArch() && !r.isFlag()).length;

  return { rows, dueLeft, activeNow };
}
