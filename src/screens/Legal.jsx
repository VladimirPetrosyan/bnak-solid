import { For, Show } from 'solid-js';
import { state, t, txt, openLegal, legalBack, TEAL, TEAL_T, TEAL_TX, INK, MUTED, FAINT, SOFT } from '../store';
import { legalDoc, legalList, LEGAL_KEY_BY_ID } from '../legalDocs';
import Icon from '../components/Icon';

function ListRow(props) {
  return (
    <div
      onClick={() => openLegal(props.id)}
      style="display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(28,27,25,.05);cursor:pointer"
    >
      <span
        style={`width:38px;height:38px;border-radius:12px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:${TEAL_T};color:${TEAL_TX}`}
      >
        <Icon name="doc" size={17} weight={1.8} />
      </span>
      <div style="flex:1 1 auto;min-width:0">
        <div style="font-size:15.5px;font-weight:700">{t()[LEGAL_KEY_BY_ID[props.id]]}</div>
        <div style="font-size:13px;color:#6f6d68;margin-top:2px">{props.summary}</div>
      </div>
      <Icon name="next" size={16} stroke={FAINT} weight={2} style="flex:0 0 auto" />
    </div>
  );
}

function LegalList(props) {
  return (
    <>
      <Show when={props.notFound}>
        <div style="margin-bottom:20px;display:flex;gap:14px;align-items:flex-start;padding:18px 20px;border-radius:16px;background:#fceeeb">
          <Icon name="alert" size={21} stroke="#c2452f" weight={2} style="flex:0 0 auto;margin-top:2px" />
          <div style="min-width:0">
            <div style="font-size:15.5px;font-weight:800;color:#93331f">{t().legalNotFoundTitle}</div>
            <div style="font-size:13.5px;line-height:1.5;color:#93331f;margin-top:3px">{t().legalNotFoundText}</div>
          </div>
        </div>
      </Show>

      <h1 style="margin:0 0 6px;font-size:clamp(24px,4vw,30px);font-weight:800;letter-spacing:-.03em">{t().legalTitle}</h1>
      <div style="font-size:14.5px;color:#6f6d68;max-width:60ch">{t().legalListSub}</div>

      <div
        style={`margin-top:18px;padding:14px 16px;border-radius:14px;background:${SOFT};font-size:12.5px;line-height:1.55;color:${MUTED}`}
      >
        {t().legalBetaNote}
      </div>

      <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px">
        <For each={legalList(state.lang)}>{(item) => <ListRow id={item.id} summary={item.summary} />}</For>
      </div>
    </>
  );
}

export default function Legal() {
  const doc = () => legalDoc(state.lang, state.legalId);
  const backLabel = () => (state.legalId ? t().legalToList : t().legalBack);

  return (
    <div style="width:100%;max-width:860px;margin:0 auto;padding:20px clamp(14px,3vw,28px) 56px;animation:bnIn .2s ease">
      <div
        onClick={legalBack}
        style="display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:#6f6d68;cursor:pointer;margin-bottom:16px"
      >
        <Icon name="back" size={15} weight={2.2} />
        <span>{backLabel()}</span>
      </div>

      <Show when={doc()} fallback={<LegalList notFound={!!state.legalId} />}>
        {(d) => (
          <>
            <h1 style="margin:0 0 6px;font-size:clamp(22px,3.6vw,28px);font-weight:800;letter-spacing:-.03em">
              {t()[LEGAL_KEY_BY_ID[d().id]]}
            </h1>
            <div style="font-size:13px;color:#9a9793">{txt('legalUpdated', { x: d().updated })}</div>

            <nav style="margin-top:20px;padding:16px 18px;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(28,27,25,.05)">
              <div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a9793">
                {t().legalTitle}
              </div>
              <div style="margin-top:10px;display:flex;flex-direction:column;gap:7px">
                <For each={d().sections}>
                  {(s, i) => (
                    <a href={`#legal-sec-${i()}`} style={`font-size:13.5px;color:${TEAL};text-decoration:none`}>
                      {s.heading}
                    </a>
                  )}
                </For>
              </div>
            </nav>

            <div style="margin-top:20px;display:flex;flex-direction:column;gap:16px">
              <For each={d().sections}>
                {(s, i) => (
                  <section
                    id={`legal-sec-${i()}`}
                    style="padding:20px;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(28,27,25,.05);scroll-margin-top:20px"
                  >
                    <h2 style={`margin:0 0 8px;font-size:16.5px;font-weight:800;letter-spacing:-.01em;color:${INK}`}>{s.heading}</h2>
                    <For each={s.body}>{(p) => <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#3a3937">{p}</p>}</For>
                  </section>
                )}
              </For>
            </div>
          </>
        )}
      </Show>
    </div>
  );
}
