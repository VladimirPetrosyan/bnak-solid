import { Show, Switch, Match } from 'solid-js';
import { state, t, txtN, stayDatesLabel, bookingStatusLabel, decideBooking, cancelBooking, transcribeAudioMessage } from '../../store';
import { TEAL, TEAL_T, TEAL_TX, RED, RED_T, RED_TX, SOFT, FAINT, INK, MUTED } from '../../theme';
import { nf } from '../../data';
import Icon from '../../components/Icon';
import { fmtSize } from './format';
import { viewUrl } from '../../listingLocation';
import VoiceMessage from './VoiceMessage';
import VideoMessage from './VideoMessage';

function audioWaveform(waveform) {
  if (!waveform) return null;
  try {
    const arr = JSON.parse(waveform);
    return Array.isArray(arr) ? arr.map((v) => Math.min(1, Math.max(0, v / 100))) : null;
  } catch {
    return null;
  }
}

function AttachIcon(props) {
  return (
    <span
      style={`width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:${props.bg};color:${props.fg}`}
    >
      <Icon name={props.name} size={18} weight={1.8} />
    </span>
  );
}

const BOOKING_EVENT = { confirmed: 'bkEvConfirmed', declined: 'bkEvDeclined', cancelled: 'bkEvCancelled' };
const BOOKING_TONE = { pending: ['#fdf3dc', '#8a5a00'], confirmed: [TEAL_T, TEAL_TX], declined: [RED_T, RED_TX], cancelled: [SOFT, MUTED] };

function BookingCard(props) {
  const b = () => props.m.booking;
  const host = () => !!(state.user && b().ownerId === state.user.id);
  const tone = () => BOOKING_TONE[b().status] || BOOKING_TONE.pending;
  const btn = 'flex:1 1 auto;padding:10px 12px;border-radius:11px;font-size:13px;font-weight:700';

  return (
    <Show
      when={props.m.text === 'request'}
      fallback={
        <div style="display:flex;justify-content:center">
          <span style={`display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;font-size:13px;font-weight:700;background:${tone()[0]};color:${tone()[1]}`}>
            {t()[BOOKING_EVENT[props.m.text]] || bookingStatusLabel(b().status)} · {props.m.time}
          </span>
        </div>
      }
    >
      <div style={`display:flex;justify-content:${props.m.me ? 'flex-end' : 'flex-start'}`}>
        <div style="width:min(320px,86%);border-radius:18px;background:#fff;border:1px solid #eeedea;box-shadow:0 8px 24px -18px rgba(28,27,25,.45);overflow:hidden">
          <div style={`display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;background:${tone()[0]}`}>
            <span style={`display:flex;align-items:center;gap:7px;font-size:13px;font-weight:800;color:${tone()[1]}`}>
              <Icon name="calendar" size={15} weight={2} />
              {t().bookingRequestT}
            </span>
            <span style={`font-size:12px;font-weight:700;color:${tone()[1]}`}>{bookingStatusLabel(b().status)}</span>
          </div>
          <div style="padding:12px 14px">
            <div style="font-size:15px;font-weight:800">{b().roomName}</div>
            <div style="font-size:13px;color:#6f6d68;margin-top:4px">
              {stayDatesLabel(b().checkIn, b().checkOut)} · {txtN('nightsN', b().nights)} · {b().guests} {txtN('guestWord', b().guests)}
            </div>
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:10px">
              <span style="font-size:18px;font-weight:800">{nf(b().total)} ֏</span>
              <span style={`font-size:11px;color:${FAINT}`}>{props.m.time}</span>
            </div>
            <Show when={b().status === 'pending'}>
              <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
                <Show
                  when={host()}
                  fallback={
                    <button type="button" class="bn-tap" onClick={() => cancelBooking(b().id)} style={`${btn};border:1px solid #e8e7e4;color:#6f6d68`}>
                      {t().cancelBookingW}
                    </button>
                  }
                >
                  <button type="button" class="bn-tap" onClick={() => decideBooking(b().id, 'confirmed')} style={`${btn};background:${TEAL};color:#fff`}>
                    {t().confirmW}
                  </button>
                  <button type="button" class="bn-tap" onClick={() => decideBooking(b().id, 'declined')} style={`${btn};background:${RED_T};color:${RED_TX}`}>
                    {t().declineW}
                  </button>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}

export default function MessageBubble(props) {
  const m = () => props.m;
  const isMedia = () => m().kind === 'video' || m().kind === 'image';

  if (m().kind === 'booking' && m().booking) return <BookingCard m={m()} />;

  return (
    <div style={`display:flex;justify-content:${m().me ? 'flex-end' : 'flex-start'}`}>
      <div
        style={`max-width:78%;padding:${isMedia() ? '3px' : '12px'};font-size:15px;line-height:1.5;box-shadow:0 1px 2px rgba(28,27,25,.05);border-radius:${m().me ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};background:${m().me ? TEAL : '#fff'};color:${m().me ? '#fff' : INK}`}
      >
        <Switch fallback={<div style="padding:0 4px;word-break:break-word">{m().text || ''}</div>}>
          <Match when={m().kind === 'audio'}>
            <VoiceMessage
              url={m().url}
              dur={m().dur}
              me={m().me}
              waveform={audioWaveform(m().waveform)}
              transcript={m().transcript}
              onTranscribe={() => transcribeAudioMessage(m().id)}
            />
          </Match>
          <Match when={m().kind === 'video'}>
            <VideoMessage url={m().url} time={m().time} readAt={m().readAt} pending={m().pending} me={m().me} />
          </Match>
          <Match when={m().kind === 'image'}>
            <div style="position:relative;width:220px;height:220px;max-width:100%;border-radius:14px;overflow:hidden">
              <img src={m().url} alt={t().imgMsg} style="display:block;width:100%;height:100%;object-fit:cover" />
              <Show when={m().time}>
                <div style="position:absolute;right:8px;bottom:8px;display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;background:rgba(0,0,0,.5)">
                  <span style="font-size:11px;color:#fff">{m().time}</span>
                  <Show when={m().me}>
                    <Icon name={m().pending ? 'check' : 'checks'} size={12} weight={2.2} stroke={m().readAt ? '#fff' : 'rgba(255,255,255,.5)'} />
                  </Show>
                </div>
              </Show>
            </div>
          </Match>
          <Match when={m().kind === 'file'}>
            <a
              href={m().url}
              target="_blank"
              rel="noreferrer"
              style="display:flex;align-items:center;gap:11px;text-decoration:none;color:inherit;padding:2px 4px"
            >
              <AttachIcon name="doc" bg={m().me ? 'rgba(255,255,255,.18)' : SOFT} fg={m().me ? '#fff' : '#4a4844'} />
              <div style="min-width:0">
                <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px">
                  {m().name}
                </div>
                <div style={`font-size:12px;margin-top:2px;color:${m().me ? 'rgba(255,255,255,.75)' : '#9a9793'}`}>
                  {fmtSize(m().size || 0)}
                </div>
              </div>
            </a>
          </Match>
          <Match when={m().kind === 'location'}>
            <a
              href={viewUrl({ lat: m().lat, lng: m().lng }, 16) || 'https://yandex.com/maps/'}
              target="_blank"
              rel="noopener noreferrer"
              style="display:flex;align-items:center;gap:11px;text-decoration:none;color:inherit;padding:2px 4px"
            >
              <AttachIcon name="pin" bg={m().me ? 'rgba(255,255,255,.18)' : RED_T} fg={m().me ? '#fff' : RED} />
              <div style="min-width:0">
                <div style="font-size:14px;font-weight:700">{t().locMsg}</div>
                <div style={`font-size:12px;margin-top:2px;text-decoration:underline;color:${m().me ? 'rgba(255,255,255,.85)' : TEAL}`}>
                  {t().locOpen}
                </div>
              </div>
            </a>
          </Match>
        </Switch>
        <Show when={m().time && !isMedia()}>
          <div style={`font-size:11px;margin-top:4px;padding:0 4px;display:flex;align-items:center;gap:4px;justify-content:${m().me ? 'flex-end' : 'flex-start'}`}>
            <span style={`color:${m().me ? 'rgba(255,255,255,.7)' : FAINT}`}>{m().time}</span>
            <Show when={m().me}>
              <Icon
                name={m().pending ? 'check' : 'checks'}
                size={13}
                weight={2.2}
                stroke={m().readAt ? '#fff' : 'rgba(255,255,255,.5)'}
              />
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
