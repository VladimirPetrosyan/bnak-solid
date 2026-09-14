import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import {
  state,
  setState,
  t,
  txt,
  say,
  COUNTRIES,
  li,
  startAuth,
  requestCode,
  verifyCode,
  choosePassword,
  finishAuth,
  loginWithPassword,
  forgotPassword,
  resetPassword,
  startRegistration,
  openLegal,
  exitAuth,
  TEAL,
  FAINT,
  RED,
  RED_T
} from '../store';
import { radio } from '../theme';
import Icon from '../components/Icon';
import { groupDigits } from '../countries';

function capDigits(raw, maxDigits) {
  let out = '',
    n = 0;
  for (const ch of String(raw || '').replace(/[^\d\s]/g, '')) {
    if (/\d/.test(ch)) {
      if (n >= maxDigits) break;
      n++;
    }
    out += ch;
  }
  return out;
}

function flagEmoji(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}
function Flag(props) {
  return <span style="font-size:16px;line-height:1;flex:0 0 auto">{flagEmoji(props.code)}</span>;
}

function pwScore(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  if (s <= 1) return 1;
  if (s <= 3) return 2;
  return 3;
}

export default function Auth() {
  const a = () => state.auth;
  const country = () => COUNTRIES.find((c) => c.code === a().country) || COUNTRIES[0];
  const countryName = (c) => c[['hy', 'ru', 'en'][li()]];
  const digits = () => (a().phone || '').replace(/\D/g, '');
  const phoneOk = () => digits().length >= country().min && digits().length <= country().max;
  const digitsLabel = () => (country().min === country().max ? String(country().min) : `${country().min}–${country().max}`);
  const patch = (p) => setState('auth', { ...a(), ...p });
  const [showPw, setShowPw] = createSignal(false);
  const [ccOpen, setCcOpen] = createSignal(false);
  const [ccQuery, setCcQuery] = createSignal('');
  const [confirmPw, setConfirmPw] = createSignal('');
  const [errField, setErrField] = createSignal('');
  const [nowMs, setNowMs] = createSignal(Date.now());
  onMount(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    onCleanup(() => clearInterval(id));
  });
  const resendWait = () => Math.max(0, Math.ceil((a().resendAt - nowMs()) / 1000));
  const filteredCountries = () => {
    const q = ccQuery().trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => countryName(c).toLowerCase().includes(q) || c.cc.includes(q) || c.code.toLowerCase().includes(q));
  };

  const roles = () => [
    { key: 'tenant', label: t().roleTenant, note: t().roleTenantN },
    { key: 'owner', label: t().roleOwner, note: t().roleOwnerN },
    { key: 'agency', label: t().roleAgency, note: t().roleAgencyN }
  ];

  const phoneFull = () => '+' + country().cc + ' ' + a().phone;
  const pwOk = () => (a().password || '').length >= 8;

  const pickCountry = (code) => {
    patch({ country: code, phone: '' });
    setCcOpen(false);
    setCcQuery('');
  };

  const capInput = (e, value) => {
    e.currentTarget.value = value;
    return value;
  };

  const toCode = () => {
    if (!phoneOk()) {
      setErrField('phone');
      return say(txt('phoneErr', { n: digitsLabel() }));
    }
    setErrField('');
    startAuth();
  };
  const toVerify = () => {
    if ((a().code || '').length !== 4) {
      setErrField('code');
      return say(txt('codeErr'));
    }
    setErrField('');
    verifyCode();
  };
  const toPassword = () => {
    if (!pwOk()) {
      setErrField('password');
      return say(txt('pwErr'));
    }
    if (a().password !== confirmPw()) {
      setErrField('confirm');
      return say(txt('pwMismatch'));
    }
    setErrField('');
    choosePassword();
  };
  const toReset = () => {
    if (!pwOk()) {
      setErrField('password');
      return say(txt('pwErr'));
    }
    if (a().password !== confirmPw()) {
      setErrField('confirm');
      return say(txt('pwMismatch'));
    }
    setErrField('');
    resetPassword();
  };
  const toLogin = () => {
    if ((a().password || '').length === 0) {
      setErrField('password');
      return say(txt('pwErr'));
    }
    setErrField('');
    loginWithPassword();
  };
  const toSignIn = () => {
    if (!phoneOk()) {
      setErrField('phone');
      return say(txt('phoneErr', { n: digitsLabel() }));
    }
    if ((a().password || '').length === 0) {
      setErrField('password');
      return say(txt('pwErr'));
    }
    setErrField('');
    loginWithPassword();
  };
  const toRegister = () => {
    setErrField('');
    startRegistration();
  };
  const toForgotPhone = () => {
    setErrField('');
    patch({ step: 'forgotPhone', code: '', password: '' });
  };
  const toForgotCode = () => {
    if (!phoneOk()) {
      setErrField('phone');
      return say(txt('phoneErr', { n: digitsLabel() }));
    }
    setErrField('');
    forgotPassword();
  };

  const toFinish = () => {
    if (!a().legalAccepted) {
      setErrField('legal');
      return say(txt('errLegalRequired'));
    }
    setErrField('');
    finishAuth();
  };

  const openLegalLink = (id) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    openLegal(id);
  };

  const errStyle = (name) => (errField() === name ? `border-color:${RED}` : '');
  const legalLinkStyle = 'font:inherit;color:#0e7c73;text-decoration:underline';

  const pwField = (onEnter) => (
    <div class="bn-field" style={errStyle('password')}>
      <input
        type={showPw() ? 'text' : 'password'}
        value={a().password}
        maxLength={64}
        onInput={(e) => {
          if (errField() === 'password') setErrField('');
          patch({ password: capInput(e, e.currentTarget.value.slice(0, 64)) });
        }}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
        placeholder={t().pwPh}
      />
      <button type="button" class="bn-tap" onClick={() => setShowPw(!showPw())} aria-pressed={showPw()} style="flex:0 0 auto;font-size:13px;font-weight:600;color:#6f6d68">
        {showPw() ? t().pwHide : t().pwShow}
      </button>
    </div>
  );

  const pwStrengthMeter = () => {
    const score = pwScore(a().password);
    if (!score) return null;
    const info = { 1: [t().pwWeak, RED], 2: [t().pwMedium, '#c9962e'], 3: [t().pwStrong, TEAL] }[score];
    return (
      <div style="margin-top:10px">
        <div style="display:flex;gap:4px">
          <For each={[1, 2, 3]}>
            {(i) => <span style={`flex:1;height:4px;border-radius:999px;background:${i <= score ? info[1] : '#eeedea'}`} />}
          </For>
        </div>
        <div style={`margin-top:6px;font-size:12px;font-weight:600;color:${info[1]}`}>{info[0]}</div>
      </div>
    );
  };

  const pwConfirmField = (onEnter) => (
    <div class="bn-field" style={errStyle('confirm')}>
      <input
        type={showPw() ? 'text' : 'password'}
        value={confirmPw()}
        maxLength={64}
        onInput={(e) => {
          if (errField() === 'confirm') setErrField('');
          setConfirmPw(e.currentTarget.value);
        }}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
        placeholder={t().pwConfirmPh}
      />
    </div>
  );

  const phoneField = (onEnter) => (
    <div class="bn-field" style={`position:relative;${errStyle('phone')}`}>
      <button
        type="button"
        class="bn-tap"
        onClick={() => setCcOpen(!ccOpen())}
        aria-label={t().selectCountry}
        aria-haspopup="listbox"
        aria-expanded={ccOpen()}
        style="flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:16px 0"
      >
        <Flag code={country().code} />
        <Icon name="down" size={11} stroke="#9a9793" weight={2.2} />
      </button>
      <span style="flex:0 0 auto;width:1px;align-self:stretch;background:#e8e7e4;margin:10px 0" />
      <span style="flex:0 0 auto;font-size:16px;font-weight:700;color:#4a4844;padding:16px 0 16px 12px">+{country().cc}</span>
      <input
        value={a().phone}
        onInput={(e) => {
          if (errField() === 'phone') setErrField('');
          patch({ phone: capInput(e, capDigits(e.currentTarget.value, country().max)) });
        }}
        onKeyDown={(e) => e.key === 'Enter' && onEnter()}
        onFocus={() => setCcOpen(false)}
        placeholder={groupDigits('0'.repeat(country().max))}
      />
      <Show when={ccOpen()}>
        <div
          onClick={(e) => e.stopPropagation()}
          style="position:absolute;top:calc(100% + 8px);left:0;z-index:30;width:260px;background:#fff;border-radius:14px;padding:6px;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7"
        >
          <input
            value={ccQuery()}
            onInput={(e) => setCcQuery(e.currentTarget.value)}
            placeholder={t().countrySearchPh}
            style="width:100%;padding:9px 10px;margin-bottom:4px;border-radius:9px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:13px;font-weight:600;box-sizing:border-box"
          />
          <div style="max-height:260px;overflow-y:auto">
            <For each={filteredCountries()}>
              {(c) => (
                <button
                  type="button"
                  class="bn-tap"
                  onClick={() => pickCountry(c.code)}
                  style={`display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:10px;width:100%;font-size:14px;font-weight:${c.code === a().country ? 700 : 600};background:${c.code === a().country ? '#e8f4f2' : 'transparent'}`}
                >
                  <Flag code={c.code} />
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{countryName(c)}</span>
                  <span style="color:#9a9793;font-weight:600">+{c.cc}</span>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );

  return (
    <div style="min-height:100vh;display:flex;flex-wrap:wrap;background:#fff;animation:bnIn .2s ease">
      <div style="flex:1 1 400px;min-width:280px;background:#0e7c73;color:#fff;padding:clamp(20px,min(5vw,6vh),56px);display:flex;flex-direction:column;justify-content:space-between;gap:36px">
        <div style="display:flex;flex-direction:column;gap:22px">
          <button
            type="button"
            class="bn-tap"
            onClick={exitAuth}
            style="display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:rgba(255,255,255,.85);align-self:flex-start"
          >
            <Icon name="back" size={15} weight={2.2} stroke="#fff" />
            <span>{t().backW}</span>
          </button>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="width:34px;height:34px;border-radius:11px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center">
              <span style="font-family:Manrope,sans-serif;font-size:20px;font-weight:800;color:#fff;line-height:1">H</span>
            </span>
            <span style="font-size:22px;font-weight:800;letter-spacing:-.035em">HayHome</span>
          </div>
        </div>
        <div>
          <div style="font-size:clamp(26px,3.6vw,38px);font-weight:800;letter-spacing:-.035em;line-height:1.15;max-width:18ch">
            {t().authHero}
          </div>
          <div style="margin-top:16px;font-size:16px;line-height:1.6;opacity:.85;max-width:44ch">{t().authHeroSub}</div>
          <div style="margin-top:28px;display:flex;flex-direction:column;gap:12px">
            <For each={[t().authFact1, t().authFact2, t().authFact3]}>
              {(fact) => (
                <div class="bn-fact-row" style="display:flex;gap:12px">
                  <span style="width:22px;height:22px;border-radius:999px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                    <Icon name="check" size={12} stroke="#fff" weight={3} />
                  </span>
                  <span style="font-size:15px;line-height:1.5;opacity:.92">{fact}</span>
                </div>
              )}
            </For>
          </div>
        </div>
        <div style="font-size:13px;opacity:.7">{t().authFoot}</div>
      </div>

      <div style="flex:1 1 400px;min-width:280px;display:flex;align-items:center;justify-content:center;padding:clamp(20px,min(5vw,6vh),56px)">
        <div style="width:100%;max-width:400px">
          <Show when={a().step === 'entry'}>
            <div style="animation:bnUp .2s ease both">
              <div style="font-size:26px;font-weight:800;letter-spacing:-.03em;text-align:center">{t().entryTitle}</div>
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:24px 0 8px">{t().phoneLbl}</div>
              {phoneField(toSignIn)}
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:20px 0 8px">{t().pwLbl}</div>
              {pwField(toSignIn)}
              <button
                type="button"
                class="bn-tap"
                onClick={toSignIn}
                style={`width:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:14px;font-size:15px;font-weight:700;background:${phoneOk() && (a().password || '').length ? TEAL : '#eeedea'};color:${phoneOk() && (a().password || '').length ? '#fff' : FAINT}`}
              >
                {t().loginBtn}
              </button>
              <div style="margin-top:16px;text-align:center;font-size:13px;font-weight:600;color:#6f6d68">
                <button type="button" class="bn-tap" onClick={toForgotPhone}>
                  {t().forgotPw}
                </button>
              </div>
              <div style="margin-top:20px;padding-top:20px;border-top:1px solid #eeedea;text-align:center;font-size:14px;color:#6f6d68">
                {t().noAccountQ}{' '}
                <button type="button" class="bn-tap" onClick={toRegister} style="color:#0e7c73;font-weight:700">
                  {t().registerLink}
                </button>
              </div>
            </div>
          </Show>

          <Show when={a().step === 'phone'}>
            <div style="animation:bnUp .2s ease both">
              <div style="font-size:26px;font-weight:800;letter-spacing:-.03em">{t().phoneTitle}</div>
              <div style="font-size:14px;color:#6f6d68;margin-top:8px;line-height:1.55">{t().phoneSub}</div>
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:24px 0 8px">{t().phoneLbl}</div>
              {phoneField(toCode)}
              <button
                type="button"
                class="bn-tap"
                onClick={toCode}
                style={`width:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:14px;font-size:15px;font-weight:700;background:${phoneOk() ? TEAL : '#eeedea'};color:${phoneOk() ? '#fff' : FAINT}`}
              >
                {t().getCode}
              </button>
              <div style="margin-top:16px;text-align:center;font-size:14px;color:#6f6d68">
                {t().haveAccountQ}{' '}
                <button
                  type="button"
                  class="bn-tap"
                  onClick={() => {
                    setErrField('');
                    patch({ step: 'entry', code: '', password: '' });
                  }}
                  style="color:#0e7c73;font-weight:700"
                >
                  {t().loginBtn}
                </button>
              </div>
            </div>
          </Show>

          <Show when={a().step === 'login'}>
            <div style="animation:bnUp .2s ease both">
              <div style="font-size:26px;font-weight:800;letter-spacing:-.03em">{t().loginTitle}</div>
              <div style="font-size:14px;color:#6f6d68;margin-top:8px;line-height:1.55">{txt('loginSub', { p: phoneFull() })}</div>
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:24px 0 8px">{t().pwLbl}</div>
              {pwField(toLogin)}
              <button
                type="button"
                class="bn-tap"
                onClick={toLogin}
                style={`width:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:14px;font-size:15px;font-weight:700;background:${(a().password || '').length ? TEAL : '#eeedea'};color:${(a().password || '').length ? '#fff' : FAINT}`}
              >
                {t().loginBtn}
              </button>
              <div style="margin-top:16px;display:flex;gap:20px;justify-content:center;font-size:13px;font-weight:600;color:#6f6d68">
                <button type="button" class="bn-tap" onClick={toForgotPhone}>
                  {t().forgotPw}
                </button>
                <button
                  type="button"
                  class="bn-tap"
                  onClick={() => {
                    setErrField('');
                    patch({ step: 'entry', password: '' });
                  }}
                >
                  {t().changeNum}
                </button>
              </div>
            </div>
          </Show>

          <Show when={a().step === 'forgotPhone'}>
            <div style="animation:bnUp .2s ease both">
              <div style="font-size:26px;font-weight:800;letter-spacing:-.03em">{t().forgotTitle}</div>
              <div style="font-size:14px;color:#6f6d68;margin-top:8px;line-height:1.55">{t().forgotSub}</div>
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:24px 0 8px">{t().phoneLbl}</div>
              {phoneField(toForgotCode)}
              <button
                type="button"
                class="bn-tap"
                onClick={toForgotCode}
                style={`width:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:14px;font-size:15px;font-weight:700;background:${phoneOk() ? TEAL : '#eeedea'};color:${phoneOk() ? '#fff' : FAINT}`}
              >
                {t().getCode}
              </button>
              <button
                type="button"
                class="bn-tap"
                onClick={() => {
                  setErrField('');
                  patch({ step: 'entry' });
                }}
                style="width:100%;margin-top:16px;text-align:center;font-size:13px;font-weight:600;color:#6f6d68"
              >
                {t().backW}
              </button>
            </div>
          </Show>

          <Show when={a().step === 'code'}>
            <div style="animation:bnUp .2s ease both">
              <div style="font-size:26px;font-weight:800;letter-spacing:-.03em">{t().codeTitle}</div>
              <div style="font-size:14px;color:#6f6d68;margin-top:8px;line-height:1.55">{txt('codeSub', { p: phoneFull() })}</div>
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:24px 0 8px">{t().codeLbl}</div>
              <div class="bn-field bn-field-code" style={errStyle('code')}>
                <input
                  value={a().code}
                  onInput={(e) => {
                    if (errField() === 'code') setErrField('');
                    patch({ code: capInput(e, e.currentTarget.value.replace(/\D/g, '').slice(0, 4)) });
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && toVerify()}
                  placeholder="0000"
                />
              </div>
              <button
                type="button"
                class="bn-tap"
                onClick={toVerify}
                style={`width:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:14px;font-size:15px;font-weight:700;background:${(a().code || '').length === 4 ? TEAL : '#eeedea'};color:${(a().code || '').length === 4 ? '#fff' : FAINT}`}
              >
                {t().confirmW}
              </button>
              <div style="margin-top:16px;display:flex;gap:20px;justify-content:center;font-size:13px;font-weight:600;color:#6f6d68">
                <button type="button" class="bn-tap" onClick={requestCode} disabled={resendWait() !== 0} style={`opacity:${resendWait() === 0 ? 1 : 0.5}`}>
                  {resendWait() === 0 ? t().resend : txt('resendIn', { n: resendWait() })}
                </button>
                <button
                  type="button"
                  class="bn-tap"
                  onClick={() => {
                    setErrField('');
                    patch({ step: a().forgot ? 'forgotPhone' : 'phone', code: '' });
                  }}
                >
                  {t().changeNum}
                </button>
              </div>
            </div>
          </Show>

          <Show when={a().step === 'password'}>
            <div style="animation:bnUp .2s ease both">
              <div style="font-size:26px;font-weight:800;letter-spacing:-.03em">{t().pwTitle}</div>
              <div style="font-size:14px;color:#6f6d68;margin-top:8px;line-height:1.55">{t().pwSub}</div>
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:24px 0 8px">{t().pwLbl}</div>
              {pwField(toPassword)}
              {pwStrengthMeter()}
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:20px 0 8px">{t().pwConfirmLbl}</div>
              {pwConfirmField(toPassword)}
              <button
                type="button"
                class="bn-tap"
                onClick={toPassword}
                style={`width:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:14px;font-size:15px;font-weight:700;background:${pwOk() && confirmPw().length ? TEAL : '#eeedea'};color:${pwOk() && confirmPw().length ? '#fff' : FAINT}`}
              >
                {t().nextW}
              </button>
            </div>
          </Show>

          <Show when={a().step === 'reset'}>
            <div style="animation:bnUp .2s ease both">
              <div style="font-size:26px;font-weight:800;letter-spacing:-.03em">{t().resetTitle}</div>
              <div style="font-size:14px;color:#6f6d68;margin-top:8px;line-height:1.55">{txt('resetSub', { p: phoneFull() })}</div>
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:24px 0 8px">{t().pwLbl}</div>
              {pwField(toReset)}
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:20px 0 8px">{t().pwConfirmLbl}</div>
              {pwConfirmField(toReset)}
              <button
                type="button"
                class="bn-tap"
                onClick={toReset}
                style={`width:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:14px;font-size:15px;font-weight:700;background:${pwOk() && confirmPw().length ? TEAL : '#eeedea'};color:${pwOk() && confirmPw().length ? '#fff' : FAINT}`}
              >
                {t().resetBtn}
              </button>
            </div>
          </Show>

          <Show when={a().step === 'role'}>
            <div style="animation:bnUp .2s ease both">
              <div style="font-size:26px;font-weight:800;letter-spacing:-.03em">{t().roleTitle}</div>
              <div style="font-size:14px;color:#6f6d68;margin-top:8px;line-height:1.55">{t().roleSub}</div>
              <div role="radiogroup" aria-label={t().roleTitle} style="margin-top:16px;display:flex;flex-direction:column;gap:6px">
                <For each={roles()}>
                  {(role) => {
                    const r = () => radio(a().role === role.key);
                    return (
                      <button
                        type="button"
                        class="bn-tap"
                        role="radio"
                        aria-checked={a().role === role.key}
                        onClick={() => patch({ role: role.key })}
                        style={`display:flex;gap:12px;align-items:flex-start;padding:11px 14px;border-radius:14px;width:100%;text-align:left;background:${r().bg};border:1px solid ${r().bd}`}
                      >
                        <span
                          style={`width:19px;height:19px;border-radius:999px;border:2px solid ${r().box};flex:0 0 auto;display:flex;align-items:center;justify-content:center`}
                        >
                          <span style={`width:8px;height:8px;border-radius:999px;background:${r().inner};display:block`} />
                        </span>
                        <div style="flex:1">
                          <div style="font-size:15px;font-weight:700">{role.label}</div>
                          <div style="font-size:13px;color:#6f6d68;margin-top:2px">{role.note}</div>
                        </div>
                      </button>
                    );
                  }}
                </For>
              </div>
              <div style="font-size:13px;font-weight:600;color:#6f6d68;margin:14px 0 8px">
                {a().role === 'agency' ? t().agencyLbl : t().nameLbl}
              </div>
              <div class="bn-field">
                <input
                  value={a().name}
                  onInput={(e) => patch({ name: e.currentTarget.value })}
                  onKeyDown={(e) => e.key === 'Enter' && toFinish()}
                  placeholder={a().role === 'agency' ? t().agencyPh : t().namePh}
                />
              </div>
              <label
                for="bn-legal-consent"
                style={`margin-top:14px;display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;cursor:pointer;background:${errField() === 'legal' ? RED_T : '#f7f6f4'}`}
              >
                <input
                  id="bn-legal-consent"
                  type="checkbox"
                  checked={a().legalAccepted}
                  onChange={(e) => {
                    if (errField() === 'legal') setErrField('');
                    patch({ legalAccepted: e.currentTarget.checked });
                  }}
                  style="margin-top:2px;width:18px;height:18px;flex:0 0 auto;accent-color:#0e7c73;cursor:pointer"
                />
                <span style="font-size:13px;line-height:1.55;color:#4a4844">
                  {t().consentAccept}{' '}
                  <button type="button" onClick={openLegalLink('terms')} style={legalLinkStyle}>
                    {t().consentTerms}
                  </button>
                  {', '}
                  <button type="button" onClick={openLegalLink('privacy')} style={legalLinkStyle}>
                    {t().consentPrivacy}
                  </button>
                  {t().consentAnd}
                  <button type="button" onClick={openLegalLink('personalData')} style={legalLinkStyle}>
                    {t().consentPersonalData}
                  </button>
                  .
                </span>
              </label>
              <button
                type="button"
                class="bn-tap"
                onClick={toFinish}
                style={`width:100%;margin-top:12px;display:flex;align-items:center;justify-content:center;padding:16px;border-radius:14px;font-size:15px;font-weight:700;background:${a().legalAccepted && !a().busy ? '#0e7c73' : '#eeedea'};color:${a().legalAccepted && !a().busy ? '#fff' : FAINT}`}
              >
                {t().finishW}
              </button>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
