import { createSignal, For, Show, onCleanup, onMount } from 'solid-js';
import {
  state,
  setState,
  t,
  txt,
  li,
  postState,
  setPost,
  say,
  publishListing,
  byId,
  STAY_KINDS,
  stayKindLabel,
  addressSuggestions
} from '../store';
import { CITY, DIST, FEAT, nf } from '../data';
import { pillStyle, label as labelStyle, input as inputStyle, TEAL, TEAL_T, TEAL_TX, INK, RED } from '../theme';
import MediaShelf from '../components/MediaShelf';
import Icon from '../components/Icon';
import InfoTooltip from '../components/InfoTooltip';
import TimeField from '../components/TimeField';
import StarRating from '../components/StarRating';
import { documentFile, setDocumentFile, validateDocumentFile, formatFileSize } from '../documentUpload';
import { postStepErrorKeys, MAX_STREET_LEN, MAX_DESC_LEN, MAX_AREA, MAX_FLOORS_TOTAL } from '../postValidation';
import { REPAIR_CONDITIONS, REPAIR_LABELS, REPAIR_HINTS } from '../repairCondition';

const FIELD_BY_ERR = {
  errHotelRequired: 'title',
  errStreet: 'street',
  errStreetTooLong: 'street',
  errArea: 'area',
  errAreaRange: 'area',
  errFloor: 'fl',
  errFloorExceeds: 'fl',
  errFloorsTotal: 'fls',
  errDescTooLong: 'desc',
  errPrice: 'price'
};

const DOC_ERR_KEY = { missing: 'errDoc', type: 'errDocType', size: 'errDocSize' };

const STEPS = [
  ['1', 'st1'],
  ['2', 'st2'],
  ['3', 'st3'],
  ['4', 'st4']
];

const DEALS = ['rent', 'daily', 'sale', 'newb', 'comm', 'hotel'];

export default function Post() {
  const p = () => postState();
  const hotel = () => p().deal === 'hotel';
  const deals = () =>
    p().editId
      ? DEALS.filter((key) => (key === 'hotel') === hotel())
      : DEALS.filter((key) => key !== 'hotel' || (state.user && state.user.role === 'hotel'));
  const [cityOpen, setCityOpen] = createSignal(false);
  const [addrSuggestions, setAddrSuggestions] = createSignal([]);
  const [addrOpen, setAddrOpen] = createSignal(false);
  let addrWrapRef;
  let addrTimer;
  const onStreetInput = (value) => {
    clearErr('street');
    setPost({ street: value });
    clearTimeout(addrTimer);
    addrTimer = setTimeout(async () => {
      const list = await addressSuggestions(p().city, p().dist, value);
      setAddrSuggestions(list);
      setAddrOpen(list.length > 0);
    }, 400);
  };
  const pickAddrSuggestion = (s) => {
    clearTimeout(addrTimer);
    clearErr('street');
    setPost({ street: s.street });
    setAddrOpen(false);
  };
  onMount(() => {
    const onDocClick = (e) => {
      if (addrWrapRef && !addrWrapRef.contains(e.target)) setAddrOpen(false);
    };
    document.addEventListener('click', onDocClick);
    onCleanup(() => {
      document.removeEventListener('click', onDocClick);
      clearTimeout(addrTimer);
    });
  });
  const [media, setMedia] = createSignal([]);
  const setMediaFiles = (next) => {
    setMedia(next);
    setPost({ photos: next.filter((f) => f.kind === 'image').length });
  };
  const price = () => parseInt(String(p().price).replace(/\s/g, ''), 10) || 0;
  const mainPhotoUrl = () =>
    p().editId ? ((byId(p().editId) || {}).photos || [])[0] : (media().find((f) => f.kind === 'image') || {}).url;
  let docInput;

  const [errFields, setErrFields] = createSignal([]);
  const hasErr = (name) => errFields().includes(name);
  const clearErr = (name) => {
    if (hasErr(name)) setErrFields((f) => f.filter((x) => x !== name));
  };
  const errStyle = (name) => (hasErr(name) ? `${inputStyle};border-color:${RED}` : inputStyle);

  let titleRef, streetRef, areaRef, flRef, flsRef, descRef, priceRef;
  const fieldRef = {
    title: () => titleRef,
    street: () => streetRef,
    area: () => areaRef,
    fl: () => flRef,
    fls: () => flsRef,
    desc: () => descRef,
    price: () => priceRef
  };

  const fieldMessage = (key) => txt(key);

  const valid = (step) => {
    const keys = postStepErrorKeys(step, p());
    if (!keys.length) {
      setErrFields([]);
      return true;
    }
    setErrFields(keys.map((k) => FIELD_BY_ERR[k]).filter(Boolean));
    say([...new Set(keys.map(fieldMessage))].join(' · '));
    const ref = fieldRef[FIELD_BY_ERR[keys[0]]];
    ref && ref()?.focus();
    return false;
  };

  const next = () => {
    if (!valid(p().step)) return;
    if (p().step === 4) {
      const photos = media()
        .filter((f) => f.kind === 'image')
        .map((f) => f.file);
      const videos = media()
        .filter((f) => f.kind === 'video')
        .map((f) => f.file);
      publishListing(photos, videos);
    } else {
      setPost({ step: p().step + 1 });
    }
  };

  const digitsOnly = (e) => {
    const raw = e.currentTarget.value;
    const v = raw.replace(/\D/g, '');
    if (raw.includes('-') && v) say(txt('errNoNegative'));
    e.currentTarget.value = v;
    return v;
  };

  return (
    <div style="width:100%;max-width:1100px;margin:0 auto;padding:32px clamp(16px,3vw,28px) 48px;animation:bnIn .2s ease">
      <button
        type="button"
        class="bn-tap"
        onClick={() => setState({ post: null, screen: 'cabinet' })}
        style="display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#6f6d68;margin-bottom:16px"
      >
        <Icon name="back" size={15} weight={2.2} />
        <span>{t().backW}</span>
      </button>

      <h1 style="margin:0 0 8px;font-size:clamp(24px,4vw,30px);font-weight:800;letter-spacing:-.03em">{t().postTitle}</h1>
      <div style="font-size:15px;color:#6f6d68;max-width:64ch">{t().postSub}</div>

      <div style="display:flex;gap:8px;margin:24px 0 28px;flex-wrap:wrap">
        <For each={STEPS}>
          {([n, key]) => {
            const on = () => p().step === +n;
            const done = () => p().step > +n;
            return (
              <button
                type="button"
                class="bn-tap"
                aria-current={on() ? 'step' : undefined}
                onClick={() => {
                  if (+n <= p().step || valid(p().step)) setPost({ step: +n });
                }}
                style={`flex:1 1 170px;padding:16px 16px;border-radius:14px;background:${on() ? '#0e7c73' : done() ? '#e8f4f2' : '#fff'};color:${on() ? '#fff' : done() ? '#0a5f59' : '#6f6d68'};box-shadow:${on() ? '0 8px 20px -12px rgba(14,124,115,.7)' : '0 1px 2px rgba(28,27,25,.05)'}`}
              >
                <div style="font-size:11px;font-weight:700;letter-spacing:.08em;opacity:.7">
                  {t().stepW} {n}
                </div>
                <div style="font-size:14px;font-weight:700;margin-top:4px">{t()[key]}</div>
              </button>
            );
          }}
        </For>
      </div>

      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
        <div style="flex:999 1 420px;min-width:280px">
          <Show when={p().step === 1}>
            <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05);animation:bnIn .18s ease">
              <div style={labelStyle}>{t().dealLbl}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                <For each={deals()}>
                  {(key) => (
                    <button
                      type="button"
                      class="bn-tap"
                      aria-pressed={p().deal === key}
                      onClick={() => setPost({ deal: key })}
                      style={pillStyle(p().deal === key)}
                    >
                      {key === 'hotel' ? t().vHotel : t()[key]}
                    </button>
                  )}
                </For>
              </div>

              <Show when={hotel()}>
                <div style="animation:bnUp .2s ease both">
                  <div style={`${labelStyle};margin-top:24px`}>{t().stayKindLbl}</div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                    <For each={STAY_KINDS}>
                      {(key) => (
                        <button
                          type="button"
                          class="bn-tap"
                          aria-pressed={p().stayKind === key}
                          onClick={() => setPost({ stayKind: key })}
                          style={pillStyle(p().stayKind === key)}
                        >
                          {stayKindLabel(key)}
                        </button>
                      )}
                    </For>
                  </div>
                  <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:24px 0 8px">{t().hotelNameLbl}</div>
                  <input
                    ref={(el) => (titleRef = el)}
                    value={p().title}
                    onInput={(e) => {
                      clearErr('title');
                      setPost({ title: e.currentTarget.value });
                    }}
                    placeholder={t().hotelNamePh}
                    maxLength={80}
                    aria-invalid={hasErr('title')}
                    style={`${errStyle('title')};font-weight:700`}
                  />
                  <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:24px 0 8px">{t().starsLbl}</div>
                  <StarRating value={p().stars} onChange={(n) => setPost({ stars: n })} />
                </div>
              </Show>

              <div style={`${labelStyle};margin-top:24px`}>{t().cityLbl}</div>
              <div style="position:relative;max-width:320px;margin-top:12px">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={cityOpen()}
                  onClick={() => setCityOpen(!cityOpen())}
                  style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:14px;font-weight:600"
                >
                  <span>{CITY[p().city].n[li()]}</span>
                  <Icon name="down" size={13} stroke="#9a9793" weight={2.2} />
                </button>
                <Show when={cityOpen()}>
                  <div
                    role="listbox"
                    style="position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:40;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7;animation:bnUp .16s ease both"
                  >
                    <div style="max-height:260px;overflow-y:auto;padding:6px">
                      <For each={Object.keys(CITY)}>
                        {(key) => {
                          const on = () => p().city === key;
                          return (
                            <button
                              type="button"
                              class="bn-tap"
                              role="option"
                              aria-selected={on()}
                              onClick={() => {
                                setPost({ city: key });
                                setCityOpen(false);
                              }}
                              style={`width:100%;display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:10px;font-size:14px;font-weight:${on() ? 700 : 600};background:${on() ? TEAL_T : 'transparent'};color:${on() ? TEAL_TX : INK}`}
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

              <div style={`${labelStyle};margin-top:24px`}>{t().distLbl}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                <For each={Object.keys(DIST).filter((k) => k !== 'center')}>
                  {(key) => (
                    <button
                      type="button"
                      class="bn-tap"
                      aria-pressed={p().dist === key}
                      onClick={() => setPost({ dist: key })}
                      style={pillStyle(p().dist === key)}
                    >
                      {DIST[key][li()]}
                    </button>
                  )}
                </For>
              </div>

              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:16px;margin-top:24px">
                <div ref={addrWrapRef} style="position:relative">
                  <div style="font-size:13px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().streetLbl}</div>
                  <input
                    ref={(el) => (streetRef = el)}
                    value={p().street}
                    onInput={(e) => onStreetInput(e.currentTarget.value)}
                    onFocus={() => setAddrOpen(addrSuggestions().length > 0)}
                    placeholder={t().streetPh}
                    maxLength={MAX_STREET_LEN}
                    aria-invalid={hasErr('street')}
                    autocomplete="off"
                    style={errStyle('street')}
                  />
                  <Show when={addrOpen()}>
                    <div
                      role="listbox"
                      style="position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:40;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7;animation:bnUp .16s ease both;max-height:260px;overflow-y:auto"
                    >
                      <For each={addrSuggestions()}>
                        {(s) => (
                          <button
                            type="button"
                            class="bn-tap"
                            role="option"
                            onClick={() => pickAddrSuggestion(s)}
                            style="width:100%;text-align:left;display:flex;align-items:center;gap:9px;padding:11px 14px;font-size:14px;font-weight:600"
                          >
                            <Icon name="pin" size={14} stroke="#9a9793" style="flex:0 0 auto" />
                            <span>{s.full}</span>
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
                <div>
                  <div style="font-size:13px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().postPhoneLbl}</div>
                  <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:13px;border:1px solid #e8e7e4;background:#f2f1ee">
                    <span style="font-size:15px;font-weight:700;color:#4a4844">{(state.user && state.user.phone) || ''}</span>
                  </div>
                  <div style="font-size:12px;color:#9a9793;margin-top:8px;line-height:1.45">{t().postPhoneNote}</div>
                </div>
              </div>
            </div>
          </Show>

          <Show when={p().step === 2}>
            <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05);animation:bnIn .18s ease">
              <Show when={hotel()}>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:16px;margin-bottom:24px">
                  <TimeField value={p().checkInTime} onChange={(v) => setPost({ checkInTime: v })} label={t().checkInTimeLbl} />
                  <TimeField value={p().checkOutTime} onChange={(v) => setPost({ checkOutTime: v })} label={t().checkOutTimeLbl} />
                </div>
              </Show>
              <Show when={!hotel()}>
                <div style={labelStyle}>{t().roomsLbl}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                  <For
                    each={[
                      ['0', t().studio],
                      ['1', '1'],
                      ['2', '2'],
                      ['3', '3'],
                      ['4', '4+']
                    ]}
                  >
                    {([key, text]) => (
                      <button
                        type="button"
                        class="bn-tap"
                        aria-pressed={String(p().rooms) === key}
                        onClick={() => setPost({ rooms: +key })}
                        style={pillStyle(String(p().rooms) === key)}
                      >
                        {text}
                      </button>
                    )}
                  </For>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:16px;margin-top:24px">
                  <div>
                    <div style="font-size:13px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().areaLbl}</div>
                    <input
                      ref={(el) => (areaRef = el)}
                      type="number"
                      inputmode="numeric"
                      min="1"
                      max={MAX_AREA}
                      step="1"
                      value={p().area}
                      onInput={(e) => {
                        clearErr('area');
                        setPost({ area: digitsOnly(e) });
                      }}
                      placeholder="62"
                      aria-invalid={hasErr('area')}
                      style={errStyle('area')}
                    />
                  </div>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().floorLbl}</div>
                    <input
                      ref={(el) => (flRef = el)}
                      type="number"
                      inputmode="numeric"
                      min="1"
                      max={MAX_FLOORS_TOTAL}
                      step="1"
                      value={p().fl}
                      onInput={(e) => {
                        clearErr('fl');
                        setPost({ fl: digitsOnly(e) });
                      }}
                      placeholder="4"
                      aria-invalid={hasErr('fl')}
                      style={errStyle('fl')}
                    />
                  </div>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().floorsLbl}</div>
                    <input
                      ref={(el) => (flsRef = el)}
                      type="number"
                      inputmode="numeric"
                      min="1"
                      max={MAX_FLOORS_TOTAL}
                      step="1"
                      value={p().fls}
                      onInput={(e) => {
                        clearErr('fls');
                        setPost({ fls: digitsOnly(e) });
                      }}
                      placeholder="9"
                      aria-invalid={hasErr('fls')}
                      style={errStyle('fls')}
                    />
                  </div>
                </div>
              </Show>

              <div style={`${labelStyle};margin-top:${hotel() ? 0 : 24}px`}>{t().featLbl}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                <For each={Object.keys(FEAT)}>
                  {(key) => (
                    <button
                      type="button"
                      class="bn-tap"
                      aria-pressed={!!p().feats[key]}
                      onClick={() => setPost({ feats: { ...p().feats, [key]: !p().feats[key] } })}
                      style={pillStyle(!!p().feats[key])}
                    >
                      {FEAT[key][li()]}
                    </button>
                  )}
                </For>
              </div>

              <Show when={!hotel()}>
                <div style={`${labelStyle};margin-top:24px;display:flex;align-items:center`}>
                  <span>{t().kReno}</span>
                  <InfoTooltip label={t().repairInfoLabel}>
                    <div style="display:flex;flex-direction:column;gap:8px">
                      <For each={REPAIR_CONDITIONS}>
                        {(key) => (
                          <div>
                            <div style="font-weight:700">{REPAIR_LABELS[key][li()]}</div>
                            <div style="opacity:.82;margin-top:2px">{REPAIR_HINTS[key][li()]}</div>
                          </div>
                        )}
                      </For>
                    </div>
                  </InfoTooltip>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                  <For each={REPAIR_CONDITIONS}>
                    {(key) => (
                      <button
                        type="button"
                        class="bn-tap"
                        aria-pressed={p().repair === key}
                        onClick={() => setPost({ repair: key })}
                        style={pillStyle(p().repair === key)}
                      >
                        {REPAIR_LABELS[key][li()]}
                      </button>
                    )}
                  </For>
                </div>
              </Show>

              <div style={`${labelStyle};margin-top:24px`}>{t().photosLbl}</div>
              <Show
                when={!p().editId}
                fallback={
                  <>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(140px,100%),1fr));gap:12px;margin-top:12px">
                      <For each={(byId(p().editId) || {}).photos || []}>
                        {(url) => (
                          <div style="height:96px;border-radius:12px;overflow:hidden;background:#f2f1ee">
                            <img src={url} alt="" style="width:100%;height:100%;object-fit:cover" />
                          </div>
                        )}
                      </For>
                      <For each={(byId(p().editId) || {}).videos || []}>
                        {(url) => (
                          <div style="height:96px;border-radius:12px;overflow:hidden;background:#000">
                            <video src={url} muted style="width:100%;height:100%;object-fit:cover" />
                          </div>
                        )}
                      </For>
                    </div>
                    <div style="font-size:12px;color:#9a9793;margin-top:12px">{t().editPhotosLocked}</div>
                  </>
                }
              >
                <div style="margin-top:12px">
                  <MediaShelf files={media()} onFiles={setMediaFiles} />
                </div>
                <div style="font-size:12px;color:#9a9793;margin-top:12px">{t().photosNote}</div>
              </Show>

              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:24px 0 8px">
                <div style="font-size:13px;font-weight:600;color:#6f6d68">{t().descLbl}</div>
                <div style={`font-size:12px;font-weight:600;color:${(p().desc || '').length > MAX_DESC_LEN ? RED : '#9a9793'}`}>
                  {(p().desc || '').length}/{MAX_DESC_LEN}
                </div>
              </div>
              <textarea
                ref={(el) => (descRef = el)}
                value={p().desc}
                onInput={(e) => {
                  clearErr('desc');
                  setPost({ desc: e.currentTarget.value });
                }}
                placeholder={t().descPh}
                maxLength={MAX_DESC_LEN}
                aria-invalid={hasErr('desc')}
                style={`width:100%;min-height:96px;padding:12px 16px;border-radius:13px;border:1px solid ${hasErr('desc') ? RED : '#e8e7e4'};background:#fbfbfa;font-size:15px;resize:vertical`}
              />
            </div>
          </Show>

          <Show when={p().step === 3}>
            <div style="animation:bnIn .18s ease">
              <Show when={hotel()}>
                <div style={`display:flex;gap:16px;align-items:center;padding:24px;border-radius:18px;background:${TEAL_T}`}>
                  <span style="width:44px;height:44px;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                    <Icon name="building" size={20} stroke={TEAL} weight={1.9} />
                  </span>
                  <div style={`font-size:15px;line-height:1.55;color:${TEAL_TX};font-weight:600`}>{t().hotelRoomsLater}</div>
                </div>
              </Show>
              <Show when={!hotel()}>
                <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
                  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:16px">
                    <div>
                      <div style="font-size:13px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().priceLbl}</div>
                      <input
                        ref={(el) => (priceRef = el)}
                        value={p().price}
                        onInput={(e) => {
                          clearErr('price');
                          setPost({ price: digitsOnly(e) });
                        }}
                        placeholder="380000"
                        aria-invalid={hasErr('price')}
                        style={`${errStyle('price')};font-weight:700`}
                      />
                    </div>
                    <div>
                      <div style="font-size:13px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().depositLbl}</div>
                      <input value={p().dep} onInput={(e) => setPost({ dep: e.currentTarget.value })} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          <Show when={p().step === 4}>
            <div style="animation:bnIn .18s ease">
              <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
                <h3 style="margin:0 0 8px;font-size:18px;font-weight:800;letter-spacing:-.01em">{t().docTitle}</h3>
                <div style="font-size:14px;color:#4a4844;line-height:1.55">{hotel() ? t().hotelDocNote : t().docNote}</div>
                <input
                  ref={docInput}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  style="display:none"
                  onChange={(e) => {
                    const file = e.currentTarget.files[0];
                    const err = validateDocumentFile(file);
                    e.currentTarget.value = '';
                    if (err) {
                      say(txt(DOC_ERR_KEY[err]));
                      return;
                    }
                    setDocumentFile(file);
                    setPost({ doc: true });
                  }}
                />
                <button
                  type="button"
                  class="bn-tap"
                  onClick={() => docInput.click()}
                  style={`margin-top:16px;display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:13px;font-size:14px;font-weight:700;background:${p().doc ? '#e8f4f2' : '#0e7c73'};color:${p().doc ? '#0a5f59' : '#fff'}`}
                >
                  <Icon name="upload" size={15} weight={2.2} />
                  <span>
                    {documentFile()
                      ? documentFile().name + ' · ' + formatFileSize(documentFile().size)
                      : p().doc
                        ? t().docOk
                        : t().uploadDoc}
                  </span>
                </button>

                <Show when={!hotel()}>
                  <div style="margin-top:20px;padding-top:20px;border-top:1px solid #f0efec">
                    <div style="font-size:13px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().cadastreLbl}</div>
                    <input
                      value={p().cadastreCode}
                      onInput={(e) => setPost({ cadastreCode: e.currentTarget.value })}
                      placeholder={t().cadastrePh}
                      style={inputStyle}
                    />
                    <div style="font-size:12px;color:#9a9793;margin-top:8px;line-height:1.5">{t().cadastreNote}</div>
                  </div>
                </Show>
              </div>

              <div style="margin-top:20px;background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
                <h3 style="margin:0 0 16px;font-size:18px;font-weight:800;letter-spacing:-.01em">{t().ownTitle}</h3>
                <div
                  style={`display:flex;gap:12px;align-items:center;padding:16px;border-radius:14px;background:${TEAL_T};border:1px solid ${TEAL}`}
                >
                  <span style="width:36px;height:36px;border-radius:999px;background:#fff;flex:0 0 auto;display:flex;align-items:center;justify-content:center">
                    <Icon name="phone" size={16} stroke={TEAL} weight={2} />
                  </span>
                  <div style="flex:1">
                    <div style="font-size:15px;font-weight:700">{txt('ch1', { p: (state.user && state.user.phone) || '' })}</div>
                    <div style="font-size:13px;color:#6f6d68;margin-top:4px">
                      {t().ch1n} · {t().confPhoneEdit}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  role="checkbox"
                  aria-checked={p().agree}
                  onClick={() => setPost({ agree: !p().agree })}
                  style="width:100%;margin-top:16px;display:flex;gap:12px;align-items:center;min-height:44px;padding:8px 0;text-align:left"
                >
                  <span
                    style={`width:22px;height:22px;border-radius:7px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;border:2px solid ${p().agree ? '#0e7c73' : '#c9c7c2'};background:${p().agree ? '#0e7c73' : '#fff'}`}
                  >
                    <Icon name="check" size={12} stroke="#fff" weight={3.4} />
                  </span>
                  <span style="font-size:14px;line-height:1.5;color:#4a4844">{t().agreeW}</span>
                </button>
              </div>
            </div>
          </Show>

          <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
            <button
              type="button"
              class="bn-tap"
              disabled={state.remoteBusy}
              onClick={next}
              style={`flex:1 1 220px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:14px;background:#0e7c73;color:#fff;font-size:15px;font-weight:700;cursor:${state.remoteBusy ? 'wait' : 'pointer'};opacity:${state.remoteBusy ? 0.7 : 1}`}
            >
              {state.remoteBusy ? t().publishingW : p().step === 4 ? t().publishW : t().nextW}
            </button>
            <button
              type="button"
              class="bn-tap"
              onClick={() => {
                setErrFields([]);
                setPost({ step: Math.max(1, p().step - 1) });
              }}
              style="display:flex;align-items:center;padding:16px 20px;border-radius:14px;background:#f2f1ee;font-size:15px;font-weight:700"
            >
              {t().backW}
            </button>
          </div>
        </div>

        <aside style="flex:1 1 280px;max-width:340px;min-width:260px">
          <div style="background:#fff;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
            <div style={labelStyle}>{t().previewW}</div>
            <div style="margin-top:16px;height:130px;border-radius:14px;background:#f2f1ee;position:relative;overflow:hidden">
              <Show when={mainPhotoUrl()}>
                <img src={mainPhotoUrl()} alt="" style="width:100%;height:100%;object-fit:cover;display:block" />
              </Show>
              <div style="position:absolute;top:10px;left:10px;padding:8px 12px;border-radius:999px;background:#fceeeb;color:#93331f;font-size:11px;font-weight:700;pointer-events:none">
                {t().awaitConf}
              </div>
            </div>
            <Show when={hotel()}>
              <div style="margin-top:16px;font-size:20px;font-weight:800;letter-spacing:-.02em;overflow-wrap:anywhere">
                {p().title || '—'}
              </div>
              <Show when={p().stars > 0}>
                <div style="margin-top:6px">
                  <StarRating value={p().stars} size={14} />
                </div>
              </Show>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                <span style="padding:4px 12px;border-radius:999px;background:#f2f1ee;font-size:12px;font-weight:600">
                  {stayKindLabel(p().stayKind)}
                </span>
                <span style="padding:4px 12px;border-radius:999px;background:#f2f1ee;font-size:12px;font-weight:600">
                  {p().checkInTime || '—'} / {p().checkOutTime || '—'}
                </span>
              </div>
            </Show>
            <Show when={!hotel()}>
              <div style="margin-top:16px;font-size:22px;font-weight:800;letter-spacing:-.02em">{price() ? nf(price()) + ' ֏' : '— ֏'}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                <span style="padding:4px 12px;border-radius:999px;background:#f2f1ee;font-size:12px;font-weight:600">
                  {p().rooms === 0 ? t().studio : txt('roomsN', { n: p().rooms })}
                </span>
                <span style="padding:4px 12px;border-radius:999px;background:#f2f1ee;font-size:12px;font-weight:600">
                  {p().area || '—'} m²
                </span>
                <span style="padding:4px 12px;border-radius:999px;background:#f2f1ee;font-size:12px;font-weight:600">
                  {p().fl || '—'}/{p().fls || '—'}
                </span>
              </div>
            </Show>
            <div style="font-size:13px;color:#6f6d68;margin-top:12px">
              {(DIST[p().dist] || DIST.center)[li()]}
              {p().street.trim() ? ', ' + p().street.trim() : ''}
            </div>
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid #f0efec;font-size:13px;color:#4a4844;line-height:1.5">
              {hotel() ? t().hotelRoomsLater : t().docNote}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
