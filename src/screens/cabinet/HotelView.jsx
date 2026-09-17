import { For, Show, createEffect, createSignal, on } from 'solid-js';
import {
  state,
  t,
  go,
  editListing,
  openListing,
  addrOf,
  fetchRooms,
  loadBookings,
  TEAL,
  TEAL_T,
  TEAL_TX,
  RED_T,
  RED_TX
} from '../../store';
import { INK } from '../../theme';
import Icon from '../../components/Icon';
import PhotoSlot from '../../components/PhotoSlot';
import Kpi from './Kpi';
import StarRating from '../../components/StarRating';
import RoomTypesEditor from './RoomTypesEditor';
import RoomCalendar from './RoomCalendar';
import BookingList from './BookingList';
import { useCabinetRows } from './rows';

const TABS = [
  ['rooms', 'tabRooms'],
  ['calendar', 'tabCalendar'],
  ['requests', 'tabRequests']
];

export default function HotelView() {
  const { rows } = useCabinetRows();
  const hotels = () => rows().filter((r) => r.listing.deal === 'hotel');
  const [activeId, setActiveId] = createSignal(null);
  const [tab, setTab] = createSignal('rooms');
  const [rooms, setRooms] = createSignal([]);

  const active = () => hotels().find((r) => r.listing.id === activeId()) || hotels()[0];
  const requests = (id) => state.bookings.filter((b) => b.listingId === id && b.ownerId === (state.user && state.user.id));
  const pendingCount = (id) => requests(id).filter((b) => b.status === 'pending').length;
  const allHosted = () => state.bookings.filter((b) => state.user && b.ownerId === state.user.id);

  const reloadRooms = async () => {
    const id = active() && active().listing.id;
    if (!id) return;
    const info = await fetchRooms(id);
    if (info && active() && active().listing.id === id) setRooms(info.roomTypes);
  };

  createEffect(on(() => active() && active().listing.id, reloadRooms));
  loadBookings();

  return (
    <>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:16px;margin-top:24px">
        <Kpi label={t().kpiProperties} value={String(hotels().length)} note={t().cabHotel} />
        <Kpi
          label={t().kpiRequests}
          value={String(allHosted().filter((b) => b.status === 'pending').length)}
          note={t().bkPending}
          bg={allHosted().some((b) => b.status === 'pending') ? '#fdf3dc' : '#fff'}
        />
        <Kpi
          label={t().kpiUpcoming}
          value={String(allHosted().filter((b) => b.status === 'confirmed').length)}
          note={t().bkConfirmed}
          bg={TEAL_T}
          fg={TEAL_TX}
        />
      </div>

      <Show
        when={hotels().length}
        fallback={
          <div style="margin-top:20px;background:#fff;border-radius:20px;padding:clamp(28px,5vw,48px);text-align:center;box-shadow:0 1px 2px rgba(28,27,25,.05)">
            <div style="font-size:20px;font-weight:800;letter-spacing:-.02em">{t().noHotelsT}</div>
            <div style="font-size:15px;color:#6f6d68;margin-top:8px">{t().noHotelsS}</div>
            <button
              type="button"
              class="bn-tap"
              onClick={() => go('post')}
              style={`display:inline-flex;margin-top:20px;padding:12px 20px;border-radius:13px;background:${TEAL};color:#fff;font-size:14px;font-weight:700`}
            >
              {t().addHotel}
            </button>
          </div>
        }
      >
        <Show when={hotels().length > 1}>
          <div style="margin-top:20px;display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">
            <For each={hotels()}>
              {(h) => {
                const on = () => active().listing.id === h.listing.id;
                return (
                  <button
                    type="button"
                    class="bn-tap"
                    onClick={() => setActiveId(h.listing.id)}
                    style={`flex:0 0 auto;padding:10px 16px;border-radius:999px;font-size:14px;font-weight:700;white-space:nowrap;background:${on() ? INK : '#fff'};color:${on() ? '#fff' : INK};box-shadow:0 1px 2px rgba(28,27,25,.08)`}
                  >
                    {h.listing.title}
                  </button>
                );
              }}
            </For>
          </div>
        </Show>

        <Show when={active()}>
          {(row) => (
            <div style="margin-top:16px;background:#fff;border-radius:20px;box-shadow:0 1px 2px rgba(28,27,25,.05);overflow:hidden;animation:bnIn .2s ease">
              <div style="padding:20px;display:flex;gap:16px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #f0efec">
                <div style="flex:0 0 96px;height:76px;border-radius:12px;overflow:hidden;background:#f2f1ee;position:relative">
                  <PhotoSlot
                    id={`ph-${row().listing.id}`}
                    label={addrOf(row().listing)}
                    src={row().listing.photos && row().listing.photos[0]}
                  />
                </div>
                <div style="flex:1 1 220px;min-width:0">
                  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                    <Show
                      when={row().listing.backendStatus === 'pending'}
                      fallback={
                        <span
                          style={`display:inline-flex;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;background:${row().chipBg()};color:${row().chipFg()}`}
                        >
                          {row().chipText()}
                        </span>
                      }
                    >
                      <span style="display:inline-flex;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;background:#fdf3dc;color:#8a5a00">
                        {t().onModeration}
                      </span>
                    </Show>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
                    <button
                      type="button"
                      onClick={() => openListing(row().listing.id)}
                      style="display:block;text-align:left;font-size:18px;font-weight:800;letter-spacing:-.02em"
                    >
                      {row().listing.title}
                    </button>
                    <Show when={row().listing.stars > 0}>
                      <StarRating value={row().listing.stars} size={13} />
                    </Show>
                  </div>
                  <div style="font-size:13px;color:#6f6d68;margin-top:2px">{addrOf(row().listing)}</div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <Show when={row().listing.backendStatus !== 'pending'}>
                    <button
                      type="button"
                      class="bn-tap"
                      onClick={row().act}
                      style={`display:flex;align-items:center;gap:7px;padding:11px 16px;border-radius:12px;font-size:14px;font-weight:700;background:${row().btnBg()};color:${row().btnFg()};border:1px solid ${row().btnBd()}`}
                    >
                      <Icon name="check" size={15} weight={2.4} />
                      {row().done() && !row().isArch() && !row().isFlag() ? t().allActual : row().btnLabel()}
                    </button>
                  </Show>
                  <button
                    type="button"
                    class="bn-tap"
                    onClick={() => editListing(row().listing.id)}
                    disabled={row().hasPendingRevision()}
                    style="display:flex;align-items:center;gap:7px;padding:11px 14px;border-radius:12px;background:#fff;border:1px solid #d9d7d2;font-size:14px;font-weight:700"
                  >
                    <Icon name="edit" size={15} weight={2} />
                    {t().editW}
                  </button>
                </div>
              </div>

              <Show when={!rooms().length}>
                <div
                  style={`margin:16px 20px 0;padding:12px 14px;border-radius:12px;background:${RED_T};color:${RED_TX};font-size:13px;font-weight:600`}
                >
                  {t().roomsNeeded}
                </div>
              </Show>

              <div style="padding:16px 20px 0">
                <div role="tablist" style="display:flex;gap:4px;padding:4px;border-radius:14px;background:#f2f1ee;overflow-x:auto">
                  <For each={TABS}>
                    {([key, label]) => {
                      const on = () => tab() === key;
                      return (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={on()}
                          class="bn-tap"
                          onClick={() => setTab(key)}
                          style={`flex:1 0 auto;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 14px;border-radius:10px;font-size:14px;font-weight:700;white-space:nowrap;background:${on() ? '#fff' : 'transparent'};color:${on() ? INK : '#6f6d68'};box-shadow:${on() ? '0 1px 3px rgba(28,27,25,.14)' : 'none'}`}
                        >
                          {t()[label]}
                          <Show when={key === 'requests' && pendingCount(row().listing.id)}>
                            <span
                              style={`min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:${TEAL};color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center`}
                            >
                              {pendingCount(row().listing.id)}
                            </span>
                          </Show>
                        </button>
                      );
                    }}
                  </For>
                </div>
              </div>

              <div style="padding:16px 20px 20px">
                <Show when={tab() === 'rooms'}>
                  <RoomTypesEditor listingId={row().listing.id} rooms={rooms()} onChange={reloadRooms} />
                </Show>
                <Show when={tab() === 'calendar'}>
                  <Show when={rooms().length} fallback={<div style="font-size:14px;color:#6f6d68">{t().noRoomsYet}</div>}>
                    <RoomCalendar listingId={row().listing.id} rooms={rooms()} />
                  </Show>
                </Show>
                <Show when={tab() === 'requests'}>
                  <BookingList items={requests(row().listing.id)} mode="host" />
                </Show>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </>
  );
}
