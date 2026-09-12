import { For } from 'solid-js';
import { state, setState, t, txt, byId, cardOf, statusOf, threadsAll, saveSearch, reload, openListing } from '../../store';
import { TEAL_T, TEAL_TX, SOFT, FAINT } from '../../theme';
import PhotoSlot from '../../components/PhotoSlot';
import Kpi from './Kpi';

export default function TenantView() {
  const favItems = () => Object.keys(state.favs).map(byId).filter(Boolean);

  return (
    <>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:16px;margin-top:24px">
        <Kpi label={t().kpiSaved} value={String(favItems().length)} note={t().favs} />
        <Kpi label={t().kpiChats} value={String(Object.keys(threadsAll()).length)} note={t().messages} />
        <Kpi
          label={t().kpiReports}
          value={String(Object.keys(state.flagged).filter((k) => state.flagged[k]).length)}
          note={t().moderation}
        />
      </div>

      <div style="margin-top:20px;background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="flex:1 1 240px">
            <div style="font-size:15.5px;font-weight:800">{t().savedSearchT}</div>
            <div style="font-size:13px;color:#6f6d68;margin-top:4px">{t().favSub}</div>
          </div>
          <div
            onClick={saveSearch}
            style="padding:12px 16px;border-radius:12px;background:#f2f1ee;font-size:13.5px;font-weight:700;cursor:pointer"
          >
            {t().saveSearch}
          </div>
        </div>
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
          <For each={state.savedSearches}>
            {(q, i) => (
              <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:13px;background:#f7f7f6">
                <span style="flex:1;font-size:14px;font-weight:600">{q.label}</span>
                <span
                  onClick={() => {
                    setState({ deal: q.deal, city: q.city, rooms: q.rooms, priceMax: q.priceMax, screen: 'search' });
                    reload();
                  }}
                  style="font-size:13px;font-weight:700;color:#0e7c73;cursor:pointer"
                >
                  {t().applyW}
                </span>
                <span
                  onClick={() => setState('savedSearches', (list) => list.filter((_, j) => j !== i()))}
                  style="font-size:13px;color:#9a9793;cursor:pointer"
                >
                  {t().removeW}
                </span>
              </div>
            )}
          </For>
        </div>
      </div>

      <div style="margin-top:20px;display:flex;flex-direction:column;gap:12px">
        <For each={favItems()}>
          {(l) => {
            const c = () => cardOf(l);
            const archived = () => ['archived', 'flagged'].includes(statusOf(l));
            return (
              <div
                style={`display:flex;gap:16px;padding:16px;border-radius:18px;background:#fff;box-shadow:0 1px 2px rgba(28,27,25,.05);flex-wrap:wrap;align-items:center;opacity:${archived() ? 0.62 : 1}`}
              >
                <div style="flex:0 0 120px;height:88px;border-radius:12px;overflow:hidden;background:#f2f1ee;position:relative">
                  <PhotoSlot id={c().slot} label={c().addr} src={c().photo} />
                </div>
                <div onClick={() => openListing(l.id)} style="flex:1 1 220px;min-width:0;cursor:pointer">
                  <div style="font-size:19px;font-weight:800;letter-spacing:-.02em">{c().price}</div>
                  <div style="font-size:14px;font-weight:700;margin-top:4px">{c().title}</div>
                  <div style="font-size:12.5px;color:#6f6d68;margin-top:4px">{c().addr}</div>
                </div>
                <span
                  style={`display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;font-size:11.5px;font-weight:700;background:${archived() ? SOFT : TEAL_T};color:${archived() ? FAINT : TEAL_TX}`}
                >
                  {archived() ? t().archChip : t().inFeedChip}
                </span>
              </div>
            );
          }}
        </For>
      </div>
    </>
  );
}
