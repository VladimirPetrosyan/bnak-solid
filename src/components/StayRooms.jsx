import { For, Show } from 'solid-js';
import { state, t, txt, txtN, requestBooking, TEAL, TEAL_T, TEAL_TX, RED_T, RED_TX } from '../store';
import { nf } from '../data';
import StayPicker from './StayPicker';
import Icon from './Icon';

const chip = 'display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:#f2f1ee;font-size:12px;font-weight:600;color:#4a4844';

function RoomCard(props) {
  const r = () => props.room;
  const nights = () => props.nights;
  const tooMany = () => state.stay.guests > r().capacity;
  const soldOut = () => r().available === 0;
  const blocked = () => tooMany() || soldOut();

  return (
    <div style={`display:flex;gap:16px;flex-wrap:wrap;align-items:center;padding:18px;border-radius:16px;border:1px solid ${blocked() ? '#eeedea' : '#e8e7e4'};background:${blocked() ? '#fbfbfa' : '#fff'};transition:border-color .15s`}>
      <div style="flex:1 1 240px;min-width:0">
        <div style="font-size:16px;font-weight:800;letter-spacing:-.01em">{r().name}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
          <span style={chip}>
            <Icon name="user" size={13} weight={2} />
            {txtN('upToGuests', r().capacity)}
          </span>
          <span style={chip}>{r().bathroom === 'shared' ? t().bathShared : t().bathPrivate}</span>
          <Show when={r().breakfast}>
            <span style={`${chip};background:${TEAL_T};color:${TEAL_TX}`}>{t().breakfastIncl}</span>
          </Show>
        </div>
        <Show when={r().available != null && !blocked()}>
          <div style={`margin-top:10px;font-size:13px;font-weight:700;color:${r().available <= 2 ? RED_TX : TEAL_TX}`}>
            {txt('roomsLeft', { n: r().available })}
          </div>
        </Show>
      </div>

      <div style="flex:1 1 200px;display:flex;flex-direction:column;align-items:flex-end;gap:10px;text-align:right">
        <Show
          when={nights() > 0}
          fallback={
            <div style="font-size:20px;font-weight:800">
              {nf(r().price)} ֏ <span style="font-size:14px;font-weight:600;color:#6f6d68">{t().perNight}</span>
            </div>
          }
        >
          <div>
            <div style="font-size:22px;font-weight:800;letter-spacing:-.02em">{nf(r().price * nights())} ֏</div>
            <div style="font-size:13px;color:#6f6d68;margin-top:2px">
              {nights()} {txtN('nightWord', nights())} × {nf(r().price)} ֏
            </div>
          </div>
        </Show>
        <Show
          when={!blocked()}
          fallback={
            <div style={`padding:10px 14px;border-radius:12px;background:${RED_T};color:${RED_TX};font-size:13px;font-weight:700`}>
              {tooMany() ? t().tooManyGuests : t().soldOut}
            </div>
          }
        >
          <Show when={!props.own}>
            <button
              type="button"
              class="bn-tap"
              onClick={() => requestBooking(props.listingId, r().id)}
              style={`padding:13px 18px;border-radius:13px;background:${TEAL};color:#fff;font-size:14px;font-weight:700;box-shadow:0 8px 20px -12px rgba(14,124,115,.7)`}
            >
              {t().requestBookingBtn}
            </button>
          </Show>
        </Show>
      </div>
    </div>
  );
}

export default function StayRooms(props) {
  const l = () => props.listing;
  const stay = () => l().stay || { roomTypes: [], nights: 0 };
  const own = () => !!(state.user && state.user.id === l().ownerId);

  return (
    <div style="margin-top:26px">
      <h2 style="margin:0 0 14px;font-size:20px;font-weight:800;letter-spacing:-.02em">{t().roomsTitle}</h2>
      <div style="background:#fff;border-radius:18px;padding:clamp(16px,2.4vw,22px);box-shadow:0 1px 2px rgba(28,27,25,.05)">
        <StayPicker />
        <div style="margin-top:18px;display:flex;flex-direction:column;gap:12px">
          <Show when={stay().roomTypes.length} fallback={<div style="padding:12px 0;font-size:14px;color:#6f6d68">{t().noRoomsYet}</div>}>
            <For each={stay().roomTypes}>
              {(room) => <RoomCard room={room} nights={stay().nights} listingId={l().id} own={own()} />}
            </For>
          </Show>
        </div>
        <div style="margin-top:14px;display:flex;align-items:center;gap:8px;font-size:13px;color:#6f6d68">
          <Icon name="shield" size={15} stroke="#9a9793" />
          {t().bookingNoPay}
        </div>
      </div>
    </div>
  );
}
