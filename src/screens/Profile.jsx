import { For, Show, Switch, Match, createSignal } from 'solid-js';
import {
  state,
  t,
  txt,
  say,
  go,
  updateName,
  sendPhoneChangeCode,
  changePhone,
  changePassword,
  askSignOutConfirm,
  TEAL,
  RED,
  FAINT
} from '../store';
import Icon from '../components/Icon';
import { findCountryByDigits, groupDigits } from '../countries';

const labelStyle = 'display:block;font-size:13px;font-weight:600;color:#6f6d68;margin:0 0 8px';
const pair = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:12px';

function Button(props) {
  const active = () => !props.disabled;
  return (
    <button
      type="button"
      class="bn-tap"
      disabled={props.disabled}
      onClick={props.onClick}
      style={`padding:13px 20px;border-radius:12px;font-size:14px;font-weight:700;transition:background .15s,color .15s;background:${props.ghost ? '#f2f1ee' : active() ? TEAL : '#eeedea'};color:${props.ghost ? '#4a4844' : active() ? '#fff' : FAINT};cursor:${active() ? 'pointer' : 'default'}`}
    >
      {props.children}
    </button>
  );
}

function Field(props) {
  return (
    <label style="display:block;min-width:0">
      <span style={labelStyle}>{props.label}</span>
      <span class={props.code ? 'bn-field bn-field-code' : 'bn-field'} style={props.readOnly ? 'background:#f7f6f4' : ''}>
        <input
          type={props.type || 'text'}
          value={props.value}
          readOnly={props.readOnly}
          inputMode={props.inputMode}
          autocomplete={props.autocomplete}
          placeholder={props.placeholder}
          onInput={(e) => {
            const v = props.mask ? props.mask(e.currentTarget.value) : e.currentTarget.value;
            e.currentTarget.value = v;
            props.onInput?.(v);
          }}
          onKeyDown={(e) => e.key === 'Enter' && props.onEnter?.()}
          style={props.readOnly ? 'color:#6f6d68' : ''}
        />
      </span>
    </label>
  );
}

function Actions(props) {
  return <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap">{props.children}</div>;
}

function Personal() {
  const [first = '', ...rest] = (state.user.name || '').split(/\s+/);
  const [firstName, setFirstName] = createSignal(first);
  const [lastName, setLastName] = createSignal(rest.join(' '));
  const full = () => [firstName().trim(), lastName().trim()].filter(Boolean).join(' ');
  const dirty = () => !!full() && full() !== state.user.name;
  const save = () => dirty() && updateName(full());

  return (
    <>
      <div style={pair}>
        <Field label={t().firstNameLbl} value={firstName()} onInput={setFirstName} onEnter={save} autocomplete="given-name" />
        <Field label={t().lastNameLbl} value={lastName()} onInput={setLastName} onEnter={save} autocomplete="family-name" />
      </div>
      <Actions>
        <Button disabled={!dirty()} onClick={save}>
          {t().saveW}
        </Button>
      </Actions>
    </>
  );
}

function Phone() {
  const [phone, setPhone] = createSignal('');
  const [code, setCode] = createSignal('');
  const [sent, setSent] = createSignal(false);

  const digits = () => phone().replace(/\D/g, '');
  const country = () => findCountryByDigits(digits());
  const phoneOk = () => {
    const c = country();
    const n = c ? digits().length - c.cc.length : 0;
    return !!c && n >= c.min && n <= c.max;
  };
  const pretty = () => (country() ? `+${country().cc} ${groupDigits(digits().slice(country().cc.length))}` : `+${digits()}`);

  const requestCode = async () => phoneOk() && (await sendPhoneChangeCode(digits())) && setSent(true);
  const confirm = async () => {
    if (code().length !== 4) return say(txt('codeErr'));
    if (await changePhone(digits(), code())) {
      setPhone('');
      setCode('');
      setSent(false);
    }
  };

  return (
    <Show
      when={sent()}
      fallback={
        <>
          <div style={pair}>
            <Field label={t().currentPhoneLbl} value={state.user.phone} readOnly />
            <Field
              label={t().newPhoneLbl}
              value={phone()}
              inputMode="tel"
              autocomplete="tel"
              placeholder="+374 00 000 000"
              mask={(v) => v.replace(/[^\d\s+]/g, '')}
              onInput={setPhone}
              onEnter={requestCode}
            />
          </div>
          <Actions>
            <Button disabled={!phoneOk()} onClick={requestCode}>
              {t().getCode}
            </Button>
          </Actions>
        </>
      }
    >
      <div style="animation:bnUp .2s ease both">
        <div style="font-size:14px;color:#4a4844;margin-bottom:16px">{txt('phoneCodeSub', { p: pretty() })}</div>
        <div style="max-width:260px">
          <Field
            code
            label={t().codeLbl}
            value={code()}
            inputMode="numeric"
            autocomplete="one-time-code"
            placeholder="0000"
            mask={(v) => v.replace(/\D/g, '').slice(0, 4)}
            onInput={setCode}
            onEnter={confirm}
          />
        </div>
        <Actions>
          <Button ghost onClick={() => setSent(false)}>
            {t().changeNum}
          </Button>
          <Button disabled={code().length !== 4} onClick={confirm}>
            {t().confirmW}
          </Button>
        </Actions>
      </div>
    </Show>
  );
}

function Security() {
  const [current, setCurrent] = createSignal('');
  const [next, setNext] = createSignal('');
  const [repeat, setRepeat] = createSignal('');

  const ready = () => !!current() && next().length >= 8 && !!repeat();
  const save = async () => {
    if (!ready()) return;
    if (next() !== repeat()) return say(txt('pwMismatch'));
    if (await changePassword(current(), next())) {
      setCurrent('');
      setNext('');
      setRepeat('');
    }
  };

  return (
    <>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style={pair}>
          <Field label={t().currentPwLbl} type="password" autocomplete="current-password" value={current()} onInput={setCurrent} onEnter={save} />
        </div>
        <div style={pair}>
          <Field label={t().newPwLbl} type="password" autocomplete="new-password" placeholder={t().pwPh} value={next()} onInput={setNext} onEnter={save} />
          <Field label={t().pwConfirmLbl} type="password" autocomplete="new-password" value={repeat()} onInput={setRepeat} onEnter={save} />
        </div>
      </div>
      <Actions>
        <Button disabled={!ready()} onClick={save}>
          {t().saveW}
        </Button>
      </Actions>
    </>
  );
}

export default function Profile() {
  const [section, setSection] = createSignal('personal');

  const sections = () => [
    { key: 'personal', icon: 'user', title: t().secPersonal, sub: t().secPersonalSub },
    { key: 'phone', icon: 'phone', title: t().secPhone, sub: t().secPhoneSub },
    { key: 'security', icon: 'shield', title: t().secSecurity, sub: t().secSecuritySub }
  ];
  const current = () => sections().find((s) => s.key === section());

  const navItem = (s) => {
    const on = () => section() === s.key;
    return (
      <button
        type="button"
        class="bn-tap"
        aria-current={on() ? 'page' : undefined}
        onClick={() => setSection(s.key)}
        style={`display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;font-size:14px;font-weight:${on() ? 700 : 600};white-space:nowrap;text-align:left;transition:background .15s,color .15s;background:${on() ? '#e8f4f2' : 'transparent'};color:${on() ? '#0a5f59' : '#4a4844'};${state.isMob ? 'flex:0 0 auto' : 'width:100%'}`}
      >
        <Icon name={s.icon} size={18} weight={on() ? 2.1 : 1.8} />
        {s.title}
      </button>
    );
  };

  return (
    <Show when={state.user}>
      <div style="width:100%;max-width:1060px;margin:0 auto;padding:24px clamp(16px,3vw,28px) 48px;animation:bnIn .2s ease">
        <button
          type="button"
          class="bn-tap"
          onClick={() => go('cabinet')}
          style="display:flex;align-items:center;gap:4px;margin-left:-4px;font-size:14px;font-weight:600;color:#6f6d68"
        >
          <Icon name="back" size={18} weight={2} />
          {t().cabinet}
        </button>
        <h1 style="margin:12px 0 0;font-size:clamp(24px,4vw,30px);font-weight:800;letter-spacing:-.03em">{t().profileTitle}</h1>

        <div style={`margin-top:24px;display:grid;gap:16px;align-items:start;grid-template-columns:${state.isMob ? '1fr' : '260px 1fr'}`}>
          <Show
            when={!state.isMob}
            fallback={
              <nav style="display:flex;gap:6px;overflow-x:auto;padding:6px;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(28,27,25,.05)">
                <For each={sections()}>{navItem}</For>
              </nav>
            }
          >
            <nav style="position:sticky;top:88px;padding:8px;border-radius:18px;background:#fff;box-shadow:0 1px 2px rgba(28,27,25,.05)">
              <div style="display:flex;align-items:center;gap:12px;padding:10px 10px 14px">
                <span style="width:40px;height:40px;border-radius:999px;background:#e8f4f2;color:#0a5f59;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                  {state.user.ini}
                </span>
                <div style="min-width:0">
                  <div style="font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{state.user.name}</div>
                  <div style="font-size:12px;color:#6f6d68;margin-top:2px">{state.user.phone}</div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:2px">
                <For each={sections()}>{navItem}</For>
              </div>
              <div style="height:1px;background:#eeedea;margin:8px 6px" />
              <button
                type="button"
                class="bn-tap"
                onClick={askSignOutConfirm}
                style={`display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:12px;font-size:14px;font-weight:600;color:${RED}`}
              >
                <Icon name="close" size={18} weight={2} stroke={RED} />
                {t().signOutW}
              </button>
            </nav>
          </Show>

          <section style="background:#fff;border-radius:18px;padding:clamp(20px,3vw,28px);box-shadow:0 1px 2px rgba(28,27,25,.05);min-width:0">
            <div style="font-size:18px;font-weight:800;letter-spacing:-.02em">{current().title}</div>
            <div style="font-size:14px;color:#6f6d68;margin-top:4px;line-height:1.5">{current().sub}</div>
            <div style="margin-top:24px">
              <Switch>
                <Match when={section() === 'personal'}>
                  <div style="animation:bnUp .2s ease both">
                    <Personal />
                  </div>
                </Match>
                <Match when={section() === 'phone'}>
                  <div style="animation:bnUp .2s ease both">
                    <Phone />
                  </div>
                </Match>
                <Match when={section() === 'security'}>
                  <div style="animation:bnUp .2s ease both">
                    <Security />
                  </div>
                </Match>
              </Switch>
            </div>
          </section>

          <Show when={state.isMob}>
            <button
              type="button"
              class="bn-tap"
              onClick={askSignOutConfirm}
              style={`display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:14px;background:#fff;font-size:14px;font-weight:700;color:${RED};box-shadow:0 1px 2px rgba(28,27,25,.05)`}
            >
              <Icon name="close" size={16} weight={2.2} stroke={RED} />
              {t().signOutW}
            </button>
          </Show>
        </div>
      </div>
    </Show>
  );
}
