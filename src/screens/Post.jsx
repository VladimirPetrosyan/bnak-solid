import { createSignal, For, Show } from 'solid-js';
import { state, setState, t, txt, li, postState, setPost, say, publishListing, byId } from '../store';
import { CITY, DIST, FEAT, nf } from '../data';
import { pillStyle, label as labelStyle, input as inputStyle, TEAL, TEAL_T, TEAL_TX, INK } from '../theme';
import PhotoSlot, { droppedFile } from '../components/PhotoSlot';
import Icon from '../components/Icon';
import InfoTooltip from '../components/InfoTooltip';
import { documentFile, setDocumentFile, validateDocumentFile, formatFileSize } from '../documentUpload';
import { postStepErrorKey } from '../postValidation';
import { REPAIR_CONDITIONS, REPAIR_LABELS, REPAIR_HINTS } from '../repairCondition';

const DOC_ERR_KEY = { missing: 'errDoc', type: 'errDocType', size: 'errDocSize' };

const STEPS = [
  ['1', 'st1'],
  ['2', 'st2'],
  ['3', 'st3'],
  ['4', 'st4']
];

export default function Post() {
  const p = () => postState();
  const [cityOpen, setCityOpen] = createSignal(false);
  const price = () => parseInt(String(p().price).replace(/\s/g, ''), 10) || 0;
  let docInput;

  const valid = (step) => {
    const key = postStepErrorKey(step, p());
    if (key) return say(txt(key)) || false;
    return true;
  };

  const next = () => {
    if (!valid(p().step)) return;
    if (p().step === 4) {
      const n = Math.max(5, p().photos);
      const files = Array.from({ length: n }, (_, i) => droppedFile(`ph-new-${i}`)).filter(Boolean);
      publishListing(files);
    } else {
      setPost({ step: p().step + 1 });
    }
  };

  const digitsOnly = (e) => {
    const v = e.currentTarget.value.replace(/\D/g, '');
    e.currentTarget.value = v;
    return v;
  };

  return (
    <div style="width:100%;max-width:1100px;margin:0 auto;padding:32px clamp(16px,3vw,28px) 48px;animation:bnIn .2s ease">
      <h1 style="margin:0 0 8px;font-size:clamp(24px,4vw,30px);font-weight:800;letter-spacing:-.03em">{t().postTitle}</h1>
      <div style="font-size:14.5px;color:#6f6d68;max-width:64ch">{t().postSub}</div>

      <div style="display:flex;gap:8px;margin:24px 0 28px;flex-wrap:wrap">
        <For each={STEPS}>
          {([n, key]) => {
            const on = () => p().step === +n;
            const done = () => p().step > +n;
            return (
              <div
                onClick={() => {
                  if (+n <= p().step || valid(p().step)) setPost({ step: +n });
                }}
                style={`flex:1 1 170px;padding:16px 16px;border-radius:14px;cursor:pointer;background:${on() ? '#0e7c73' : done() ? '#e8f4f2' : '#fff'};color:${on() ? '#fff' : done() ? '#0a5f59' : '#6f6d68'};box-shadow:${on() ? '0 8px 20px -12px rgba(14,124,115,.7)' : '0 1px 2px rgba(28,27,25,.05)'}`}
              >
                <div style="font-size:11px;font-weight:700;letter-spacing:.08em;opacity:.7">
                  {t().stepW} {n}
                </div>
                <div style="font-size:13.5px;font-weight:700;margin-top:4px">{t()[key]}</div>
              </div>
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
                <For each={['rent', 'daily', 'sale', 'newb', 'comm']}>
                  {(key) => (
                    <div onClick={() => setPost({ deal: key })} style={pillStyle(p().deal === key)}>
                      {t()[key]}
                    </div>
                  )}
                </For>
              </div>

              <div style={`${labelStyle};margin-top:24px`}>{t().cityLbl}</div>
              <div style="position:relative;max-width:320px;margin-top:12px">
                <div
                  onClick={() => setCityOpen(!cityOpen())}
                  style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:13.5px;font-weight:600;cursor:pointer"
                >
                  <span>{CITY[p().city].n[li()]}</span>
                  <Icon name="down" size={13} stroke="#9a9793" weight={2.2} />
                </div>
                <Show when={cityOpen()}>
                  <div style="position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:40;max-height:260px;overflow-y:auto;background:#fff;border-radius:14px;padding:6px;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7;animation:bnUp .16s ease both">
                    <For each={Object.keys(CITY)}>
                      {(key) => {
                        const on = () => p().city === key;
                        return (
                          <div
                            onClick={() => {
                              setPost({ city: key });
                              setCityOpen(false);
                            }}
                            style={`display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:10px;font-size:13.5px;cursor:pointer;font-weight:${on() ? 700 : 600};background:${on() ? TEAL_T : 'transparent'};color:${on() ? TEAL_TX : INK}`}
                          >
                            <span style={`width:7px;height:7px;border-radius:999px;display:block;background:${on() ? TEAL : '#dedcd7'}`} />
                            <span>{CITY[key].n[li()]}</span>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>

              <div style={`${labelStyle};margin-top:24px`}>{t().distLbl}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                <For each={Object.keys(DIST).filter((k) => k !== 'center')}>
                  {(key) => (
                    <div onClick={() => setPost({ dist: key })} style={pillStyle(p().dist === key)}>
                      {DIST[key][li()]}
                    </div>
                  )}
                </For>
              </div>

              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:16px;margin-top:24px">
                <div>
                  <div style="font-size:12.5px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().streetLbl}</div>
                  <input
                    value={p().street}
                    onInput={(e) => setPost({ street: e.currentTarget.value })}
                    placeholder={t().streetPh}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style="font-size:12.5px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().postPhoneLbl}</div>
                  <div
                    class="bn-ring"
                    style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa"
                  >
                    <span style="font-size:15px;font-weight:700;color:#4a4844">+374</span>
                    <input
                      value={p().phone}
                      onInput={(e) => {
                        const v = e.currentTarget.value.replace(/[^\d\s]/g, '');
                        e.currentTarget.value = v;
                        setPost({ phone: v });
                      }}
                      placeholder="55 214 806"
                      style="flex:1;min-width:0;border:0;background:transparent;font-size:15px;padding:0"
                    />
                  </div>
                  <div style="font-size:12px;color:#9a9793;margin-top:8px;line-height:1.45">{t().postPhoneNote}</div>
                </div>
              </div>
            </div>
          </Show>

          <Show when={p().step === 2}>
            <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05);animation:bnIn .18s ease">
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
                    <div onClick={() => setPost({ rooms: +key })} style={pillStyle(String(p().rooms) === key)}>
                      {text}
                    </div>
                  )}
                </For>
              </div>

              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:16px;margin-top:24px">
                <div>
                  <div style="font-size:12.5px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().areaLbl}</div>
                  <input value={p().area} onInput={(e) => setPost({ area: digitsOnly(e) })} placeholder="62" style={inputStyle} />
                </div>
                <div>
                  <div style="font-size:12.5px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().floorLbl}</div>
                  <input value={p().fl} onInput={(e) => setPost({ fl: digitsOnly(e) })} placeholder="4" style={inputStyle} />
                </div>
                <div>
                  <div style="font-size:12.5px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().floorsLbl}</div>
                  <input value={p().fls} onInput={(e) => setPost({ fls: digitsOnly(e) })} placeholder="9" style={inputStyle} />
                </div>
              </div>

              <div style={`${labelStyle};margin-top:24px`}>{t().featLbl}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                <For each={Object.keys(FEAT)}>
                  {(key) => (
                    <div onClick={() => setPost({ feats: { ...p().feats, [key]: !p().feats[key] } })} style={pillStyle(!!p().feats[key])}>
                      {FEAT[key][li()]}
                    </div>
                  )}
                </For>
              </div>

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
                    <div onClick={() => setPost({ repair: key })} style={pillStyle(p().repair === key)}>
                      {REPAIR_LABELS[key][li()]}
                    </div>
                  )}
                </For>
              </div>

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
                    </div>
                    <div style="font-size:12px;color:#9a9793;margin-top:12px">{t().editPhotosLocked}</div>
                  </>
                }
              >
                <div style="display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap">
                  <div style="flex:1 1 200px;min-width:160px">
                    <div style="height:8px;border-radius:999px;background:#f2f1ee;overflow:hidden">
                      <div
                        style={`width:${Math.min(100, (p().photos / 5) * 100)}%;height:100%;border-radius:999px;background:${p().photos >= 5 ? '#0e7c73' : '#e4b5a9'}`}
                      />
                    </div>
                    <div style="font-size:12.5px;color:#6f6d68;margin-top:8px">{txt('photosCount', { n: p().photos })}</div>
                  </div>
                  <div
                    onClick={() => setPost({ photos: Math.min(12, p().photos + 1) })}
                    style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:12px;background:#0e7c73;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer"
                  >
                    <Icon name="plus" size={14} weight={2.4} />
                    <span>{t().addPhoto}</span>
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(140px,100%),1fr));gap:12px;margin-top:16px">
                  <For each={Array.from({ length: Math.max(5, p().photos) }, (_, i) => i)}>
                    {(i) => (
                      <div
                        style={`height:96px;border-radius:12px;overflow:hidden;background:#f2f1ee;position:relative;opacity:${i < p().photos ? 1 : 0.45}`}
                      >
                        <PhotoSlot id={`ph-new-${i}`} label="фото" />
                      </div>
                    )}
                  </For>
                </div>
                <div style="font-size:12px;color:#9a9793;margin-top:12px">{t().photosNote}</div>
              </Show>

              <div style="font-size:12.5px;font-weight:600;color:#6f6d68;margin:24px 0 8px">{t().descLbl}</div>
              <textarea
                value={p().desc}
                onInput={(e) => setPost({ desc: e.currentTarget.value })}
                placeholder={t().descPh}
                style="width:100%;min-height:96px;padding:12px 16px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:14.5px;resize:vertical"
              />
            </div>
          </Show>

          <Show when={p().step === 3}>
            <div style="animation:bnIn .18s ease">
              <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:16px">
                  <div>
                    <div style="font-size:12.5px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().priceLbl}</div>
                    <input
                      value={p().price}
                      onInput={(e) => setPost({ price: digitsOnly(e) })}
                      placeholder="380000"
                      style={`${inputStyle};font-weight:700`}
                    />
                  </div>
                  <div>
                    <div style="font-size:12.5px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().depositLbl}</div>
                    <input value={p().dep} onInput={(e) => setPost({ dep: e.currentTarget.value })} style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>
          </Show>

          <Show when={p().step === 4}>
            <div style="animation:bnIn .18s ease">
              <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
                <h3 style="margin:0 0 8px;font-size:17px;font-weight:800;letter-spacing:-.01em">{t().docTitle}</h3>
                <div style="font-size:13.5px;color:#4a4844;line-height:1.55">{t().docNote}</div>
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
                <div
                  onClick={() => docInput.click()}
                  style={`margin-top:16px;display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:13px;font-size:14px;font-weight:700;cursor:pointer;background:${p().doc ? '#e8f4f2' : '#0e7c73'};color:${p().doc ? '#0a5f59' : '#fff'}`}
                >
                  <Icon name="upload" size={15} weight={2.2} />
                  <span>
                    {documentFile()
                      ? documentFile().name + ' · ' + formatFileSize(documentFile().size)
                      : p().doc
                        ? t().docOk
                        : t().uploadDoc}
                  </span>
                </div>

                <div style="margin-top:20px;padding-top:20px;border-top:1px solid #f0efec">
                  <div style="font-size:12.5px;font-weight:600;color:#6f6d68;margin-bottom:8px">{t().cadastreLbl}</div>
                  <input
                    value={p().cadastreCode}
                    onInput={(e) => setPost({ cadastreCode: e.currentTarget.value })}
                    placeholder={t().cadastrePh}
                    style={inputStyle}
                  />
                  <div style="font-size:12px;color:#9a9793;margin-top:8px;line-height:1.5">{t().cadastreNote}</div>
                </div>
              </div>

              <div style="margin-top:20px;background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
                <h3 style="margin:0 0 16px;font-size:17px;font-weight:800;letter-spacing:-.01em">{t().ownTitle}</h3>
                <div
                  style={`display:flex;gap:12px;align-items:center;padding:16px;border-radius:14px;background:${TEAL_T};border:1px solid ${TEAL}`}
                >
                  <span style="width:36px;height:36px;border-radius:999px;background:#fff;flex:0 0 auto;display:flex;align-items:center;justify-content:center">
                    <Icon name="phone" size={16} stroke={TEAL} weight={2} />
                  </span>
                  <div style="flex:1">
                    <div style="font-size:14.5px;font-weight:700">{txt('ch1', { p: '+374 ' + p().phone })}</div>
                    <div style="font-size:12.5px;color:#6f6d68;margin-top:4px">
                      {t().ch1n} · {t().confPhoneEdit}
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setPost({ agree: !p().agree })}
                  style="margin-top:16px;display:flex;gap:12px;align-items:center;min-height:44px;padding:8px 0;cursor:pointer"
                >
                  <span
                    style={`width:22px;height:22px;border-radius:7px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;border:2px solid ${p().agree ? '#0e7c73' : '#c9c7c2'};background:${p().agree ? '#0e7c73' : '#fff'}`}
                  >
                    <Icon name="check" size={12} stroke="#fff" weight={3.4} />
                  </span>
                  <span style="font-size:13.5px;line-height:1.5;color:#4a4844">{t().agreeW}</span>
                </div>
              </div>
            </div>
          </Show>

          <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
            <div
              onClick={() => !state.remoteBusy && next()}
              style={`flex:1 1 220px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:14px;background:#0e7c73;color:#fff;font-size:15px;font-weight:700;cursor:${state.remoteBusy ? 'wait' : 'pointer'};opacity:${state.remoteBusy ? 0.7 : 1}`}
            >
              {state.remoteBusy ? t().publishingW : p().step === 4 ? t().publishW : t().nextW}
            </div>
            <div
              onClick={() => setPost({ step: Math.max(1, p().step - 1) })}
              style="display:flex;align-items:center;padding:16px 20px;border-radius:14px;background:#f2f1ee;font-size:15px;font-weight:700;cursor:pointer"
            >
              {t().backW}
            </div>
          </div>
        </div>

        <aside style="flex:1 1 280px;max-width:340px;min-width:260px">
          <div style="background:#fff;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
            <div style={labelStyle}>{t().previewW}</div>
            <div style="margin-top:16px;height:130px;border-radius:14px;background:#f2f1ee;position:relative;overflow:hidden">
              <PhotoSlot id="ph-new-0" label="Главное фото" />
              <div style="position:absolute;top:10px;left:10px;padding:8px 12px;border-radius:999px;background:#fceeeb;color:#93331f;font-size:10.5px;font-weight:700;pointer-events:none">
                {t().awaitConf}
              </div>
            </div>
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
            <div style="font-size:13px;color:#6f6d68;margin-top:12px">
              {(DIST[p().dist] || DIST.center)[li()]}
              {p().street ? ', ' + p().street : ''}
            </div>
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid #f0efec;font-size:12.5px;color:#4a4844;line-height:1.5">
              {t().docNote}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
