import { createSignal, For, Show } from 'solid-js';
import { state, setState, t, txt, li, visible, reload, resetFilters, cityK, cityObj } from '../../store';
import { CITY, FEAT } from '../../data';
import { REPAIR_CONDITIONS, REPAIR_LABELS } from '../../repairCondition';
import { pillStyle, radio, label as labelStyle, overlay, modal, TEAL, TEAL_T, TEAL_TX, INK } from '../../theme';
import Icon from '../Icon';

const DEALS = ['rent', 'daily', 'sale', 'newb', 'comm'];

function Radio(props) {
  const r = () => radio(props.on);
  return (
    <button
      type="button"
      class="bn-tap"
      aria-pressed={props.on}
      onClick={props.onClick}
      style={`display:flex;align-items:center;gap:11px;padding:12px 14px;border-radius:13px;width:100%;text-align:left;background:${r().bg};border:1px solid ${r().bd}`}
    >
      <span
        style={`width:17px;height:17px;border-radius:999px;border:2px solid ${r().box};flex:0 0 auto;display:flex;align-items:center;justify-content:center`}
      >
        <span style={`width:7px;height:7px;border-radius:999px;background:${r().inner};display:block`} />
      </span>
      <span style={`font-size:13.5px;font-weight:${r().w};flex:1`}>{props.label}</span>
    </button>
  );
}

const dropdownTrigger =
  'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:13.5px;font-weight:600;width:100%;text-align:left';
const dropdownPanel =
  'position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:40;max-height:260px;overflow-y:auto;background:#fff;border-radius:14px;padding:6px;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7;animation:bnUp .16s ease both';

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
          <For each={props.options}>
            {([key, text]) => {
              const on = () => props.isOn(key);
              return (
                <button
                  type="button"
                  class="bn-tap"
                  aria-pressed={on()}
                  onClick={() => props.onToggle(key)}
                  style={`display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:10px;font-size:13.5px;width:100%;text-align:left;font-weight:${on() ? 700 : 600};background:${on() ? TEAL_T : 'transparent'};color:${on() ? TEAL_TX : INK}`}
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
      <div onClick={close} style={`${overlay};align-items:flex-start`}>
        <div onClick={(e) => e.stopPropagation()} style={`${modal('960px')};margin:2vh 0`}>
          <div style="display:flex;align-items:center;gap:12px;padding:22px 24px 0">
            <div style="flex:1;font-size:23px;font-weight:800;letter-spacing:-.03em">{t().filtersTitle}</div>
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

          <div style="padding:20px 24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:24px;align-items:start">
            <div style="display:flex;flex-direction:column;gap:20px">
              <div>
                <div style={`${labelStyle};margin-bottom:11px`}>{t().dealLbl}</div>
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
                        style={pillStyle(state.deal === key)}
                      >
                        {t()[key]}
                      </button>
                    )}
                  </For>
                </div>
              </div>
              <div>
                <div style={`${labelStyle};margin-bottom:11px`}>{t().freshTitle}</div>
                <div style="display:flex;flex-direction:column;gap:8px">
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
            </div>

            <div style="display:flex;flex-direction:column;gap:20px">
              <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px">
                <div style="position:relative">
                  <div style={`${labelStyle};margin-bottom:11px`}>{t().cityTitle}</div>
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
                              style={`display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:10px;font-size:13.5px;width:100%;text-align:left;font-weight:${on() ? 700 : 600};background:${on() ? TEAL_T : 'transparent'};color:${on() ? TEAL_TX : INK}`}
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
                  </Show>
                </div>
                <div>
                  <div style={`${labelStyle};margin-bottom:11px`}>{t().roomsTitle}</div>
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
              </div>
              <div>
                <div style={`${labelStyle};margin-bottom:11px`}>{t().sellerTitle}</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  <button type="button" class="bn-tap" aria-pressed={state.owners} onClick={() => setState('owners', !state.owners)} style={pillStyle(state.owners)}>
                    {t().ownerW}
                  </button>
                  <button type="button" class="bn-tap" aria-pressed={state.agencies} onClick={() => setState('agencies', !state.agencies)} style={pillStyle(state.agencies)}>
                    {t().agencyW}
                  </button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px">
                <div>
                  <div style={`${labelStyle};margin-bottom:11px`}>{t().amenTitle}</div>
                  <MultiPick
                    options={amenOpts()}
                    isOn={(k) => !!state.amen[k]}
                    onToggle={(k) => setState('amen', k, (v) => !v)}
                    open={openPick() === 'amen'}
                    onOpenChange={(v) => setOpenPick(v ? 'amen' : null)}
                  />
                </div>
                <div>
                  <div style={`${labelStyle};margin-bottom:11px`}>{t().kReno}</div>
                  <MultiPick
                    options={repairOpts()}
                    isOn={(k) => !!state.repair[k]}
                    onToggle={(k) => setState('repair', k, (v) => !v)}
                    open={openPick() === 'repair'}
                    onOpenChange={(v) => setOpenPick(v ? 'repair' : null)}
                  />
                </div>
              </div>
              <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px">
                <div>
                  <div style={`${labelStyle};margin-bottom:11px`}>{t().priceTitle}</div>
                  <div style="display:flex;gap:9px">
                    <input
                      value={state.priceMin}
                      onInput={(e) => setState('priceMin', num(e))}
                      placeholder={t().fromW}
                      style="flex:1;min-width:0;padding:12px 14px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:13.5px"
                    />
                    <input
                      value={state.priceMax}
                      onInput={(e) => setState('priceMax', num(e))}
                      placeholder={t().toW}
                      style="flex:1;min-width:0;padding:12px 14px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:13.5px"
                    />
                  </div>
                </div>
                <div>
                  <div style={`${labelStyle};margin-bottom:11px`}>{t().areaTitle}</div>
                  <div style="display:flex;gap:9px">
                    <input
                      value={state.areaMin}
                      onInput={(e) => setState('areaMin', num(e))}
                      placeholder={t().fromW}
                      style="flex:1;min-width:0;padding:12px 14px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:13.5px"
                    />
                    <input
                      value={state.areaMax}
                      onInput={(e) => setState('areaMax', num(e))}
                      placeholder={t().toW}
                      style="flex:1;min-width:0;padding:12px 14px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:13.5px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:10px;padding:0 24px 24px;flex-wrap:wrap">
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
