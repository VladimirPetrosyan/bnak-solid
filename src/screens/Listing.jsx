import { For, Show } from 'solid-js';
import {
  state,
  setState,
  t,
  txt,
  txtN,
  li,
  byId,
  cardOf,
  sellerOf,
  statusOf,
  agoOf,
  addrOf,
  roomsLabel,
  priceOf,
  perOf,
  usdOf,
  rubOf,
  exchangeRateDateLabel,
  exchangeRateIsStale,
  metaOf,
  distanceToCenterOf,
  toggleFav,
  openListing,
  openThreadFor,
  openReport,
  requireAuth,
  say,
  visible,
  repairLabelOf,
  sellerRoleLabel,
  hotelPriceOf,
  dailyPriceOf,
  go,
  TEAL,
  TEAL_T,
  TEAL_TX,
  RED,
  RED_T,
  RED_TX,
  INK
} from '../store';
import { DIST, FEAT, nf } from '../data';
import PhotoSlot from '../components/PhotoSlot';
import Icon from '../components/Icon';
import ListingLocation from '../components/ListingLocation';
import StayRooms from '../components/StayRooms';
import StayPicker from '../components/StayPicker';
import StarRating from '../components/StarRating';
import VideoMessage from './chat/VideoMessage';
import { formatListingDate, postedAtOf, viewsOf, favoritesOf } from '../listingStats';
import { remainingPhotos, galleryIndex } from '../galleryNav';

export default function Listing() {
  const l = () => byId(state.active);
  const sel = () => sellerOf(l());
  const c = () => cardOf(l());
  const st = () => statusOf(l());
  const warm = () => st() === 'flagged' || st() === 'due';
  const low = () => sel().score < 80;
  const dealValue = () =>
    ({ rent: t().vLong, daily: t().vDaily, sale: t().vSale, newb: t().vNew, comm: t().vComm, hotel: t().vHotel })[l().deal];
  const hotel = () => l().deal === 'hotel';
  const daily = () => l().deal === 'daily';
  const hp = () => hotelPriceOf(l());
  const dp = () => dailyPriceOf(l());

  const postedLabel = () => {
    const formatted = formatListingDate(postedAtOf(l()), state.lang);
    return formatted ? txt('statPostedOn', { x: formatted }) : t().statPostedUnknown;
  };

  const hotelSpecs = () => [
    [t().kDeal, dealValue()],
    [t().kStayKind, roomsLabel(l())],
    [t().kCheckTimes, (l().checkIn || '—') + ' / ' + (l().checkOut || '—')],
    [t().kRoomTypes, String((l().stay && l().stay.roomTypes.length) || l().rooms || 0)],
    [t().kWho, sellerRoleLabel(sel())]
  ];

  const specs = () =>
    hotel()
      ? hotelSpecs()
      : [
          [t().kDeal, dealValue()],
          [t().kRooms, l().rooms === 0 ? t().studio : String(l().rooms)],
          [t().kArea, l().area + ' m²'],
          [t().kFloor, txt('floorN', { a: l().fl, b: l().fls })],
          [t().kReno, repairLabelOf(l())],
          [t().kFurn, (l().f || []).includes('furn') ? t().vYes : t().vNo],
          [t().kDeposit, t().vOneMonth],
          [t().kUtil, t().vMeters],
          [t().kWho, sellerRoleLabel(sel())],
          [t().kPromo, t().vTokens]
        ];

  const history = () =>
    Array.from({ length: 14 }, (_, i) => {
      const miss = (st() !== 'fresh' && i > 11) || (low() && [3, 7, 9].includes(i));
      return { h: miss ? '28%' : 55 + ((i * 7) % 45) + '%', bg: miss ? '#f3c9bf' : TEAL };
    });

  const similar = () =>
    visible()
      .filter((x) => x.id !== l().id)
      .slice(0, 3);

  const revealPhone = () => {
    if (!requireAuth({ type: 'phone', id: l().id })) return;
    setState('phoneShown', true);
    say(txt('phoneToast', { x: agoOf(l()) }));
  };

  return (
    <div style="width:100%;max-width:1400px;margin:0 auto;padding:20px clamp(14px,3vw,28px) 48px;animation:bnIn .2s ease">
      <button
        type="button"
        class="bn-tap"
        onClick={() => go('search')}
        style="display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#6f6d68;margin-bottom:16px"
      >
        <Icon name="back" size={15} weight={2.2} />
        <span>{t().backAll}</span>
      </button>

      <div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);grid-template-rows:clamp(88px,15vw,172px) clamp(88px,15vw,172px);gap:10px">
        <button
          type="button"
          onClick={() => setState('gallery', { id: l().id, i: galleryIndex(0, l().photos) })}
          aria-label={t().openGallery}
          style="grid-column:span 1;grid-row:span 2;position:relative;border-radius:18px;overflow:hidden;background:#f2f1ee;width:100%;height:100%"
        >
          <PhotoSlot id={`ph-${l().id}-0`} label={addrOf(l())} src={l().photos && l().photos[0]} />
        </button>
        <button
          type="button"
          onClick={() => setState('gallery', { id: l().id, i: galleryIndex(1, l().photos) })}
          aria-label={`${t().openGallery} — ${t().galleryPhoto} 2`}
          style="position:relative;border-radius:18px;overflow:hidden;background:#f2f1ee;width:100%;height:100%"
        >
          <PhotoSlot id={`ph-${l().id}-1`} label={addrOf(l())} src={l().photos && l().photos[1]} />
        </button>
        <button
          type="button"
          onClick={() => setState('gallery', { id: l().id, i: galleryIndex(2, l().photos) })}
          aria-label={`${t().openGallery} — ${t().galleryPhoto} 3`}
          style="position:relative;border-radius:18px;overflow:hidden;background:#f2f1ee;width:100%;height:100%"
        >
          <PhotoSlot id={`ph-${l().id}-2`} label={addrOf(l())} src={l().photos && l().photos[2]} />
          <Show when={remainingPhotos(l().ph) > 0}>
            <span style="position:absolute;bottom:10px;right:10px;padding:6px 12px;border-radius:999px;background:rgba(28,27,25,.62);color:#fff;font-size:12px;font-weight:600;pointer-events:none">
              + {remainingPhotos(l().ph)}
            </span>
          </Show>
        </button>
      </div>

      <div class="bn-listing-cols" style="margin-top:26px">
        <div class="bn-listing-main">
          <Show when={hotel()}>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px">
              <h1 style="margin:0;font-size:clamp(24px,4vw,32px);font-weight:800;letter-spacing:-.03em">{l().title}</h1>
              <Show when={l().stars > 0}>
                <StarRating value={l().stars} size={18} />
              </Show>
            </div>
          </Show>
          <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap">
            <span style="font-size:clamp(28px,5vw,38px);font-weight:800;letter-spacing:-.035em">
              {hotel() ? hp().main : daily() ? dp().main : priceOf(l())}
            </span>
            <span style="font-size:16px;font-weight:600;color:#6f6d68">{hotel() ? hp().per : daily() ? dp().per : perOf(l())}</span>
            <span style="font-size:14px;color:#9a9793">
              {hotel() ? hp().sub : daily() ? dp().sub : [usdOf(l()), rubOf(l())].filter(Boolean).join(' · ')}
            </span>
          </div>
          <Show when={!hotel() && !daily() && exchangeRateDateLabel()}>
            <div style="margin-top:6px;display:flex;align-items:center;gap:8px;font-size:13px;color:#9a9793">
              <span>{exchangeRateDateLabel()}</span>
              <Show when={exchangeRateIsStale()}>
                <span style={`padding:3px 9px;border-radius:999px;background:${RED_T};color:${RED_TX};font-weight:700;font-size:11px`}>
                  {t().rateStale}
                </span>
              </Show>
            </div>
          </Show>
          <Show when={!hotel()}>
            <h1 style="margin:12px 0 0;font-size:clamp(21px,3.4vw,27px);font-weight:800;letter-spacing:-.03em">
              {roomsLabel(l())}, {l().area} m², {txt('floorN', { a: l().fl, b: l().fls })}
            </h1>
          </Show>
          <Show when={daily()}>
            <div style="margin-top:16px;padding:16px;border-radius:16px;background:#f7f7f6">
              <StayPicker guests={false} />
            </div>
          </Show>
          <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:14px">
            <For each={l().f || []}>
              {(f) => (
                <span style="padding:7px 13px;border-radius:999px;background:#fff;font-size:13px;font-weight:600;color:#4a4844;box-shadow:0 1px 2px rgba(28,27,25,.05)">
                  {FEAT[f][li()]}
                </span>
              )}
            </For>
          </div>
          <div style="margin-top:14px;display:flex;align-items:center;gap:8px;font-size:15px;color:#4a4844">
            <Icon name="pin" size={17} stroke="#9a9793" />
            <span>{[addrOf(l()), metaOf(l()), distanceToCenterOf(l())].filter(Boolean).join(' · ')}</span>
          </div>

          <div style="margin-top:12px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;font-size:14px;color:#6f6d68">
            <span style="display:flex;align-items:center;gap:6px">
              <Icon name="eye" size={15} stroke="#9a9793" />
              {viewsOf(l()) == null ? '—' : txtN('statViews', viewsOf(l()), { n: nf(viewsOf(l())) })}
            </span>
            <span style="display:flex;align-items:center;gap:6px">
              <Icon name="calendar" size={15} stroke="#9a9793" />
              {postedLabel()}
            </span>
            <span style="display:flex;align-items:center;gap:6px">
              <Icon name="heart" size={15} stroke="#9a9793" />
              {favoritesOf(l()) == null ? '—' : txt('statFavorites', { n: nf(favoritesOf(l())) })}
            </span>
          </div>

          <div style="margin-top:24px;border-radius:18px;background:#fff;box-shadow:0 1px 2px rgba(28,27,25,.05);overflow:hidden">
            <div style={`display:flex;align-items:center;gap:13px;padding:18px 20px;background:${warm() ? RED_T : TEAL_T}`}>
              <span
                style={`width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:${warm() ? RED : TEAL}`}
              >
                <Icon name="check" size={19} stroke="#fff" weight={2.6} />
              </span>
              <div style="flex:1">
                <div style={`font-size:16px;font-weight:800;color:${warm() ? RED_TX : '#0a4f4a'}`}>
                  {st() === 'flagged' ? txt('confBadgeFlag', { n: Math.max(1, sel().comp) }) : txt('confBadgeFresh', { x: agoOf(l()) })}
                </div>
                <div style={`font-size:13px;margin-top:2px;color:${warm() ? '#7d4030' : '#3d6b66'}`}>{t().confBadgeNote}</div>
              </div>
            </div>
            <div style="padding:20px">
              <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a9793;margin-bottom:12px">
                {t().confHistory}
              </div>
              <div style="display:flex;gap:5px;align-items:flex-end;height:56px">
                <For each={history()}>
                  {(h) => <div style={`flex:1;height:${h.h};background:${h.bg};border-radius:5px;min-width:6px`} />}
                </For>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#9a9793">
                <span>{t().daysAgo14}</span>
                <span>{t().todayW}</span>
              </div>
              <div style="margin-top:18px;padding-top:18px;border-top:1px solid #f0efec;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px">
                <div>
                  <div style="font-size:20px;font-weight:800;letter-spacing:-.02em">
                    {sel().conf[0]} / {sel().conf[1]}
                  </div>
                  <div style="font-size:13px;color:#6f6d68;margin-top:2px">{t().confInTime}</div>
                </div>
                <div>
                  <div style="font-size:20px;font-weight:800;letter-spacing:-.02em">{sel().conf[1]}</div>
                  <div style="font-size:13px;color:#6f6d68;margin-top:2px">{t().daysInFeed}</div>
                </div>
                <div>
                  <div style={`font-size:20px;font-weight:800;letter-spacing:-.02em;color:${sel().comp > 2 ? RED : INK}`}>{sel().comp}</div>
                  <div style="font-size:13px;color:#6f6d68;margin-top:2px">{t().compCount}</div>
                </div>
              </div>
            </div>
          </div>

          <Show when={hotel()}>
            <StayRooms listing={l()} />
          </Show>

          <Show
            when={hotel()}
            fallback={
              <div style="margin-top:26px">
                <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;letter-spacing:-.02em">{t().descTitle}</h2>
                <p style="margin:0;font-size:16px;line-height:1.65;color:#2c2a27;max-width:64ch;text-wrap:pretty">
                  {txt('descBody', { d: (DIST[l().d] || DIST.center)[li()] })}
                </p>
                <p style="margin:12px 0 0;font-size:16px;line-height:1.65;color:#4a4844;max-width:64ch;text-wrap:pretty">{t().descBody2}</p>
              </div>
            }
          >
            <Show when={l().desc}>
              <div style="margin-top:26px">
                <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;letter-spacing:-.02em">{t().descTitle}</h2>
                <p style="margin:0;font-size:16px;line-height:1.65;color:#2c2a27;max-width:64ch;text-wrap:pretty;white-space:pre-line">
                  {l().desc}
                </p>
              </div>
            </Show>
          </Show>

          <Show when={(l().videos || []).length > 0}>
            <div style="margin-top:26px">
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;letter-spacing:-.02em">{t().videoTitle}</h2>
              <div style="display:flex;gap:12px;flex-wrap:wrap">
                <For each={l().videos}>{(url) => <VideoMessage url={url} />}</For>
              </div>
            </div>
          </Show>

          <div style="margin-top:26px">
            <h2 style="margin:0 0 14px;font-size:20px;font-weight:800;letter-spacing:-.02em">{t().specsTitle}</h2>
            <div style="background:#fff;border-radius:18px;padding:6px 20px;box-shadow:0 1px 2px rgba(28,27,25,.05);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:0 32px">
              <For each={specs()}>
                {([key, value]) => (
                  <div style="display:flex;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #f4f3f0;font-size:14px">
                    <span style="color:#6f6d68">{key}</span>
                    <span style="font-weight:700;text-align:right">{value}</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>

        <aside class="bn-listing-aside">
          <div style="background:#fff;border-radius:18px;box-shadow:0 1px 2px rgba(28,27,25,.05),0 16px 40px -28px rgba(28,27,25,.4);overflow:hidden">
            <div style="padding:18px 20px;display:flex;gap:13px;align-items:center">
              <span
                style={`width:46px;height:46px;border-radius:999px;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:${c().avBg};color:${c().avFg}`}
              >
                {sel().ini}
              </span>
              <div style="min-width:0">
                <div style="font-size:16px;font-weight:700">{sel().n[li()]}</div>
                <div style="font-size:13px;color:#6f6d68;margin-top:1px">
                  {sellerRoleLabel(sel())} · {txt('onHayHomeSince', { y: sel().since })}
                </div>
              </div>
            </div>
            <div style="padding:0 20px 18px">
              <div style={`padding:14px 16px;border-radius:14px;background:${low() ? RED_T : TEAL_T}`}>
                <div style="display:flex;align-items:baseline;justify-content:space-between">
                  <span style="font-size:12px;font-weight:700;color:#4a4844">{t().ratingHonesty}</span>
                  <span style={`font-size:20px;font-weight:800;color:${low() ? RED_TX : TEAL_TX}`}>{sel().score}%</span>
                </div>
                <div style="margin-top:10px;height:7px;border-radius:999px;background:rgba(28,27,25,.09);overflow:hidden">
                  <div style={`width:${sel().score}%;height:100%;border-radius:999px;background:${low() ? RED : TEAL}`} />
                </div>
                <div style="margin-top:10px;font-size:13px;line-height:1.45;color:#4a4844">
                  {low() ? txt('scoreBad', { c: sel().comp }) : txt('scoreGood', { a: sel().conf[0], b: sel().conf[1], c: sel().comp })}
                </div>
              </div>
            </div>
            <div style="padding:0 20px 20px;display:flex;flex-direction:column;gap:9px">
              <button
                type="button"
                class="bn-tap"
                onClick={revealPhone}
                style="display:flex;align-items:center;justify-content:center;gap:9px;padding:15px;border-radius:14px;background:#0e7c73;color:#fff;font-size:15px;font-weight:700"
              >
                <Icon name="phone" size={17} weight={1.9} />
                <span>{state.phoneShown ? sel().ph : t().showPhone}</span>
              </button>
              <button
                type="button"
                class="bn-tap"
                onClick={() => openThreadFor(l().id)}
                style="display:flex;align-items:center;justify-content:center;gap:9px;padding:15px;border-radius:14px;background:#f2f1ee;font-size:15px;font-weight:700"
              >
                <Icon name="chat" size={17} weight={1.9} />
                <span>{t().writeChat}</span>
              </button>
              <button
                type="button"
                class="bn-tap"
                onClick={() => toggleFav(l().id)}
                aria-pressed={c().fav}
                style="display:flex;align-items:center;justify-content:center;gap:9px;padding:14px;border-radius:14px;border:1px solid #e8e7e4;font-size:14px;font-weight:600;color:#4a4844;white-space:nowrap"
              >
                <Icon name="heart" size={16} fill={c().fav ? TEAL : 'none'} stroke={c().fav ? TEAL : '#4a4844'} style="flex:0 0 auto" />
                <span>{c().fav ? t().inFavW : t().saveWatch}</span>
              </button>
            </div>
          </div>

          <Show when={l().remote && l().cadastreCode}>
            <div style="margin-top:16px;background:#fff;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="width:34px;height:34px;border-radius:11px;background:#e8f4f2;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                  <Icon name="shield" size={16} stroke="#0a5f59" weight={1.8} />
                </span>
                <div style="min-width:0">
                  <div style="font-size:13px;font-weight:800">{t().cadastreLbl}</div>
                  <div style="font-size:13px;color:#6f6d68;margin-top:2px">{t().cadastreVerifiedNote}</div>
                </div>
              </div>
            </div>
          </Show>

          <div style="margin-top:16px;background:#fff;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
            <div style="font-size:15px;font-weight:800;letter-spacing:-.01em">{t().reportBoxTitle}</div>
            <div style="margin-top:7px;font-size:13px;line-height:1.55;color:#4a4844">{t().reportBoxText}</div>
            <button
              type="button"
              class="bn-tap"
              onClick={() => setState({ reportOn: l().id, reason: null, reportSent: false })}
              style="width:100%;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:9px;padding:13px;border-radius:13px;background:#fceeeb;color:#93331f;font-size:14px;font-weight:700;text-align:center"
            >
              <span>{t().reportCta}</span>
            </button>
            <div style="margin-top:10px;font-size:12px;color:#9a9793">{t().reportFine}</div>
          </div>
        </aside>
      </div>

      <ListingLocation address={addrOf(l())} ll={l().ll} />

      <Show when={similar().length}>
        <div style="margin-top:34px">
          <h2 style="margin:0 0 14px;font-size:20px;font-weight:800;letter-spacing:-.02em">{t().similarTitle}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:16px">
            <For each={similar()}>
              {(x) => (
                <button
                  type="button"
                  class="bn-tap"
                  onClick={() => openListing(x.id)}
                  style="width:100%;display:flex;gap:14px;padding:14px;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(28,27,25,.05)"
                >
                  <div style="flex:0 0 96px;height:76px;border-radius:12px;overflow:hidden;background:#f2f1ee;position:relative">
                    <PhotoSlot id={`ph-${x.id}`} label={addrOf(x)} src={x.photos && x.photos[0]} />
                  </div>
                  <div style="min-width:0;flex:1">
                    <div style="font-size:18px;font-weight:800;letter-spacing:-.02em">
                      {x.deal === 'hotel' ? hotelPriceOf(x).main : x.deal === 'daily' ? dailyPriceOf(x).main : priceOf(x)}
                    </div>
                    <div style="font-size:13px;font-weight:700;margin-top:4px">{cardOf(x).title}</div>
                    <div style="font-size:13px;color:#6f6d68;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      {addrOf(x)}
                    </div>
                  </div>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
