import { For, Show, createSignal, createEffect } from 'solid-js';
import {
  state,
  setState,
  t,
  txt,
  li,
  visible,
  reload,
  resetFilters,
  activeFilterCount,
  toggleStrict,
  go,
  cityObj,
  TEAL,
  TEAL_T,
  TEAL_TX,
  INK,
  MUTED
} from '../store';
import { CITY } from '../data';
import { dealTitleKey } from '../dealTitle';
import { promotedOf } from '../vip';
import { pillStyle } from '../theme';
import ListingCard from '../components/ListingCard';
import VipCarousel from '../components/VipCarousel';
import StayPicker from '../components/StayPicker';
import Icon from '../components/Icon';

const DEALS = ['rent', 'hotel', 'sale'];
const SORTS = [
  ['fresh', 'sortFresh'],
  ['cheap', 'sortCheap'],
  ['exp', 'sortExp'],
  ['score', 'sortScore'],
  ['area', 'sortArea']
];

export default function Search() {
  const [vipOnly, setVipOnly] = createSignal(false);
  const all = () => visible();
  const vipItems = () => promotedOf(all());
  const gridSource = () => (vipOnly() ? vipItems() : all());
  const shown = () => gridSource().slice(0, state.shown);
  const openVipOnly = () => {
    setVipOnly(true);
    setState('shown', 12);
    window.scrollTo(0, 0);
  };
  const closeVipOnly = () => {
    setVipOnly(false);
    setState('shown', 12);
  };
  const titleKey = () => dealTitleKey(state.deal);
  const hotel = () => state.deal === 'hotel';
  const daily = () => state.deal === 'daily';
  const activeFilters = activeFilterCount;

  return (
    <div style="width:100%;max-width:1400px;margin:0 auto;padding:clamp(16px,3vw,26px) clamp(14px,3vw,28px) 48px">
      <div style="background:#fff;border-radius:20px;padding:clamp(14px,2vw,20px);box-shadow:0 1px 2px rgba(28,27,25,.05),0 12px 32px -24px rgba(28,27,25,.35)">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div
            class="bn-ring"
            style="flex:1 1 280px;display:flex;align-items:center;gap:11px;height:48px;padding:0 16px;border-radius:14px;background:#f7f7f6;border:1px solid transparent"
          >
            <Icon name="search" size={19} stroke="#6f6d68" />
            <label for="search-query" class="sr-only">
              {t().searchW}
            </label>
            <input
              id="search-query"
              value={state.query}
              onInput={(e) => setState({ query: e.currentTarget.value, shown: 12 })}
              placeholder={t().searchPh}
              style="flex:1;min-width:0;border:0;background:transparent;font-size:15px;padding:0"
            />
            <Show when={state.query}>
              <button
                type="button"
                class="bn-tap"
                onClick={() => setState('query', '')}
                aria-label={t().clearSearch}
                style="width:24px;height:24px;border-radius:999px;background:#e8e7e4;display:flex;align-items:center;justify-content:center;flex:0 0 auto"
              >
                <Icon name="close" size={12} stroke="#4a4844" weight={2.4} />
              </button>
            </Show>
          </div>

          <Show when={state.isMob}>
            <div class="bn-scroll-x" style="display:flex;align-items:center;gap:4px;min-height:44px;padding:4px;background:#f2f1ee;border-radius:12px;flex:1 1 100%;min-width:0;overflow-x:auto">
              <For each={DEALS}>
                {(key) => {
                  const on = () => (key === 'rent' ? state.deal === 'rent' || state.deal === 'daily' : state.deal === key);
                  let ref;
                  createEffect(() => {
                    if (on() && ref) ref.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                  });
                  return (
                    <button
                      ref={ref}
                      type="button"
                      class="bn-tap"
                      onClick={() => {
                        setState('deal', key);
                        reload();
                      }}
                      aria-pressed={on()}
                      style={`flex:1 1 auto;text-align:center;padding:13px 10px;border-radius:8px;font-size:14px;font-weight:700;white-space:nowrap;background:${on() ? '#fff' : 'transparent'};color:${on() ? INK : MUTED};box-shadow:${on() ? '0 1px 3px rgba(28,27,25,.14)' : 'none'}`}
                    >
                      {t()[key]}
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>

          <button
            type="button"
            class="bn-tap"
            onClick={() => setState({ filtersOpen: true, sortOpen: false })}
            style={`display:flex;align-items:center;justify-content:center;gap:9px;height:48px;padding:0 20px;border-radius:14px;background:#0e7c73;color:#fff;font-size:15px;font-weight:700;flex:${state.isMob ? '1 1 100%' : '0 0 auto'}`}
          >
            <Icon name="search" size={16} stroke="#fff" weight={2.2} />
            <span>{t().find}</span>
          </button>
        </div>

        <Show when={hotel() || daily()}>
          <div style="margin-top:12px">
            <StayPicker guests={hotel()} />
          </div>
        </Show>

        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;align-items:center">
          <button
            type="button"
            class="bn-tap"
            onClick={toggleStrict}
            aria-pressed={state.strict}
            style={`display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:999px;font-size:13px;font-weight:700;white-space:nowrap;background:${state.strict ? TEAL : '#fff'};color:${state.strict ? '#fff' : INK};border:1px solid ${state.strict ? TEAL : '#e8e7e4'}`}
          >
            <span
              style={`width:8px;height:8px;border-radius:999px;display:block;background:${state.strict ? '#7fded2' : '#c9c7c2'};animation:${state.strict ? 'bnPulse 2.4s infinite' : 'none'}`}
            />
            <span>{t().onlyVerified}</span>
          </button>

          <Show when={!hotel()}>
            <button
              type="button"
              class="bn-tap"
              onClick={() => {
                setState('agencies', !state.agencies);
                reload();
              }}
              aria-pressed={!state.agencies}
              style={pillStyle(!state.agencies)}
            >
              {t().noAgency}
            </button>
            <button type="button" class="bn-tap" onClick={() => setState('filtersOpen', true)} style={pillStyle(state.rooms !== 'all')}>
              {state.rooms === 'all' ? t().roomsW : state.rooms === 'studio' ? t().studio : txt('roomsN', { n: state.rooms })}
            </button>
          </Show>
          <button type="button" class="bn-tap" onClick={() => setState('filtersOpen', true)} style={pillStyle(true)}>
            {cityObj().n[li()]}
          </button>

          <button
            type="button"
            class="bn-tap"
            onClick={() => setState('filtersOpen', true)}
            style="display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:999px;font-size:13px;font-weight:700;white-space:nowrap;border:1px solid #e8e7e4;color:#1c1b19"
          >
            <Icon name="sliders" size={14} weight={1.9} />
            <span>{t().allFilters}</span>
            <Show when={activeFilters()}>
              <span style="min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#0e7c73;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">
                {activeFilters()}
              </span>
            </Show>
          </button>
        </div>
      </div>

      <Show when={!vipOnly() && vipItems().length > 0}>
        <VipCarousel items={vipItems()} onAll={openVipOnly} />
      </Show>

      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-top:26px">
        <div>
          <Show
            when={vipOnly()}
            fallback={
              <h1 style="margin:0;font-size:clamp(22px,3.2vw,28px);font-weight:800;letter-spacing:-.03em">
                {t()[titleKey()]} · {cityObj().n[li()]}
              </h1>
            }
          >
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h1 style="margin:0;font-size:clamp(22px,3.2vw,28px);font-weight:800;letter-spacing:-.03em">{t().vipTitle}</h1>
              <button
                type="button"
                class="bn-tap"
                onClick={closeVipOnly}
                style="padding:7px 14px;border-radius:999px;background:#f2f1ee;font-size:13px;font-weight:700"
              >
                {t().vipBack}
              </button>
            </div>
          </Show>
          <div style="font-size:14px;color:#6f6d68;margin-top:5px;display:flex;align-items:center;gap:8px">
            <span style="width:8px;height:8px;border-radius:999px;background:#0e7c73;display:block;animation:bnPulse 2.4s infinite" />
            <span>{vipOnly() ? t().vipSub : state.strict ? t().resSub : t().resSubLoose}</span>
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="position:relative">
            <button
              type="button"
              class="bn-tap"
              onClick={() => setState('sortOpen', !state.sortOpen)}
              aria-haspopup="listbox"
              aria-expanded={state.sortOpen}
              style="display:flex;align-items:center;gap:8px;padding:11px 15px;border-radius:12px;background:#fff;border:1px solid #e8e7e4;font-size:14px;font-weight:600;white-space:nowrap"
            >
              <span style="color:#6f6d68">{t().sort}</span>
              <span style="font-weight:700">
                {t()['sort' + { fresh: 'Fresh', cheap: 'Cheap', exp: 'Exp', score: 'Score', area: 'Area' }[state.sort]]}
              </span>
              <Icon name="down" size={13} stroke="#9a9793" weight={2.2} />
            </button>
            <Show when={state.sortOpen}>
              <div role="listbox" style="position:absolute;top:52px;right:0;z-index:40;min-width:230px;background:#fff;border-radius:14px;padding:6px;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7;animation:bnUp .16s ease both">
                <For each={SORTS}>
                  {([key, textKey]) => {
                    const on = () => state.sort === key;
                    return (
                      <button
                        type="button"
                        class="bn-tap"
                        role="option"
                        aria-selected={on()}
                        onClick={() => setState({ sort: key, sortOpen: false })}
                        style={`display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:10px;font-size:14px;width:100%;font-weight:${on() ? 700 : 600};background:${on() ? TEAL_T : 'transparent'};color:${on() ? TEAL_TX : INK}`}
                      >
                        <span style={`width:7px;height:7px;border-radius:999px;display:block;background:${on() ? TEAL : '#dedcd7'}`} />
                        <span>{t()[textKey]}</span>
                      </button>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>

          <div style="display:flex;gap:3px;padding:4px;background:#f2f1ee;border-radius:12px">
            <div style="display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:9px;background:#fff;box-shadow:0 1px 3px rgba(28,27,25,.12);font-size:14px;font-weight:700">
              <Icon name="list" size={15} stroke="#1c1b19" weight={1.9} />
              <span>{t().listW}</span>
            </div>
            <button
              type="button"
              class="bn-tap"
              onClick={() => go('map')}
              style="display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:9px;font-size:14px;font-weight:600;color:#6f6d68"
            >
              <Icon name="map" size={15} weight={1.9} />
              <span>{t().mapW}</span>
            </button>
          </div>
        </div>
      </div>

      <Show when={state.loading}>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:22px;margin-top:22px">
          <For each={[1, 2, 3, 4, 5, 6]}>
            {() => (
              <div style="background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(28,27,25,.05);animation:bnSk 1.2s ease-in-out infinite">
                <div style="height:212px;background:#eeedea" />
                <div style="padding:18px">
                  <div style="height:22px;width:52%;border-radius:7px;background:#eeedea" />
                  <div style="height:13px;width:78%;border-radius:6px;background:#f2f1ee;margin-top:14px" />
                  <div style="height:13px;width:62%;border-radius:6px;background:#f2f1ee;margin-top:9px" />
                  <div style="height:38px;border-radius:12px;background:#f4f3f0;margin-top:20px" />
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={!state.loading && gridSource().length === 0}>
        <div style="margin-top:22px;background:#fff;border-radius:20px;padding:clamp(28px,5vw,52px);text-align:center;box-shadow:0 1px 2px rgba(28,27,25,.05);animation:bnIn .2s ease">
          <div style="display:flex;align-items:center;justify-content:center;gap:12px">
            <span style="width:44px;height:44px;border-radius:14px;background:#f2f1ee;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto">
              <Icon name="search" size={21} stroke="#9a9793" weight={1.7} />
            </span>
            <div style="font-size:20px;font-weight:800;letter-spacing:-.02em">
              {vipOnly() ? t().vipEmptyTitle : t().emptyTitle}
            </div>
          </div>
          <div style="font-size:15px;color:#6f6d68;margin-top:7px;max-width:44ch;margin-left:auto;margin-right:auto;line-height:1.55">
            {vipOnly() ? t().vipEmptyText : t().emptyText}
          </div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px">
            <Show
              when={vipOnly()}
              fallback={
                <>
                  <button
                    type="button"
                    class="bn-tap"
                    onClick={resetFilters}
                    style="padding:13px 20px;border-radius:13px;background:#0e7c73;color:#fff;font-size:14px;font-weight:700"
                  >
                    {t().resetFilters}
                  </button>
                  <button
                    type="button"
                    class="bn-tap"
                    onClick={() => go('map')}
                    style="padding:13px 20px;border-radius:13px;background:#f2f1ee;font-size:14px;font-weight:700"
                  >
                    {t().mapW}
                  </button>
                </>
              }
            >
              <button
                type="button"
                class="bn-tap"
                onClick={closeVipOnly}
                style="padding:13px 20px;border-radius:13px;background:#0e7c73;color:#fff;font-size:14px;font-weight:700"
              >
                {t().vipBack}
              </button>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={!state.loading && gridSource().length > 0}>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:22px;margin-top:22px">
          <For each={shown()}>{(listing) => <ListingCard listing={listing} />}</For>
        </div>
        <Show when={gridSource().length > shown().length}>
          <button
            type="button"
            class="bn-tap"
            onClick={() => setState('shown', state.shown + 12)}
            style="margin:24px auto 0;max-width:340px;display:flex;align-items:center;justify-content:center;gap:9px;padding:15px;border-radius:14px;background:#fff;border:1px solid #e8e7e4;font-size:15px;font-weight:700"
          >
            {txt('showMore', { n: gridSource().length - shown().length })}
          </button>
        </Show>
      </Show>
    </div>
  );
}
