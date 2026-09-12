import { For, Show } from 'solid-js';
import { state, setState, t, txt, li, editListing, markRented, openListing, addrOf, roomsLabel, priceOf, perOf } from '../../store';
import { RED_T, RED_TX, TEAL_T, TEAL_TX, INK, MUTED, label as labelStyle } from '../../theme';
import Icon from '../../components/Icon';
import Kpi from './Kpi';
import VipAction from './VipAction';
import { useCabinetRows } from './rows';

export default function AgencyView() {
  const { rows, dueLeft, activeNow } = useCabinetRows();
  const shownRows = () =>
    rows().filter((r) => (state.cabTab === 'all' ? true : state.cabTab === 'due' ? (r.isDue() || r.isFlag()) && !r.done() : r.isArch()));

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
        <Kpi label={t().kpiComp} value="2" note={t().hRow2} />
        <Kpi label={t().kpiScore} value="94%" note={t().kpiScore} bg={TEAL_T} fg={TEAL_TX} />
      </div>

      <Show when={dueLeft() > 0}>
        <div style="margin-top:20px;display:flex;gap:16px;align-items:flex-start;padding:20px 20px;border-radius:16px;background:#fceeeb">
          <Icon name="alert" size={21} stroke="#c2452f" weight={2} style="flex:0 0 auto;margin-top:4px" />
          <div style="flex:1">
            <div style="font-size:15.5px;font-weight:800;color:#93331f">{txt('attTitle', { n: dueLeft() })}</div>
            <div style="font-size:13.5px;line-height:1.5;color:#93331f;margin-top:4px">{t().attText}</div>
          </div>
        </div>
      </Show>

      <div style="display:flex;gap:8px;margin-top:24px;flex-wrap:wrap">
        <For
          each={[
            ['all', t().allW],
            ['due', t().kpiDue],
            ['archived', t().stArch]
          ]}
        >
          {([key, text]) => {
            const on = () => state.cabTab === key;
            return (
              <button
                type="button"
                class="bn-tap"
                aria-pressed={on()}
                onClick={() => setState('cabTab', key)}
                style={`padding:12px 16px;border-radius:999px;font-size:13px;font-weight:700;box-shadow:0 1px 2px rgba(28,27,25,.05);background:${on() ? INK : '#fff'};color:${on() ? '#fff' : MUTED}`}
              >
                {text}
              </button>
            );
          }}
        </For>
      </div>

      <div style="margin-top:16px;background:#fff;border-radius:18px;box-shadow:0 1px 2px rgba(28,27,25,.05);overflow:hidden">
        <div style="overflow-x:auto">
          <div style="min-width:1040px">
            <div style="display:grid;grid-template-columns:2.4fr 1.5fr 1fr .8fr .9fr 1.9fr;background:#fbfbfa;border-bottom:1px solid #f0efec;font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#6f6d68;white-space:nowrap">
              <div style="padding:16px 20px">{t().thObject}</div>
              <div style="padding:16px 20px">{t().thStatus}</div>
              <div style="padding:16px 20px">{t().thLeft}</div>
              <div style="padding:16px 20px">{t().thViews}</div>
              <div style="padding:16px 20px">{t().thComp}</div>
              <div style="padding:16px 20px">{t().thAct}</div>
            </div>

            <For each={shownRows()}>
              {(r) => (
                <div
                  style={`display:grid;grid-template-columns:2.4fr 1.5fr 1fr .8fr .9fr 1.9fr;border-bottom:1px solid #f4f3f0;align-items:center;background:${r.isDue() || r.isFlag() ? '#fffaf9' : '#fff'}`}
                >
                  <button type="button" onClick={() => openListing(r.listing.id)} style="padding:16px 20px;text-align:left">
                    <div style="font-size:14.5px;font-weight:700">
                      {roomsLabel(r.listing)}, {r.listing.area} m², {txt('floorN', { a: r.listing.fl, b: r.listing.fls })}
                    </div>
                    <div style="font-size:12.5px;color:#6f6d68;margin-top:4px">
                      {addrOf(r.listing)} · {priceOf(r.listing)} {perOf(r.listing)}
                    </div>
                  </button>
                  <div style="padding:16px 20px">
                    <span
                      style={`display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;font-size:11.5px;font-weight:700;white-space:nowrap;background:${r.chipBg()};color:${r.chipFg()}`}
                    >
                      {r.chipText()}
                    </span>
                  </div>
                  <div style={`padding:16px 20px;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;color:${r.leftFg()}`}>
                    {r.left()}
                  </div>
                  <div style="padding:16px 20px;font-size:14px;font-variant-numeric:tabular-nums">{r.views}</div>
                  <div style="padding:16px 20px;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums">
                    {r.complaints() || '—'}
                  </div>
                  <div style="padding:12px 20px;display:flex;gap:8px;flex-wrap:wrap">
                    <button
                      type="button"
                      class="bn-tap"
                      onClick={r.act}
                      style={`display:inline-flex;align-items:center;padding:12px 16px;border-radius:11px;font-size:12.5px;font-weight:700;white-space:nowrap;background:${r.btnBg()};color:${r.btnFg()};border:1px solid ${r.btnBd()}`}
                    >
                      {r.btnLabel()}
                    </button>
                    <button
                      type="button"
                      class="bn-tap"
                      onClick={() => editListing(r.listing.id)}
                      style="display:inline-flex;align-items:center;gap:6px;padding:12px 12px;border-radius:11px;background:#fff;border:1px solid #d9d7d2;font-size:12.5px;font-weight:700"
                    >
                      <Icon name="edit" size={14} weight={2} />
                      <span>{t().actEdit}</span>
                    </button>
                    <button
                      type="button"
                      class="bn-tap"
                      onClick={() => markRented(r.listing.id)}
                      style="display:inline-flex;align-items:center;padding:12px 12px;border-radius:11px;border:1px solid #e8e7e4;font-size:12.5px;font-weight:600;color:#6f6d68"
                    >
                      {t().actRented}
                    </button>
                    <VipAction r={r} compact />
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>

      <div style="margin-top:24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:16px">
        <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
          <div style={labelStyle}>{t().honestyTitle}</div>
          <div style="display:flex;align-items:baseline;gap:12px;margin-top:12px;flex-wrap:wrap">
            <span style="font-size:40px;font-weight:800;letter-spacing:-.035em">94%</span>
            <span style="font-size:13px;color:#6f6d68;font-weight:600">{txt('honestyAbove', { n: 78 })}</span>
          </div>
          <div style="margin-top:16px;height:9px;border-radius:999px;background:#f2f1ee;overflow:hidden">
            <div style="width:94%;height:100%;border-radius:999px;background:#0e7c73" />
          </div>
          <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;font-size:13.5px">
            <div style="display:flex;justify-content:space-between;gap:12px">
              <span style="color:#6f6d68">{t().hRow1}</span>
              <span style="font-weight:700">126 / 134</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:12px">
              <span style="color:#6f6d68">{t().hRow2}</span>
              <span style="font-weight:700">2</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:12px">
              <span style="color:#6f6d68">{t().hRow3}</span>
              <span style="font-weight:700">31 / 33</span>
            </div>
          </div>
        </div>

        <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
          <div style={labelStyle}>{t().teamTitle}</div>
          <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
            <For
              each={[
                ['ԱՀ', ['Անի Հ.', 'Ани А.', 'Ani H.'], '6 · 98%'],
                ['ԴՊ', ['Դավիթ Պ.', 'Давид П.', 'Davit P.'], '5 · 94%'],
                ['ՄՔ', ['Մարիամ Ք.', 'Мариам К.', 'Mariam K.'], '3 · 91%']
              ]}
            >
              {([ini, name, note]) => (
                <div style="display:flex;align-items:center;gap:12px">
                  <span style="width:32px;height:32px;border-radius:999px;background:#e8f4f2;color:#0a5f59;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">
                    {ini}
                  </span>
                  <span style="flex:1;font-size:14px;font-weight:600">{name[li()]}</span>
                  <span style="font-size:12.5px;color:#6f6d68;font-variant-numeric:tabular-nums">{note}</span>
                </div>
              )}
            </For>
          </div>
          <div style="margin-top:16px;font-size:12.5px;color:#6f6d68;line-height:1.5">{t().teamNote}</div>
        </div>
      </div>
    </>
  );
}
