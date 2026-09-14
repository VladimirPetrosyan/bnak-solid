import { For, Show, Switch, Match, onCleanup, onMount } from 'solid-js';
import { state, setState, t, go, requireAuth, restoreSession, byId, openLegal } from './store';
import { photoCount, stepIndex } from './galleryNav';
import { LEGAL_IDS, LEGAL_KEY_BY_ID } from './legalDocs';

import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import FiltersModal from './components/modals/Filters';
import ReportModal from './components/modals/Report';
import HowModal from './components/modals/How';
import SmsModal from './components/modals/Sms';
import Gallery from './components/modals/Gallery';
import CloseDealModal from './components/modals/CloseDealModal';

import Search from './screens/Search';
import MapScreen from './screens/MapScreen';
import Listing from './screens/Listing';
import Favs from './screens/Favs';
import Chat from './screens/Chat';
import Post from './screens/Post';
import Cabinet from './screens/Cabinet';
import Profile from './screens/Profile';
import Auth from './screens/Auth';
import Legal from './screens/Legal';

export default function App() {
  const timer = setInterval(() => setState('tick', (n) => n + 1), 1000);
  onCleanup(() => clearInterval(timer));

  onMount(() => {
    restoreSession();
    const onResize = () => {
      const mobile = window.innerWidth < 820;
      if (mobile !== state.isMob) setState('isMob', mobile);
    };
    const onKey = (e) => {
      if (state.gallery) {
        if (e.key === 'Escape') setState('gallery', null);
        else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const listing = byId(state.gallery.id);
          const count = photoCount(listing && listing.photos, 5);
          const step = e.key === 'ArrowRight' ? 1 : -1;
          setState('gallery', 'i', (i) => stepIndex(i, step, count));
        }
        return;
      }
      if (e.key === 'Escape') {
        setState({ filtersOpen: false, howOpen: false, sortOpen: false, sms: null, reportOn: null, reason: null, reportSent: false });
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    onCleanup(() => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    });
  });

  const showHeader = () => !(state.isMob && state.screen === 'chat');
  const showFooterNav = () => state.screen !== 'auth' && !(state.isMob && state.screen === 'chat');
  const guard = (screen) => () => requireAuth({ type: 'go', to: screen }) && go(screen);

  return (
    <div
      style={`min-height:100vh;background:#f7f7f6;display:flex;flex-direction:column;padding-bottom:${state.isMob && showFooterNav() ? '76px' : '0'}`}
    >
      <Show when={showHeader()}>
        <Header />
      </Show>

      <Switch fallback={<Search />}>
        <Match when={state.screen === 'search'}>
          <Search />
        </Match>
        <Match when={state.screen === 'map'}>
          <MapScreen />
        </Match>
        <Match when={state.screen === 'listing'}>
          <Listing />
        </Match>
        <Match when={state.screen === 'fav'}>
          <Favs />
        </Match>
        <Match when={state.screen === 'chat'}>
          <Chat />
        </Match>
        <Match when={state.screen === 'post'}>
          <Post />
        </Match>
        <Match when={state.screen === 'cabinet'}>
          <Cabinet />
        </Match>
        <Match when={state.screen === 'profile'}>
          <Profile />
        </Match>
        <Match when={state.screen === 'auth'}>
          <Auth />
        </Match>
        <Match when={state.screen === 'legal'}>
          <Legal />
        </Match>
      </Switch>

      <Show when={showFooterNav()}>
        <footer style="background:#fff;margin-top:auto;box-shadow:0 -1px 0 #ebeae7">
          <div style="width:100%;max-width:1400px;margin:0 auto;padding:32px clamp(16px,3vw,28px);display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start">
            <div style="flex:1 1 280px;min-width:0">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="width:28px;height:28px;border-radius:9px;background:#0e7c73;display:flex;align-items:center;justify-content:center">
                  <span style="font-family:Manrope,sans-serif;font-size:16px;font-weight:800;color:#fff;line-height:1">H</span>
                </span>
                <span style="font-weight:800;font-size:20px;letter-spacing:-.035em">HayHome</span>
              </div>
              <div style="margin-top:12px;font-size:13px;color:#6f6d68;max-width:44ch;line-height:1.55">{t().footNote}</div>
            </div>

            <div style="display:flex;gap:40px;flex-wrap:wrap;font-size:14px">
              <div style="display:flex;flex-direction:column;gap:8px">
                <span style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a9793">
                  {t().searchW}
                </span>
                <button type="button" class="bn-tap" onClick={() => go('search')} style="text-align:left">
                  {t().rent}
                </button>
                <button type="button" class="bn-tap" onClick={() => go('map')} style="text-align:left">
                  {t().mapW}
                </button>
                <button type="button" class="bn-tap" onClick={guard('fav')} style="text-align:left">
                  {t().favs}
                </button>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <span style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a9793">
                  {t().forOwners}
                </span>
                <button type="button" class="bn-tap" onClick={guard('post')} style="text-align:left">
                  {t().post}
                </button>
                <button type="button" class="bn-tap" onClick={guard('cabinet')} style="text-align:left">
                  {t().cabinet}
                </button>
                <button type="button" class="bn-tap" onClick={guard('profile')} style="text-align:left">
                  {t().verification}
                </button>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <span style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a9793">
                  {t().rules}
                </span>
                <button type="button" class="bn-tap" onClick={() => setState('howOpen', true)} style="text-align:left">
                  {t().howWorks}
                </button>
                <button type="button" class="bn-tap" onClick={() => setState('howOpen', true)} style="text-align:left">
                  {t().moderation}
                </button>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                <button
                  type="button"
                  class="bn-tap"
                  onClick={() => openLegal(null)}
                  style="text-align:left;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a9793"
                >
                  {t().legalTitle}
                </button>
                <For each={LEGAL_IDS}>
                  {(id) => (
                    <button type="button" class="bn-tap" onClick={() => openLegal(id)} style="text-align:left">
                      {t()[LEGAL_KEY_BY_ID[id]]}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>
        </footer>
      </Show>

      <Show when={state.isMob && showFooterNav()}>
        <BottomNav />
      </Show>

      <FiltersModal />
      <ReportModal />
      <HowModal />
      <SmsModal />
      <Gallery />
      <CloseDealModal />
      <Toast />
    </div>
  );
}
