import { For, Show } from 'solid-js';
import {
  state,
  setState,
  t,
  txt,
  say,
  signOut,
  setLang,
  setRole,
  openSupport,
  SUPPORT_KEY,
  TEAL,
  TEAL_T,
  RED,
  RED_T,
  SOFT,
  MUTED,
  FAINT
} from '../store';
import { radio } from '../theme';
import Icon from '../components/Icon';

export default function Profile() {
  const user = () => state.user || { role: 'tenant', name: '', ini: '?' };

  const steps = () => [
    { title: txt('v1', { p: user().phone || '+374 55 ··· ··' }), note: t().v1n, ok: true, key: null },
    { title: t().v2, note: t().v2n, ok: true, key: null },
    { title: t().v3, note: t().v3n, ok: state.docVerified, key: 'docVerified' },
    { title: t().v4, note: t().v4n, ok: user().role === 'agency' ? state.licenceOk : null, key: 'licenceOk' }
  ];

  return (
    <div style="width:100%;max-width:1060px;margin:0 auto;padding:32px clamp(16px,3vw,28px) 48px;animation:bnIn .2s ease">
      <h1 style="margin:0 0 8px;font-size:clamp(24px,4vw,30px);font-weight:800;letter-spacing:-.03em">{t().profileTitle}</h1>
      <div style="font-size:15px;color:#6f6d68">{t().profileSub}</div>

      <div style="margin-top:24px;display:flex;gap:20px;align-items:center;flex-wrap:wrap;padding:24px;border-radius:18px;background:#fff;box-shadow:0 1px 2px rgba(28,27,25,.05)">
        <span style="width:66px;height:66px;border-radius:999px;background:#e8f4f2;color:#0a5f59;font-size:20px;font-weight:800;display:flex;align-items:center;justify-content:center">
          {user().ini}
        </span>
        <div style="flex:1 1 220px">
          <div style="font-size:20px;font-weight:800;letter-spacing:-.02em">{user().name || t().guest}</div>
          <div style="font-size:14px;color:#6f6d68;margin-top:4px">
            {user().role === 'agency' ? t().agencyW : user().role === 'owner' ? t().ownerW : t().roleTenant} ·{' '}
            {txt('onHayHomeSince', { y: 2026 })}
          </div>
        </div>
        <div style="flex:0 0 auto;text-align:right">
          <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a9793">{t().levelW}</div>
          <div style="font-size:22px;font-weight:800;margin-top:4px;letter-spacing:-.02em">{state.docVerified ? 3 : 2} / 3</div>
        </div>
        <button
          type="button"
          class="bn-tap"
          onClick={signOut}
          style="padding:12px 16px;border-radius:12px;border:1px solid #e8e7e4;font-size:14px;font-weight:700;color:#6f6d68"
        >
          {t().signOutW}
        </button>
      </div>

      <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
        <For each={steps()}>
          {(step) => (
            <div
              style={`display:flex;gap:16px;align-items:flex-start;padding:20px 20px;border-radius:16px;box-shadow:0 1px 2px rgba(28,27,25,.05);flex-wrap:wrap;background:${step.ok === false ? '#fffaf9' : '#fff'}`}
            >
              <span
                style={`width:30px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:${step.ok ? TEAL_T : step.ok === false ? RED_T : SOFT};color:${step.ok ? TEAL : step.ok === false ? RED : FAINT}`}
              >
                <Icon name={step.ok ? 'check' : step.ok === false ? 'plus' : 'minus'} size={15} weight={2.6} />
              </span>
              <div style="flex:1 1 260px;min-width:0">
                <div style="font-size:15px;font-weight:700">{step.title}</div>
                <div style="font-size:13px;color:#6f6d68;margin-top:4px">{step.note}</div>
              </div>
              <button
                type="button"
                class="bn-tap"
                onClick={() => {
                  if (step.ok === false && step.key) {
                    setState(step.key, true);
                    say(txt('docToast'));
                  }
                }}
                style={`align-self:center;padding:12px 16px;border-radius:12px;font-size:13px;font-weight:700;background:${step.ok === false ? TEAL : SOFT};color:${step.ok === false ? '#fff' : MUTED}`}
              >
                {step.ok ? t().doneW : step.ok === false ? t().uploadW : t().notReq}
              </button>
            </div>
          )}
        </For>
      </div>

      <div style="margin-top:24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px">
        <div style="background:#e8f4f2;border-radius:18px;padding:24px">
          <div style="font-size:16px;font-weight:800;color:#0a4f4a">{t().benefitsT}</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:12px;font-size:14px;line-height:1.5;color:#2f5f5a">
            <For each={[t().ben1, t().ben2, t().ben3]}>{(text) => <div>{text}</div>}</For>
          </div>
        </div>

        <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
          <div style="font-size:16px;font-weight:800">{t().langTitle}</div>
          <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
            <For
              each={[
                ['ՀՅ', 'Հայերեն'],
                ['RU', 'Русский'],
                ['EN', 'English']
              ]}
            >
              {([code, name]) => {
                const r = () => radio(state.lang === code);
                return (
                  <button
                    type="button"
                    class="bn-tap"
                    aria-pressed={state.lang === code}
                    onClick={() => setLang(code)}
                    style={`display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:13px;width:100%;text-align:left;background:${r().bg};border:1px solid ${r().bd}`}
                  >
                    <span
                      style={`width:18px;height:18px;border-radius:999px;border:2px solid ${r().box};display:flex;align-items:center;justify-content:center;flex:0 0 auto`}
                    >
                      <span style={`width:8px;height:8px;border-radius:999px;background:${r().inner};display:block`} />
                    </span>
                    <span style="font-size:15px;font-weight:600;flex:1">{name}</span>
                    <span style="font-size:12px;color:#9a9793">{code}</span>
                  </button>
                );
              }}
            </For>
          </div>
          <div style="margin-top:16px;font-size:13px;color:#6f6d68;line-height:1.5">{t().langNote}</div>
        </div>

        <button
          type="button"
          class="bn-tap"
          onClick={openSupport}
          style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05);display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;text-align:left"
        >
          <div>
            <div style="font-size:16px;font-weight:800">{t().supportW}</div>
            <div style="font-size:13px;color:#6f6d68;margin-top:4px;line-height:1.5">{t().supportSub}</div>
          </div>
          <Show when={state.unread[SUPPORT_KEY]}>
            <span style="width:10px;height:10px;border-radius:999px;background:#e5484d;flex:0 0 auto" />
          </Show>
        </button>

        <Show when={state.user}>
          <div style="background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
            <div style="font-size:16px;font-weight:800">{t().roleSwitch}</div>
            <div style="font-size:13px;color:#6f6d68;margin-top:4px;line-height:1.5">{t().roleSwitchN}</div>
            <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
              <For
                each={[
                  ['tenant', t().roleTenant],
                  ['owner', t().roleOwner],
                  ['agency', t().roleAgency]
                ]}
              >
                {([key, text]) => {
                  const r = () => radio(user().role === key);
                  return (
                    <button
                      type="button"
                      class="bn-tap"
                      aria-pressed={user().role === key}
                      onClick={() => setRole(key)}
                      style={`display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:13px;width:100%;text-align:left;background:${r().bg};border:1px solid ${r().bd}`}
                    >
                      <span
                        style={`width:18px;height:18px;border-radius:999px;border:2px solid ${r().box};display:flex;align-items:center;justify-content:center;flex:0 0 auto`}
                      >
                        <span style={`width:8px;height:8px;border-radius:999px;background:${r().inner};display:block`} />
                      </span>
                      <span style="font-size:15px;font-weight:600;flex:1">{text}</span>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
