import { For, Show } from 'solid-js';
import { state, t, txt, refreshTokenWallet } from '../../store';
import { nf } from '../../data';
import { label as labelStyle, TEAL } from '../../theme';
import { clampProgress, canPromote, vipShortfall, recentTransactions } from './walletModel';

function dateOf(iso) {
  const d = new Date(iso);
  return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
}

export default function TokenWallet() {
  const wallet = () => state.tokenWallet;
  const data = () => wallet().data;
  const balance = () => data()?.balance || 0;
  const cost = () => data()?.vipCost || 0;
  const days = () => data()?.vipDays || 0;
  const progress = () => clampProgress(balance(), cost());
  const txs = () => recentTransactions(data()?.transactions);

  return (
    <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
      <div style={labelStyle}>{t().walletTitle}</div>

      <Show when={wallet().loading}>
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:10px">
          <div style="height:34px;width:60%;border-radius:10px;background:#f2f1ee;animation:bnSk 1.3s ease infinite" />
          <div style="height:9px;border-radius:999px;background:#f2f1ee;animation:bnSk 1.3s ease infinite" />
          <div style="height:13px;width:75%;border-radius:8px;background:#f2f1ee;animation:bnSk 1.3s ease infinite" />
        </div>
      </Show>

      <Show when={!wallet().loading && wallet().error}>
        <div style="margin-top:16px;padding:16px;border-radius:14px;background:#fceeeb;font-size:13px;color:#93331f;display:flex;flex-direction:column;align-items:flex-start;gap:10px">
          <span>{wallet().error}</span>
          <button
            type="button"
            class="bn-tap"
            onClick={refreshTokenWallet}
            style="padding:9px 14px;border-radius:10px;background:#fff;font-size:12.5px;font-weight:700"
          >
            {t().retryW}
          </button>
        </div>
      </Show>

      <Show when={!wallet().loading && !wallet().error}>
        <Show when={data()} fallback={<div style="margin-top:16px;font-size:13px;color:#9a9793">{t().walletEmpty}</div>}>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;flex-wrap:wrap">
            <div style="display:flex;align-items:baseline;gap:8px">
              <span style="font-size:34px;font-weight:800;letter-spacing:-.03em">{nf(balance())}</span>
              <span style="font-size:13px;color:#6f6d68;font-weight:600">{t().walletBalanceLabel}</span>
            </div>
            <Show when={cost() > 0}>
              <span
                style={`display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;background:${canPromote(balance(), cost()) ? '#e8f4f2' : '#f2f1ee'};color:${canPromote(balance(), cost()) ? TEAL : '#6f6d68'}`}
              >
                {canPromote(balance(), cost()) ? t().walletVipReady : txt('walletToVip', { n: nf(vipShortfall(balance(), cost())) })}
              </span>
            </Show>
          </div>
          <div style="margin-top:14px;height:9px;border-radius:999px;background:#f2f1ee;overflow:hidden">
            <div style={`width:${progress()}%;height:100%;border-radius:999px;background:${TEAL};transition:width .3s ease`} />
          </div>
          <div style="margin-top:10px;font-size:12.5px;color:#6f6d68">{txt('walletPrice', { cost: nf(cost()), days: days() })}</div>

          <div style="margin-top:20px;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a9793">
            {t().walletHistory}
          </div>
          <Show when={txs().length > 0} fallback={<div style="margin-top:10px;font-size:13px;color:#9a9793">{t().walletNoTx}</div>}>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:2px">
              <For each={txs()}>
                {(tx) => (
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #f4f3f0;font-size:13px">
                    <span style="color:#4a4844">{txt(tx.labelKey)}</span>
                    <span style="display:flex;align-items:center;gap:10px;flex:0 0 auto">
                      <span style="color:#9a9793;font-variant-numeric:tabular-nums">{dateOf(tx.createdAt)}</span>
                      <span style={`font-weight:700;font-variant-numeric:tabular-nums;color:${tx.amount < 0 ? '#93331f' : '#0a5f59'}`}>
                        {tx.amount > 0 ? '+' : ''}
                        {nf(tx.amount)}
                      </span>
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
