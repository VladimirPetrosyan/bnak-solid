import { createSignal, For, Show, onMount } from 'solid-js';
import { api, ApiError } from '../api';
import { TEAL_T, TEAL_TX, RED_T, RED_TX } from '../theme';
import { addrLine, roomsLabel, priceOf, dateTime, PersonLine } from './adminFormat';
import { revisionDiff } from './revisionDiff';
import { REPAIR_LABELS, isValidRepairCondition } from '../repairCondition';

const FIELD_LABEL = {
  deal: 'Тип сделки',
  city: 'Город',
  d: 'Район',
  street: 'Адрес',
  lat: 'Широта',
  lng: 'Долгота',
  price: 'Цена',
  rooms: 'Комнат',
  area: 'Площадь',
  fl: 'Этаж',
  fls: 'Этажей в доме',
  f: 'Удобства',
  desc: 'Описание',
  dep: 'Депозит',
  cadastreCode: 'Кадастровый код',
  repairCondition: 'Ремонт'
};

function fmtVal(v, key) {
  if (key === 'repairCondition') return isValidRepairCondition(v) ? REPAIR_LABELS[v][1] : v || '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (v === '' || v === null || v === undefined) return '—';
  return String(v);
}

function apiErrText(e) {
  if (e instanceof ApiError) {
    if (e.code === 'network') return 'Сервер недоступен, проверьте подключение';
    if (e.code === 'revision_already_resolved') return 'Эта правка уже обработана';
    if (e.code === 'invalid_reason') return 'Укажите причину отклонения (до 500 символов)';
    if (e.code === 'not found') return 'Правка не найдена';
    return e.code;
  }
  return String((e && e.message) || e);
}

function RevisionCard(props) {
  const rv = () => props.item.revision;
  const listing = () => props.item.listing;
  const owner = () => props.item.owner || {};
  const proposed = () => props.item.proposed;
  const diff = () => revisionDiff(listing(), proposed());
  const busy = () => props.busyId() === rv().id;
  const [rejecting, setRejecting] = createSignal(false);
  const [reason, setReason] = createSignal('');

  return (
    <div style="padding:20px;border-radius:16px;box-shadow:0 1px 2px rgba(28,27,25,.05);background:#fffaf9">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <Show when={listing()} fallback={<span style="font-size:13px;color:#9a9793">Объявление удалено</span>}>
          <div>
            <div style="font-size:16px;font-weight:800;letter-spacing:-.01em">
              {roomsLabel(listing())}, {listing().area} m²
            </div>
            <div style="font-size:13px;color:#6f6d68;margin-top:4px">
              {addrLine(listing())} · {priceOf(listing())}
            </div>
          </div>
        </Show>
        <span style="font-size:12px;color:#9a9793;font-variant-numeric:tabular-nums">{dateTime(rv().createdAt)}</span>
      </div>

      <div style="margin-top:14px;padding:14px 16px;border-radius:12px;background:#f7f7f6">
        <PersonLine label="Владелец" person={owner()} />
      </div>

      <div style="margin-top:16px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#9a9793">Изменённые поля</div>
        <Show when={diff().length} fallback={<div style="margin-top:8px;font-size:13px;color:#9a9793">Изменений не найдено</div>}>
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
            <For each={diff()}>
              {(d) => (
                <div style="padding:10px 12px;border-radius:10px;background:#f7f7f6">
                  <div style="font-size:12px;font-weight:700;color:#6f6d68">{FIELD_LABEL[d.key] || d.key}</div>
                  <div style="margin-top:4px;font-size:13px;line-height:1.5">
                    <span style="color:#9a9793;text-decoration:line-through">{fmtVal(d.before, d.key)}</span>
                    {' → '}
                    <span style="font-weight:700">{fmtVal(d.after, d.key)}</span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      <Show
        when={rejecting()}
        fallback={
          <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
            <button
              type="button"
              class="bn-tap"
              disabled={busy()}
              onClick={() => props.onResolve(rv().id, 'approve')}
              style={`display:inline-flex;align-items:center;padding:11px 14px;border-radius:11px;font-size:13px;font-weight:700;background:${TEAL_T};color:${TEAL_TX};white-space:nowrap`}
            >
              {busy() ? 'Применяем…' : 'Одобрить'}
            </button>
            <button
              type="button"
              class="bn-tap"
              disabled={busy()}
              onClick={() => setRejecting(true)}
              style="display:inline-flex;align-items:center;padding:11px 14px;border-radius:11px;font-size:13px;font-weight:700;background:#f2f1ee;color:#6f6d68;white-space:nowrap"
            >
              Отклонить
            </button>
          </div>
        }
      >
        <div style="margin-top:16px">
          <textarea
            value={reason()}
            onInput={(e) => setReason(e.currentTarget.value)}
            placeholder="Причина отклонения (обязательно, до 500 символов)"
            style="width:100%;min-height:72px;padding:12px 14px;border-radius:12px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:14px;resize:vertical"
          />
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
            <button
              type="button"
              class="bn-tap"
              disabled={busy() || !reason().trim()}
              onClick={() => props.onResolve(rv().id, 'reject', reason())}
              style={`display:inline-flex;align-items:center;padding:11px 14px;border-radius:11px;font-size:13px;font-weight:700;background:${RED_T};color:${RED_TX}`}
            >
              Подтвердить отклонение
            </button>
            <button
              type="button"
              class="bn-tap"
              onClick={() => setRejecting(false)}
              style="display:inline-flex;align-items:center;padding:11px 14px;border-radius:11px;font-size:13px;font-weight:700;background:#f2f1ee;color:#6f6d68"
            >
              Отмена
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default function RevisionPanel(props) {
  const [items, setItems] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [busyId, setBusyId] = createSignal(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.get('/api/admin/revisions?status=pending');
      setItems(list);
      props.onCountChange && props.onCountChange(list.length);
    } catch (e) {
      if (e.status === 401) {
        props.onUnauthorized();
        return;
      }
      setError(apiErrText(e));
    } finally {
      setLoading(false);
    }
  };

  onMount(load);

  const resolve = async (id, action, reason) => {
    if (busyId()) return;
    setBusyId(id);
    setError('');
    try {
      await api.post('/api/admin/revisions/' + id + '/resolve', { action, reason });
      await load();
    } catch (e) {
      if (e.status === 401) {
        props.onUnauthorized();
        return;
      }
      setError(apiErrText(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style="margin-top:16px">
      <Show when={error()}>
        <div style="margin-bottom:16px;padding:14px 16px;border-radius:12px;background:#fceeeb;color:#93331f;font-size:13px;font-weight:600">
          {error()}
        </div>
      </Show>
      <Show when={loading()}>
        <div style="background:#fff;border-radius:18px;padding:32px 20px;text-align:center;font-size:14px;color:#9a9793;box-shadow:0 1px 2px rgba(28,27,25,.05)">
          Загружаем…
        </div>
      </Show>
      <Show when={!loading() && items().length === 0}>
        <div style="background:#fff;border-radius:18px;padding:32px 20px;text-align:center;font-size:14px;color:#9a9793;box-shadow:0 1px 2px rgba(28,27,25,.05)">
          Правок на рассмотрении нет
        </div>
      </Show>
      <div style="display:flex;flex-direction:column;gap:12px">
        <For each={items()}>{(item) => <RevisionCard item={item} busyId={busyId} onResolve={resolve} />}</For>
      </div>
    </div>
  );
}
