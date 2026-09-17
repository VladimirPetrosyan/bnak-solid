import { Show, onMount } from 'solid-js';
import { state, t, txt, myItems, confirmAll, requireAuth, go, refreshTokenWallet, refreshRoleRequest, refreshAgencyAgents } from '../store';
import Icon from '../components/Icon';
import { useCabinetRows } from './cabinet/rows';
import TenantView from './cabinet/TenantView';
import OwnerView from './cabinet/OwnerView';
import AgencyView from './cabinet/AgencyView';
import TokenWallet from './cabinet/TokenWallet';
import HotelView from './cabinet/HotelView';
import RoleUpgrade from './cabinet/RoleUpgrade';

export default function Cabinet() {
  const user = () => state.user || { role: 'tenant', name: '', ini: '?' };
  const items = () => myItems();
  const { dueLeft } = useCabinetRows();

  onMount(() => {
    if (state.user) {
      refreshTokenWallet();
      refreshRoleRequest();
      if (state.user.role === 'agency') refreshAgencyAgents();
    }
  });

  return (
    <div style="width:100%;max-width:1400px;margin:0 auto;padding:32px clamp(16px,3vw,28px) 48px;animation:bnIn .2s ease">
      <div style="display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap">
        <div style="flex:1 1 320px">
          <h1 style="margin:0 0 4px;font-size:clamp(24px,4vw,30px);font-weight:800;letter-spacing:-.03em">
            {{ agency: user().name, owner: t().cabOwner, hotel: t().cabHotel }[user().role] || t().cabTenant}
          </h1>
          <div style="font-size:15px;color:#6f6d68">
            {{ agency: txt('cabAgencyS', { n: items().length }), owner: t().cabOwnerS, hotel: t().cabHotelS }[user().role] ||
              t().cabTenantS}
          </div>
        </div>

        <Show when={user().role === 'agency'}>
          <button
            type="button"
            class="bn-tap"
            onClick={confirmAll}
            style="display:flex;align-items:center;gap:8px;padding:16px 20px;border-radius:14px;background:#0e7c73;color:#fff;font-size:15px;font-weight:700;box-shadow:0 8px 20px -12px rgba(14,124,115,.7)"
          >
            <Icon name="check" size={17} weight={2.4} />
            <span>{dueLeft() ? t().confirmAll : t().allConfirmed}</span>
          </button>
        </Show>

        <button
          type="button"
          class="bn-tap"
          onClick={() => requireAuth({ type: 'go', to: 'post' }) && go('post')}
          style="display:flex;align-items:center;gap:8px;padding:16px 20px;border-radius:14px;background:#fff;border:1px solid #e8e7e4;font-size:15px;font-weight:700"
        >
          <Icon name="plus" size={16} weight={2.2} />
          <span>{user().role === 'hotel' ? t().addHotel : t().post}</span>
        </button>
      </div>

      <div style="margin-top:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:20px 24px;border-radius:18px;background:#fff;box-shadow:0 1px 2px rgba(28,27,25,.05)">
        <span style="width:44px;height:44px;border-radius:999px;background:#e8f4f2;color:#0a5f59;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
          {user().ini}
        </span>
        <div style="flex:1 1 160px;min-width:0">
          <div style="font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{user().name}</div>
          <div style="font-size:13px;color:#6f6d68;margin-top:2px">{user().phone}</div>
        </div>
        <button
          type="button"
          class="bn-tap"
          onClick={() => go('profile')}
          style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:12px;border:1px solid #e8e7e4;font-size:14px;font-weight:700;color:#4a4844;white-space:nowrap"
        >
          <Icon name="edit" size={16} weight={2} />
          {t().editW}
        </button>
      </div>

      <Show when={state.user}>
        <div style="margin-top:16px">
          <TokenWallet />
        </div>
        <RoleUpgrade />
      </Show>

      <Show when={user().role === 'hotel'}>
        <HotelView />
      </Show>
      <Show when={user().role === 'tenant'}>
        <TenantView />
      </Show>
      <Show when={user().role === 'owner'}>
        <OwnerView />
      </Show>
      <Show when={user().role === 'agency'}>
        <AgencyView />
      </Show>
    </div>
  );
}
