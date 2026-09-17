import { For, Show, createSignal, onMount, onCleanup } from 'solid-js';
import {
  state,
  setState,
  t,
  go,
  exitAuth,
  setLang,
  requireAuth,
  reload,
  unreadTotal,
  askSignOutConfirm,
  TEAL_T,
  TEAL_TX,
  MUTED,
  INK,
  SOFT,
  RED
} from '../store';
import Icon from './Icon';
import Link from './Link';

const DEALS = ['rent', 'hotel', 'sale'];
const LANGS = ['ՀՅ', 'RU', 'EN'];
const LANG_NAME = { ՀՅ: 'Հայերեն', RU: 'Русский', EN: 'English' };

const menuItemStyle =
  'width:100%;text-align:left;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;font-weight:600;color:#1c1b19';

export default function Header() {
  const favCount = () => Object.keys(state.favs).length;
  const unread = () => unreadTotal();
  const onAuth = () => state.screen === 'auth';
  const guard = (screen) => () => {
    if (requireAuth({ type: 'go', to: screen })) go(screen);
  };
  const cabinetLabel = () => {
    const u = state.user;
    if (!u) return t().signin;
    return u.role === 'agency' ? u.name : t().cabinet;
  };

  const [menuOpen, setMenuOpen] = createSignal(false);
  const [langOpen, setLangOpen] = createSignal(false);
  let menuRef, langRef;

  onMount(() => {
    const onDocClick = (e) => {
      if (menuRef && !menuRef.contains(e.target)) setMenuOpen(false);
      if (langRef && !langRef.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('click', onDocClick);
    onCleanup(() => document.removeEventListener('click', onDocClick));
  });

  const openAvatar = () => {
    setLangOpen(false);
    setMenuOpen(!menuOpen());
  };

  const gotoFromMenu = (screen) => {
    setMenuOpen(false);
    go(screen);
  };

  const signOutFromMenu = () => {
    setMenuOpen(false);
    askSignOutConfirm();
  };

  const AvatarBadge = () => (
    <>
      <span
        style={`width:40px;height:40px;border-radius:999px;background:${state.user ? TEAL_T : SOFT};color:${state.user ? TEAL_TX : MUTED};font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto`}
      >
        {state.user ? state.user.ini : '?'}
      </span>
      <Show when={!state.isMob}>
        <span class="bn-hide-narrow" style="font-size:14px;font-weight:600;white-space:nowrap">
          {cabinetLabel()}
        </span>
      </Show>
    </>
  );

  const toggleLangMenu = () => {
    setMenuOpen(false);
    setLangOpen(!langOpen());
  };

  return (
    <header style="position:sticky;top:0;z-index:60;background:#fff;box-shadow:0 1px 0 #ebeae7">
      <div style="width:100%;max-width:1400px;margin:0 auto;padding:12px clamp(16px,3vw,28px);display:flex;align-items:center;gap:16px;flex-wrap:nowrap">
        <Link
          screen="search"
          navigate={() => (state.screen === 'auth' ? exitAuth() : go('search'))}
          class="bn-tap"
          style="display:flex;align-items:center;flex:0 0 auto"
        >
          <img src="/brand/hayhome-logo.png" alt="HayHome" style="height:38px;width:auto;display:block" />
        </Link>

        <Show when={!state.isMob}>
          <nav style="display:flex;align-items:center;gap:4px;flex:1 1 340px;min-width:0;overflow-x:auto">
            <For each={DEALS}>
              {(key) => {
                const on = () =>
                  (key === 'rent' ? state.deal === 'rent' || state.deal === 'daily' : state.deal === key) && state.screen === 'search';
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
          <Show
            when={!state.isMob}
            fallback={
              <div style="position:relative;flex:0 0 auto" ref={langRef}>
                <button
                  type="button"
                  class="bn-tap"
                  onClick={toggleLangMenu}
                  aria-haspopup="menu"
                  aria-expanded={langOpen()}
                  aria-label={t().langLbl}
                  style="display:flex;align-items:center;gap:4px;height:40px;padding:0 10px;border-radius:999px;background:#f2f1ee;font-size:12px;font-weight:700;color:#1c1b19"
                >
                  {state.lang}
                  <Icon name="down" size={12} weight={2.4} />
                </button>
                <Show when={langOpen()}>
                  <div
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    style="position:absolute;top:calc(100% + 8px);right:0;z-index:70;width:150px;background:#fff;border-radius:14px;padding:6px;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7"
                  >
                    <For each={LANGS}>
                      {(code) => {
                        const on = () => state.lang === code;
                        return (
                          <button
                            type="button"
                            class="bn-tap"
                            role="menuitem"
                            aria-pressed={on()}
                            onClick={() => {
                              setLang(code);
                              setLangOpen(false);
                            }}
                            style={`display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;text-align:left;padding:9px 10px;border-radius:10px;font-size:13px;font-weight:${on() ? 700 : 500};background:${on() ? TEAL_T : 'transparent'};color:${on() ? TEAL_TX : '#1c1b19'}`}
                          >
                            {LANG_NAME[code]}
                            <Show when={on()}>
                              <Icon name="check" size={13} weight={2.6} />
                            </Show>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            }
          >
            <div style="display:flex;align-items:center;gap:4px;height:40px;padding:0 4px;background:#f2f1ee;border-radius:999px">
              <For each={LANGS}>
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
          </Show>

          <Show when={!onAuth()}>
            <Show when={!state.isMob}>
              <Link
                screen="fav"
                navigate={guard('fav')}
                class="bn-tap"
                aria-label={t().favs}
                style="position:relative;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center"
              >
                <Icon name="heart" size={20} stroke="#4a4844" weight={1.7} />
                <Show when={favCount()}>
                  <span style="position:absolute;top:4px;right:3px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#0e7c73;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">
                    {favCount()}
                  </span>
                </Show>
              </Link>
              <Link
                screen="chat"
                navigate={guard('chat')}
                class="bn-tap"
                aria-label={t().messages}
                style="position:relative;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center"
              >
                <Icon name="chat" size={20} stroke="#4a4844" weight={1.7} />
                <Show when={unread()}>
                  <span style="position:absolute;top:4px;right:3px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#1c1b19;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">
                    {unread()}
                  </span>
                </Show>
              </Link>
            </Show>

            <div style="position:relative;flex:0 0 auto" ref={menuRef}>
              <Show
                when={state.user}
                fallback={
                  <Link screen="cabinet" navigate={guard('cabinet')} class="bn-tap" aria-label={cabinetLabel()} style="display:flex;align-items:center;gap:8px">
                    <AvatarBadge />
                  </Link>
                }
              >
                <button
                  type="button"
                  class="bn-tap"
                  onClick={openAvatar}
                  aria-label={cabinetLabel()}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen()}
                  style="display:flex;align-items:center;gap:8px"
                >
                  <AvatarBadge />
                </button>
              </Show>
              <Show when={state.user && menuOpen()}>
                <div
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                  style="position:absolute;top:calc(100% + 8px);right:0;z-index:70;width:210px;background:#fff;border-radius:16px;padding:6px;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7"
                >
                  <Link screen="cabinet" navigate={() => gotoFromMenu('cabinet')} class="bn-tap" role="menuitem" style={menuItemStyle}>
                    <Icon name="home" size={16} weight={1.9} />
                    {t().cabinet}
                  </Link>
                  <div style="height:1px;background:#ebeae7;margin:6px 4px" />
                  <button type="button" class="bn-tap" role="menuitem" onClick={signOutFromMenu} style={`${menuItemStyle};color:${RED}`}>
                    <Icon name="close" size={16} weight={2.2} stroke={RED} />
                    {t().signOutW}
                  </button>
                </div>
              </Show>
            </div>

            <Link
              screen="post"
              navigate={guard('post')}
              class="bn-tap"
              aria-label={t().post}
              style="display:flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:12px;background:#0e7c73;color:#fff;font-size:14px;font-weight:700;box-shadow:0 6px 16px -8px rgba(14,124,115,.6)"
            >
              <Icon name="plus" size={15} weight={2.2} />
              <Show when={!state.isMob}>
                <span class="bn-hide-narrow">{t().post}</span>
              </Show>
            </Link>
          </Show>
        </div>
      </div>
    </header>
  );
}
