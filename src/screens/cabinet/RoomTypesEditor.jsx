import { For, Show, createSignal } from 'solid-js';
import { t, txt, txtN, saveRoom, removeRoom, TEAL, TEAL_T, TEAL_TX, RED_TX } from '../../store';
import { nf } from '../../data';
import { pillStyle, input as inputStyle } from '../../theme';
import Icon from '../../components/Icon';

const TEMPLATES = [
  ['tplSingle', 1, 'private'],
  ['tplDouble', 2, 'private'],
  ['tplFamily', 4, 'private'],
  ['tplDorm', 1, 'shared']
];

const fieldLabel = 'font-size:13px;font-weight:600;color:#6f6d68;margin-bottom:8px';
const emptyRoom = () => ({ name: '', capacity: 2, quantity: 1, price: '', bathroom: 'private', breakfast: false });

function Counter(props) {
  const step = (d) => props.onChange(Math.min(props.max, Math.max(1, (+props.value || 1) + d)));
  return (
    <div style="display:flex;align-items:center;gap:6px;height:46px;padding:0 6px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa">
      <button type="button" class="bn-tap" aria-label="−" onClick={() => step(-1)} style="width:34px;height:34px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(28,27,25,.12)">
        <Icon name="minus" size={14} weight={2.4} />
      </button>
      <input
        value={props.value}
        inputMode="numeric"
        onInput={(e) => {
          const v = e.currentTarget.value.replace(/\D/g, '').slice(0, 3);
          e.currentTarget.value = v;
          props.onChange(v);
        }}
        style="flex:1;min-width:0;border:0;background:transparent;text-align:center;font-size:16px;font-weight:700;padding:0"
      />
      <button type="button" class="bn-tap" aria-label="+" onClick={() => step(1)} style="width:34px;height:34px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(28,27,25,.12)">
        <Icon name="plus" size={14} weight={2.4} />
      </button>
    </div>
  );
}

function RoomForm(props) {
  const [room, setRoom] = createSignal({ ...props.room });
  const [busy, setBusy] = createSignal(false);
  const patch = (p) => setRoom({ ...room(), ...p });
  const ready = () => room().name.trim() && +room().capacity > 0 && +room().quantity > 0 && parseInt(room().price, 10) > 0;

  const submit = async () => {
    if (!ready() || busy()) return;
    setBusy(true);
    const saved = await saveRoom(props.listingId, room());
    setBusy(false);
    if (saved) props.onSaved();
  };

  return (
    <div style="padding:18px;border-radius:16px;background:#fbfbfa;border:1px solid #e8e7e4;animation:bnUp .2s ease both">
      <Show when={!room().id}>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          <For each={TEMPLATES}>
            {([key, capacity, bathroom]) => (
              <button
                type="button"
                class="bn-tap"
                onClick={() => patch({ name: txt(key), capacity, bathroom })}
                style={pillStyle(room().name === txt(key))}
              >
                {txt(key)}
              </button>
            )}
          </For>
        </div>
      </Show>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:14px">
        <label style="grid-column:1/-1">
          <div style={fieldLabel}>{t().roomNameLbl}</div>
          <input value={room().name} maxLength={80} onInput={(e) => patch({ name: e.currentTarget.value })} style={`${inputStyle};font-weight:700`} />
        </label>
        <div>
          <div style={fieldLabel}>{t().roomCapacityLbl}</div>
          <Counter value={room().capacity} max={50} onChange={(v) => patch({ capacity: v })} />
        </div>
        <div>
          <div style={fieldLabel}>{t().roomQuantityLbl}</div>
          <Counter value={room().quantity} max={500} onChange={(v) => patch({ quantity: v })} />
        </div>
        <label>
          <div style={fieldLabel}>{t().roomPriceLbl}</div>
          <input
            value={room().price}
            inputMode="numeric"
            placeholder="15000"
            onInput={(e) => {
              const v = e.currentTarget.value.replace(/\D/g, '').slice(0, 9);
              e.currentTarget.value = v;
              patch({ price: v });
            }}
            style={`${inputStyle};font-weight:700`}
          />
        </label>
      </div>

      <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:16px;align-items:center">
        <div>
          <div style={fieldLabel}>{t().bathroomLbl}</div>
          <div style="display:flex;gap:6px">
            <button type="button" class="bn-tap" onClick={() => patch({ bathroom: 'private' })} style={pillStyle(room().bathroom === 'private')}>
              {t().bathPrivate}
            </button>
            <button type="button" class="bn-tap" onClick={() => patch({ bathroom: 'shared' })} style={pillStyle(room().bathroom === 'shared')}>
              {t().bathShared}
            </button>
          </div>
        </div>
        <div>
          <div style={fieldLabel}>{t().breakfastLbl}</div>
          <button type="button" class="bn-tap" aria-pressed={room().breakfast} onClick={() => patch({ breakfast: !room().breakfast })} style={pillStyle(room().breakfast)}>
            {t().breakfastIncl}
          </button>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap">
        <button type="button" class="bn-tap" onClick={props.onCancel} style="padding:12px 18px;border-radius:12px;background:#f2f1ee;font-size:14px;font-weight:700">
          {t().cancelW}
        </button>
        <button
          type="button"
          class="bn-tap"
          disabled={!ready() || busy()}
          onClick={submit}
          style={`padding:12px 20px;border-radius:12px;font-size:14px;font-weight:700;background:${ready() ? TEAL : '#eeedea'};color:${ready() ? '#fff' : '#9a9793'}`}
        >
          {t().saveW}
        </button>
      </div>
    </div>
  );
}

export default function RoomTypesEditor(props) {
  const [editing, setEditing] = createSignal(null);

  const done = () => {
    setEditing(null);
    props.onChange();
  };

  return (
    <div style="display:flex;flex-direction:column;gap:10px">
      <For each={props.rooms}>
        {(r) => (
          <Show
            when={editing() && editing().id === r.id}
            fallback={
              <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;padding:16px;border-radius:16px;border:1px solid #eeedea;background:#fff">
                <div style="flex:1 1 220px;min-width:0">
                  <div style="font-size:15px;font-weight:800">{r.name}</div>
                  <div style="font-size:13px;color:#6f6d68;margin-top:4px">
                    {[
                      txtN('upToGuests', r.capacity),
                      txt('qtyN', { n: r.quantity }),
                      r.bathroom === 'shared' ? t().bathShared : t().bathPrivate,
                      r.breakfast && t().breakfastIncl
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div style="font-size:17px;font-weight:800;white-space:nowrap">
                  {nf(r.price)} ֏ <span style="font-size:13px;font-weight:600;color:#6f6d68">{t().perNight}</span>
                </div>
                <div style="display:flex;gap:6px">
                  <button type="button" class="bn-tap" aria-label={t().editW} title={t().editW} onClick={() => setEditing({ ...r })} style="width:40px;height:40px;border-radius:12px;background:#f2f1ee;display:flex;align-items:center;justify-content:center">
                    <Icon name="edit" size={16} weight={2} />
                  </button>
                  <button
                    type="button"
                    class="bn-tap"
                    aria-label={t().duplicateW}
                    title={t().duplicateW}
                    onClick={() => setEditing({ ...r, id: null })}
                    style="width:40px;height:40px;border-radius:12px;background:#f2f1ee;display:flex;align-items:center;justify-content:center"
                  >
                    <Icon name="plus" size={16} weight={2} />
                  </button>
                  <button
                    type="button"
                    class="bn-tap"
                    aria-label={t().deleteW}
                    title={t().deleteW}
                    onClick={async () => (await removeRoom(props.listingId, r.id)) && props.onChange()}
                    style={`width:40px;height:40px;border-radius:12px;background:#fceeeb;color:${RED_TX};display:flex;align-items:center;justify-content:center`}
                  >
                    <Icon name="trash" size={16} weight={2} />
                  </button>
                </div>
              </div>
            }
          >
            <RoomForm room={editing()} listingId={props.listingId} onSaved={done} onCancel={() => setEditing(null)} />
          </Show>
        )}
      </For>

      <Show when={editing() && !editing().id}>
        <RoomForm room={editing()} listingId={props.listingId} onSaved={done} onCancel={() => setEditing(null)} />
      </Show>

      <Show when={!editing()}>
        <button
          type="button"
          class="bn-tap"
          onClick={() => setEditing(emptyRoom())}
          style={`display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:16px;border:1.5px dashed ${TEAL};background:${TEAL_T};color:${TEAL_TX};font-size:14px;font-weight:700`}
        >
          <Icon name="plus" size={16} weight={2.4} />
          {t().addRoom}
        </button>
      </Show>
    </div>
  );
}
