import { createSignal, For, Show } from 'solid-js';
import { state, setState, t, txt, li, visible, reload, resetFilters, cityK, cityObj } from '../../store';
import { CITY, FEAT } from '../../data';
import { REPAIR_CONDITIONS, REPAIR_LABELS } from '../../repairCondition';
import { pillStyle, radio, label as labelStyle, overlay, modal, TEAL, TEAL_T, TEAL_TX, INK } from '../../theme';
import Icon from '../Icon';

const DEALS = ['rent', 'daily', 'sale', 'newb', 'comm'];
const DEAL_ICON = { rent: 'home', daily: 'calendar', sale: 'doc', newb: 'building', comm: 'archive' };

const card = 'background:#fff;border:1px solid #e8e7e4;border-radius:18px;padding:18px 20px';

function SectionLabel(props) {
  return (
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:13px">
      <span style="width:24px;height:24px;border-radius:8px;background:#f2f1ee;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto">
        <Icon name={props.icon} size={13} stroke="#6f6d68" weight={2} />
      </span>
      <span style={labelStyle}>{props.children}</span>
    </div>
  );
}

function Radio(props) {
  const r = () => radio(props.on);
  return (
    <button
      type="button"
      class="bn-tap"
      aria-pressed={props.on}
      onClick={props.onClick}
      style={`display:flex;align-items:center;gap:11px;padding:12px 14px;border-radius:13px;width:100%;text-align:left;background:${r().bg};border:1px solid ${r().bd};transition:background .15s ease,border-color .15s ease`}
    >
      <span
        style={`width:17px;height:17px;border-radius:999px;border:2px solid ${r().box};flex:0 0 auto;display:flex;align-items:center;justify-content:center;transition:border-color .15s ease`}
      >
        <span style={`width:7px;height:7px;border-radius:999px;background:${r().inner};display:block;transition:background .15s ease`} />
      </span>
      <span style={`font-size:14px;font-weight:${r().w};flex:1`}>{props.label}</span>
    </button>
  );
}

const dropdownTrigger =
  'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:14px;font-weight:600;width:100%;text-align:left';
const dropdownPanel =
  'position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:40;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7;animation:bnUp .16s ease both';
const dropdownPanelScroll = 'max-height:260px;overflow-y:auto;padding:6px';

function MultiPick(props) {
  const selectedTexts = () => props.options.filter(([k]) => props.isOn(k)).map(([, text]) => text);
  const summary = () => {
    const sel = selectedTexts();
    if (sel.length === 0) return t().anyOptW;
    if (sel.length === 1) return sel[0];
    return txt('pickedNW', { n: sel.length });
  };
  return (
    <div style="position:relative">
      <button
        type="button"
        class="bn-tap"
        aria-haspopup="listbox"
        aria-expanded={props.open}
        onClick={() => props.onOpenChange(!props.open)}
        style={dropdownTrigger}
      >
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{summary()}</span>
        <Icon name="down" size={13} stroke="#9a9793" weight={2.2} />
      </button>
      <Show when={props.open}>
        <div style={dropdownPanel}>
          <div style={dropdownPanelScroll}>
            <For each={props.options}>
              {([key, text]) => {
                const on = () => props.isOn(key);
                return (
                  <button
                    type="button"
                    class="bn-tap"
                    aria-pressed={on()}
                    onClick={() => props.onToggle(key)}
                    style={`display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:10px;font-size:14px;width:100%;text-align:left;font-weight:${on() ? 700 : 600};background:${on() ? TEAL_T : 'transparent'};color:${on() ? TEAL_TX : INK}`}
                  >
                    <span
                      style={`width:16px;height:16px;border-radius:5px;border:2px solid ${on() ? TEAL : '#c9c7c2'};background:${on() ? TEAL : 'transparent'};flex:0 0 auto;display:flex;align-items:center;justify-content:center`}
                    >
                      <Show when={on()}>
                        <Icon name="check" size={10} stroke="#fff" weight={3.4} />
                      </Show>
                    </span>
                    <span>{text}</span>
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default function FiltersModal() {
  const [openPick, setOpenPick] = createSignal(null);
  const close = () => {
    setState('filtersOpen', false);
    setOpenPick(null);
    reload();
  };
  const num = (e) => {
    const v = e.currentTarget.value.replace(/[^\d]/g, '');
    e.currentTarget.value = v;
    return v;
  };
  const freshOpts = () => [
    ['f24', t().fresh24],
    ['f48', t().fresh48],
    ['f72', t().fresh72],
    ['all', t().freshAll]
  ];
  const amenOpts = () => Object.keys(FEAT).map((k) => [k, FEAT[k][li()]]);
  const repairOpts = () => REPAIR_CONDITIONS.map((k) => [k, REPAIR_LABELS[k][li()]]);

  return (
    <Show when={state.filtersOpen}>
      <div onClick={close} style={`${overlay};align-items:center;overflow:hidden`}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={`${modal('960px')};max-height:calc(100dvh - 2*clamp(12px,3vw,24px));display:flex;flex-direction:column`}
        >
          <div style="flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:22px 24px;border-bottom:1px solid #efeeec">
            <div style="flex:1;font-size:22px;font-weight:800;letter-spacing:-.03em">{t().filtersTitle}</div>
            <button
              type="button"
              class="bn-tap"
              onClick={close}
              aria-label={t().cancelW}
              style="width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:#f7f7f6"
            >
              <Icon name="close" size={15} stroke="#4a4844" weight={2} />
            </button>
          </div>

          <div style="flex:1;min-height:0;overflow-y:auto;padding:20px 24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:16px;align-items:stretch">
            <div style={`${card};grid-column:1/-1`}>
              <SectionLabel icon="home">{t().dealLbl}</SectionLabel>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <For each={DEALS}>
                  {(key) => (
                    <button
                      type="button"
                      class="bn-tap"
                      aria-pressed={state.deal === key}
                      onClick={() => {
                        setState('deal', key);
                        reload();
                      }}
                      style={`${pillStyle(state.deal === key)};display:flex;align-items:center;gap:7px`}
                    >
                      <Icon name={DEAL_ICON[key]} size={13} stroke={state.deal === key ? TEAL_TX : '#9a9793'} weight={2} />
                      {t()[key]}
                    </button>
                  )}
                </For>
              </div>
              <div style="height:1px;background:#efeeec;margin:16px 0" />
              <SectionLabel icon="user">{t().sellerTitle}</SectionLabel>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button type="button" class="bn-tap" aria-pressed={state.owners} onClick={() => setState('owners', !state.owners)} style={`${pillStyle(state.owners)};display:flex;align-items:center;gap:7px`}>
                  <Icon name="user" size={13} stroke={state.owners ? TEAL_TX : '#9a9793'} weight={2} />
                  {t().ownerW}
                </button>
                <button type="button" class="bn-tap" aria-pressed={state.agencies} onClick={() => setState('agencies', !state.agencies)} style={`${pillStyle(state.agencies)};display:flex;align-items:center;gap:7px`}>
                  <Icon name="building" size={13} stroke={state.agencies ? TEAL_TX : '#9a9793'} weight={2} />
                  {t().agencyW}
                </button>
              </div>
            </div>

            <div style={card}>
              <SectionLabel icon="pin">{t().cityTitle}</SectionLabel>
              <div style="position:relative">
                <button
                  type="button"
                  class="bn-tap"
                  aria-haspopup="listbox"
                  aria-expanded={openPick() === 'city'}
                  onClick={() => setOpenPick(openPick() === 'city' ? null : 'city')}
                  style={dropdownTrigger}
                >
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{cityObj().n[li()]}</span>
                  <Icon name="down" size={13} stroke="#9a9793" weight={2.2} />
                </button>
                <Show when={openPick() === 'city'}>
                  <div style={dropdownPanel}>
                    <div style={dropdownPanelScroll}>
                      <For each={Object.keys(CITY)}>
                        {(key) => {
                          const on = () => cityK() === key;
                          return (
                            <button
                              type="button"
                              class="bn-tap"
                              aria-pressed={on()}
                              onClick={() => {
                                setState({ city: key, bbox: null });
                                reload();
                                setOpenPick(null);
                              }}
                              style={`display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:10px;font-size:14px;width:100%;text-align:left;font-weight:${on() ? 700 : 600};background:${on() ? TEAL_T : 'transparent'};color:${on() ? TEAL_TX : INK}`}
                            >
                              <span
                                style={`width:7px;height:7px;border-radius:999px;display:block;background:${on() ? TEAL : '#dedcd7'}`}
                              />
                              <span>{CITY[key].n[li()]}</span>
                            </button>
                          );
                        }}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </div>

            <div style={card}>
              <SectionLabel icon="building">{t().roomsTitle}</SectionLabel>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <For
                  each={[
                    ['all', t().allW],
                    ['studio', t().studio],
                    ['1', '1'],
                    ['2', '2'],
                    ['3', '3+']
                  ]}
                >
                  {([key, text]) => (
                    <button
                      type="button"
                      class="bn-tap"
                      aria-pressed={state.rooms === key}
                      onClick={() => setState('rooms', key)}
                      style={pillStyle(state.rooms === key)}
                    >
                      {text}
                    </button>
                  )}
                </For>
              </div>
            </div>

            <div style={`${card};grid-column:1/-1`}>
              <SectionLabel icon="refresh">{t().freshTitle}</SectionLabel>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px">
                <For each={freshOpts()}>
                  {([key, text]) => (
                    <Radio
                      label={text}
                      on={key === 'all' ? !state.strict : state.strict && state.fresh === key}
                      onClick={() => setState({ fresh: key === 'all' ? 'f72' : key, strict: key !== 'all' })}
                    />
                  )}
                </For>
              </div>
            </div>

            <div style={card}>
              <SectionLabel icon="sliders">{t().amenTitle}</SectionLabel>
              <MultiPick
                options={amenOpts()}
                isOn={(k) => !!state.amen[k]}
                onToggle={(k) => setState('amen', k, (v) => !v)}
                open={openPick() === 'amen'}
                onOpenChange={(v) => setOpenPick(v ? 'amen' : null)}
              />
            </div>

            <div style={card}>
              <SectionLabel icon="edit">{t().kReno}</SectionLabel>
              <MultiPick
                options={repairOpts()}
                isOn={(k) => !!state.repair[k]}
                onToggle={(k) => setState('repair', k, (v) => !v)}
                open={openPick() === 'repair'}
                onOpenChange={(v) => setOpenPick(v ? 'repair' : null)}
              />
            </div>

            <div style={card}>
              <SectionLabel icon="doc">{t().priceTitle}</SectionLabel>
              <div class="bn-ring" style="display:flex;align-items:stretch;border:1px solid #e8e7e4;background:#fbfbfa;border-radius:13px;overflow:hidden">
                <input
                  value={state.priceMin}
                  onInput={(e) => setState('priceMin', num(e))}
                  placeholder={t().fromW}
                  style="flex:1;min-width:0;padding:12px 14px;border:0;background:transparent;font-size:14px"
                />
                <div style="width:1px;background:#e8e7e4" />
                <input
                  value={state.priceMax}
                  onInput={(e) => setState('priceMax', num(e))}
                  placeholder={t().toW}
                  style="flex:1;min-width:0;padding:12px 14px;border:0;background:transparent;font-size:14px"
                />
              </div>
            </div>

            <div style={card}>
              <SectionLabel icon="map">{t().areaTitle}</SectionLabel>
              <div class="bn-ring" style="display:flex;align-items:stretch;border:1px solid #e8e7e4;background:#fbfbfa;border-radius:13px;overflow:hidden">
                <input
                  value={state.areaMin}
                  onInput={(e) => setState('areaMin', num(e))}
                  placeholder={t().fromW}
                  style="flex:1;min-width:0;padding:12px 14px;border:0;background:transparent;font-size:14px"
                />
                <div style="width:1px;background:#e8e7e4" />
                <input
                  value={state.areaMax}
                  onInput={(e) => setState('areaMax', num(e))}
                  placeholder={t().toW}
                  style="flex:1;min-width:0;padding:12px 14px;border:0;background:transparent;font-size:14px"
                />
              </div>
            </div>
          </div>

          <div style="flex:0 0 auto;display:flex;gap:10px;padding:20px 24px;border-top:1px solid #efeeec;flex-wrap:wrap">
            <button
              type="button"
              class="bn-tap"
              onClick={close}
              style="flex:1;display:flex;align-items:center;justify-content:center;padding:15px 20px;border-radius:14px;background:#0e7c73;color:#fff;font-size:15px;font-weight:700"
            >
              {txt('showNLive', { n: visible().length })}
            </button>
            <button
              type="button"
              class="bn-tap"
              onClick={resetFilters}
              style="display:flex;align-items:center;padding:15px 20px;border-radius:14px;background:#f2f1ee;font-size:15px;font-weight:700"
            >
              {t().resetW}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
