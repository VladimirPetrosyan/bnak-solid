import { For, Show } from 'solid-js';
import { t, txt, go, editListing, markRented, openListing, addrOf, roomsLabel, priceOf, perOf } from '../../store';
import { RED_T, RED_TX, TEAL_T, TEAL_TX, INK } from '../../theme';
import Icon from '../../components/Icon';
import PhotoSlot from '../../components/PhotoSlot';
import Kpi from './Kpi';
import VipAction from './VipAction';
import { useCabinetRows } from './rows';

export default function OwnerView() {
  const { rows, dueLeft, activeNow } = useCabinetRows();

  return (
    <>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:16px;margin-top:24px">
        <Kpi label={t().kpiLive} value={String(activeNow())} note={`${rows().length} ${t().allW.toLowerCase()}`} />
        <Kpi
          label={t().kpiDue}
          value={String(dueLeft())}
          note={dueLeft() ? t().stDue : t().allConfirmed}
          bg={dueLeft() ? RED_T : '#fff'}
          fg={dueLeft() ? RED_TX : INK}
        />
        <Kpi label={t().kpiComp} value="0" note={t().hRow2} />
        <Kpi label={t().kpiScore} value="100%" note={t().kpiScore} bg={TEAL_T} fg={TEAL_TX} />
      </div>

      <Show when={rows().length === 0}>
        <div style="margin-top:20px;background:#fff;border-radius:20px;padding:clamp(28px,5vw,48px);text-align:center;box-shadow:0 1px 2px rgba(28,27,25,.05)">
          <div style="font-size:20px;font-weight:800;letter-spacing:-.02em">{t().noListings}</div>
          <div style="font-size:14.5px;color:#6f6d68;margin-top:8px">{t().noListingsS}</div>
          <div
            onClick={() => go('post')}
            style="display:inline-flex;margin-top:20px;padding:12px 20px;border-radius:13px;background:#0e7c73;color:#fff;font-size:14px;font-weight:700;cursor:pointer"
          >
            {t().post}
          </div>
        </div>
      </Show>

      <div style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(420px,100%),1fr));gap:16px">
        <For each={rows()}>
          {(r) => (
            <div
              style={`border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(28,27,25,.05);display:flex;gap:16px;flex-wrap:wrap;background:${r.isDue() || r.isFlag() ? '#fffaf9' : '#fff'}`}
            >
              <div style="flex:0 0 120px;height:96px;border-radius:12px;overflow:hidden;background:#f2f1ee;position:relative">
                <PhotoSlot id={`ph-${r.listing.id}`} label={addrOf(r.listing)} src={r.listing.photos && r.listing.photos[0]} />
              </div>
              <div style="flex:1 1 200px;min-width:0">
                <span
                  style={`display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;font-size:11.5px;font-weight:700;background:${r.chipBg()};color:${r.chipFg()}`}
                >
                  {r.chipText()}
                </span>
                <Show when={r.hasPendingRevision()}>
                  <span
                    style={`display:inline-flex;align-items:center;gap:6px;margin-left:8px;padding:8px 12px;border-radius:999px;font-size:11.5px;font-weight:700;background:${TEAL_T};color:${TEAL_TX}`}
                  >
                    {t().pendingRevisionChip}
                  </span>
                </Show>
                <div onClick={() => openListing(r.listing.id)} style="font-size:15.5px;font-weight:700;margin-top:8px;cursor:pointer">
                  {roomsLabel(r.listing)}, {r.listing.area} m², {txt('floorN', { a: r.listing.fl, b: r.listing.fls })}
                </div>
                <div style="font-size:13px;color:#6f6d68;margin-top:4px">
                  {addrOf(r.listing)} · {priceOf(r.listing)} {perOf(r.listing)}
                </div>
                <div style="display:flex;gap:20px;margin-top:12px;font-size:12.5px;color:#6f6d68;flex-wrap:wrap">
                  <span>
                    {t().thLeft}: <span style={`font-weight:700;font-variant-numeric:tabular-nums;color:${r.leftFg()}`}>{r.left()}</span>
                  </span>
                  <span>
                    {t().thViews}: <span style="font-weight:700;color:#1c1b19">{r.views ?? '—'}</span>
                  </span>
                  <span>
                    {t().thFav}: <span style="font-weight:700;color:#1c1b19">{r.favorites ?? '—'}</span>
                  </span>
                  <span>
                    {t().thComp}: <span style="font-weight:700">{r.complaints() || '—'}</span>
                  </span>
                </div>
              </div>
              <div style="flex:1 1 100%;display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
                <div
                  onClick={r.act}
                  style={`flex:1 1 160px;display:flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:12px;font-size:13.5px;font-weight:700;cursor:pointer;background:${r.btnBg()};color:${r.btnFg()};border:1px solid ${r.btnBd()}`}
                >
                  {r.btnLabel()}
                </div>
                <div
                  onClick={() => editListing(r.listing.id)}
                  title={r.hasPendingRevision() ? t().editDisabledPending : ''}
                  style={`display:flex;align-items:center;gap:7px;padding:12px 16px;border-radius:12px;background:#fff;border:1px solid #d9d7d2;font-size:13px;font-weight:700;cursor:pointer;transition:transform .12s;opacity:${r.hasPendingRevision() ? 0.5 : 1}`}
                >
                  <Icon name="edit" size={15} weight={2} />
                  <span>{t().actEdit}</span>
                </div>
                <div
                  onClick={() => markRented(r.listing.id)}
                  style="display:flex;align-items:center;padding:12px 16px;border-radius:12px;border:1px solid #e8e7e4;font-size:13px;font-weight:600;color:#6f6d68;cursor:pointer"
                >
                  {t().actRented}
                </div>
                <VipAction r={r} />
              </div>
            </div>
          )}
        </For>
      </div>
    </>
  );
}
