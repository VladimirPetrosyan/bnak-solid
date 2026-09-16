import { For, Show } from 'solid-js';
import { t, txtN, stayDatesLabel, bookingStatusLabel, decideBooking, cancelBooking, openBookingChat, TEAL, TEAL_T, TEAL_TX, RED_T, RED_TX, SOFT, MUTED } from '../../store';
import { nf } from '../../data';
import Icon from '../../components/Icon';

const STATUS_COLORS = {
  pending: ['#fdf3dc', '#8a5a00'],
  confirmed: [TEAL_T, TEAL_TX],
  declined: [RED_T, RED_TX],
  cancelled: [SOFT, MUTED]
};

export default function BookingList(props) {
  return (
    <Show
      when={props.items.length}
      fallback={<div style="padding:28px 12px;text-align:center;font-size:14px;color:#6f6d68">{t().noRequests}</div>}
    >
      <div style="display:flex;flex-direction:column;gap:10px">
        <For each={props.items}>
          {(b) => {
            const [bg, fg] = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
            return (
              <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;padding:16px;border-radius:16px;border:1px solid #eeedea;background:#fff;animation:bnUp .2s ease both">
                <div style="flex:1 1 240px;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span style="font-size:15px;font-weight:800">{props.mode === 'host' ? b.guestName || '—' : b.listingTitle}</span>
                    <span style={`padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;background:${bg};color:${fg}`}>
                      {bookingStatusLabel(b.status)}
                    </span>
                  </div>
                  <div style="font-size:14px;color:#4a4844;margin-top:6px">
                    {b.roomName} · {stayDatesLabel(b.checkIn, b.checkOut)} · {txtN('nightsN', b.nights)} · {b.guests} {txtN('guestWord', b.guests)}
                  </div>
                  <div style="font-size:16px;font-weight:800;margin-top:6px">{nf(b.total)} ֏</div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <Show when={b.status === 'pending' && props.mode === 'host'}>
                    <button
                      type="button"
                      class="bn-tap"
                      onClick={() => decideBooking(b.id, 'confirmed')}
                      style={`padding:11px 16px;border-radius:12px;background:${TEAL};color:#fff;font-size:14px;font-weight:700`}
                    >
                      {t().confirmW}
                    </button>
                    <button
                      type="button"
                      class="bn-tap"
                      onClick={() => decideBooking(b.id, 'declined')}
                      style={`padding:11px 16px;border-radius:12px;background:${RED_T};color:${RED_TX};font-size:14px;font-weight:700`}
                    >
                      {t().declineW}
                    </button>
                  </Show>
                  <Show when={b.status === 'pending' && props.mode === 'guest'}>
                    <button
                      type="button"
                      class="bn-tap"
                      onClick={() => cancelBooking(b.id)}
                      style="padding:11px 16px;border-radius:12px;border:1px solid #e8e7e4;font-size:14px;font-weight:700;color:#6f6d68"
                    >
                      {t().cancelBookingW}
                    </button>
                  </Show>
                  <button
                    type="button"
                    class="bn-tap"
                    onClick={() => openBookingChat(b)}
                    style="display:flex;align-items:center;gap:6px;padding:11px 14px;border-radius:12px;background:#f2f1ee;font-size:14px;font-weight:700"
                  >
                    <Icon name="chat" size={15} weight={2} />
                    {t().openChatW}
                  </button>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}
