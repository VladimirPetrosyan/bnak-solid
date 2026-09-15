import { For, Show } from 'solid-js';
import { state, t, go, requireAuth, unreadTotal, TEAL, MUTED } from '../store';
import Icon from './Icon';
import { bottomNavButtonStyle, bottomNavIconWrapStyle, bottomNavLabelStyle, bottomNavBadgeStyle } from './bottomNavStyle';

export default function BottomNav() {
  const items = () => [
    { key: 'search', label: t().searchW, icon: 'search', open: () => go('search') },
    { key: 'map', label: t().mapW, icon: 'map', open: () => go('map') },
    {
      key: 'fav',
      label: t().favs,
      icon: 'heart',
      badge: Object.keys(state.favs).length,
      open: () => requireAuth({ type: 'go', to: 'fav' }) && go('fav')
    },
    {
      key: 'chat',
      label: t().messages,
      icon: 'chat',
      badge: unreadTotal(),
      open: () => requireAuth({ type: 'go', to: 'chat' }) && go('chat')
    },
    { key: 'cabinet', label: t().cabinet, icon: 'user', open: () => requireAuth({ type: 'go', to: 'cabinet' }) && go('cabinet') }
  ];

  return (
    <nav aria-label={t().mainNav} style="position:fixed;bottom:0;left:0;right:0;z-index:80;background:#fff;box-shadow:0 -1px 0 #ebeae7;display:flex;padding:8px 6px calc(8px + env(safe-area-inset-bottom))">
      <For each={items()}>
        {(item) => {
          const on = () => state.screen === item.key || (item.key === 'cabinet' && state.screen === 'profile');
          return (
            <button type="button" class="bn-tap" onClick={item.open} aria-current={on() ? 'page' : undefined} style={bottomNavButtonStyle(on(), TEAL, MUTED)}>
              <span style={bottomNavIconWrapStyle}>
                <Icon name={item.icon} size={21} weight={on() ? 2.2 : 1.7} />
                <Show when={item.badge}>
                  <span style={bottomNavBadgeStyle}>{item.badge}</span>
                </Show>
              </span>
              <span style={bottomNavLabelStyle}>{item.label}</span>
            </button>
          );
        }}
      </For>
    </nav>
  );
}
