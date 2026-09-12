import { For, Show } from 'solid-js';
import { state, setState, t, go, setLang, requireAuth, reload, TEAL_T, TEAL_TX, MUTED, INK, SOFT } from '../store';
import Icon from './Icon';
import { cabinetPillStyle } from './headerStyle';

const DEALS = ['rent', 'sale'];

export default function Header() {
  const favCount = () => Object.keys(state.favs).length;
  const unread = () => Object.keys(state.unread).length;
  const guard = (screen) => () => {
    if (requireAuth({ type: 'go', to: screen })) go(screen);
  };
  const cabinetLabel = () => {
    const u = state.user;
    if (!u) return t().signin;
    return u.role === 'agency' ? u.name : t().cabinet;
  };

  return (
    <header style="position:sticky;top:0;z-index:60;background:#fff;box-shadow:0 1px 0 #ebeae7">
      <div style="width:100%;max-width:1400px;margin:0 auto;padding:12px clamp(16px,3vw,28px);display:flex;align-items:center;gap:16px;flex-wrap:nowrap">
        <button type="button" class="bn-tap" onClick={() => go('search')} style="display:flex;align-items:center;gap:8px;flex:0 0 auto">
          <span style="position:relative;width:34px;height:34px;border-radius:11px;background:#0e7c73;display:flex;align-items:center;justify-content:center;overflow:hidden">
            <span style="font-family:Manrope,sans-serif;font-size:20px;font-weight:800;color:#fff;line-height:1">H</span>
            <span style="position:absolute;right:5px;bottom:5px;width:5px;height:5px;border-radius:1px;background:#7fded2" />
          </span>
          <span style="display:flex;align-items:baseline;gap:4px">
            <span style="font-size:22px;font-weight:800;letter-spacing:-.035em">HayHome</span>
            <span style="width:5px;height:5px;border-radius:1px;background:#0e7c73;display:block" />
          </span>
        </button>

        <Show when={!state.isMob}>
          <nav style="display:flex;align-items:center;gap:4px;flex:1 1 340px;min-width:0;overflow-x:auto">
            <For each={DEALS}>
              {(key) => {
                const on = () => state.deal === key && state.screen === 'search';
                return (
                  <button
                    type="button"
                    class="bn-tap"
                    aria-pressed={on()}
                    onClick={() => {
                      setState('deal', key);
                      reload();
                      go('search');
                    }}
                    style={`padding:8px 16px;border-radius:999px;white-space:nowrap;font-size:14px;font-weight:600;background:${on() ? TEAL_T : 'transparent'};color:${on() ? TEAL_TX : MUTED}`}
                  >
                    {t()[key]}
                  </button>
                );
              }}
            </For>
          </nav>
        </Show>

        <div style="display:flex;align-items:center;gap:8px;flex:0 0 auto;margin-left:auto">
          <div style="display:flex;align-items:center;gap:4px;height:40px;padding:0 4px;background:#f2f1ee;border-radius:999px">
            <For each={['ՀՅ', 'RU', 'EN']}>
              {(code) => {
                const on = () => state.lang === code;
                return (
                  <button
                    type="button"
                    class="bn-tap"
                    aria-pressed={on()}
                    aria-label={`${t().langLbl}: ${code}`}
                    onClick={() => setLang(code)}
                    style={`padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700;background:${on() ? '#fff' : 'transparent'};color:${on() ? INK : MUTED};box-shadow:${on() ? '0 1px 3px rgba(28,27,25,.14)' : 'none'}`}
                  >
                    {code}
                  </button>
                );
              }}
            </For>
          </div>

          <Show when={!state.isMob}>
            <button
              type="button"
              class="bn-tap"
              onClick={guard('fav')}
              aria-label={t().favs}
              style="position:relative;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center"
            >
              <Icon name="heart" size={20} stroke="#4a4844" weight={1.7} />
              <Show when={favCount()}>
                <span style="position:absolute;top:4px;right:3px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#0e7c73;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">
                  {favCount()}
                </span>
              </Show>
            </button>
            <button
              type="button"
              class="bn-tap"
              onClick={guard('chat')}
              aria-label={t().messages}
              style="position:relative;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center"
            >
              <Icon name="chat" size={20} stroke="#4a4844" weight={1.7} />
              <Show when={unread()}>
                <span style="position:absolute;top:4px;right:3px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#1c1b19;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">
                  {unread()}
                </span>
              </Show>
            </button>
          </Show>

          <button type="button" class="bn-tap bn-cabinet-pill" onClick={guard('cabinet')} aria-label={cabinetLabel()} style={cabinetPillStyle(state.isMob)}>
            <span
              style={`width:28px;height:28px;border-radius:999px;background:${state.user ? TEAL_T : SOFT};color:${state.user ? TEAL_TX : MUTED};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center`}
            >
              {state.user ? state.user.ini : '?'}
            </span>
            <Show when={!state.isMob}>
              <span class="bn-hide-narrow" style="font-size:14px;font-weight:600;white-space:nowrap">
                {cabinetLabel()}
              </span>
            </Show>
          </button>

          <button
            type="button"
            class="bn-tap"
            onClick={guard('post')}
            aria-label={t().post}
            style="display:flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:12px;background:#0e7c73;color:#fff;font-size:14px;font-weight:700;box-shadow:0 6px 16px -8px rgba(14,124,115,.6)"
          >
            <Icon name="plus" size={15} weight={2.2} />
            <Show when={!state.isMob}>
              <span class="bn-hide-narrow">{t().post}</span>
            </Show>
          </button>
        </div>
      </div>
    </header>
  );
}
