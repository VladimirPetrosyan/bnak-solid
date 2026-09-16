import { For, Index, Show, createSignal, createEffect, onCleanup, onMount } from 'solid-js';
import {
  state,
  setState,
  t,
  txt,
  li,
  threadsAll,
  chatSellerOf,
  openThread,
  sendMsg,
  sendAudioMsg,
  sendVideoMsg,
  sendImageMsg,
  sendFileMsg,
  sendLocationMsg,
  byId,
  roomsLabel,
  addrOf,
  openListing,
  say,
  TEAL,
  TEAL_T,
  TEAL_TX,
  RED,
  RED_T,
  RED_TX,
  SOFT
} from '../store';
import Icon from '../components/Icon';
import ThreadList from './chat/ThreadList';
import MessageBubble from './chat/MessageBubble';
import VoiceMiniPlayer from './chat/VoiceMiniPlayer';
import { useVoiceRecorder } from './chat/useVoiceRecorder';
import { fmtSec } from './chat/format';
import { pickThreadKey } from './chat/threadSelection';

const EMOJI = [
  '😀',
  '😁',
  '😂',
  '🤣',
  '😊',
  '😍',
  '😘',
  '😉',
  '😎',
  '🤔',
  '😅',
  '😢',
  '😭',
  '😡',
  '👍',
  '👎',
  '🙏',
  '👏',
  '🔥',
  '🎉',
  '❤️',
  '💪',
  '👌',
  '🤝',
  '🏠',
  '🔑',
  '📍',
  '✅',
  '⏰',
  '📷'
];

const plainBtn =
  'width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:transparent;flex:0 0 auto';
const attachRowStyle =
  'width:100%;text-align:left;display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;font-size:14px;font-weight:600;color:#1c1b19';

function AttachIcon(props) {
  return (
    <span
      style={`width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:${props.bg};color:${props.fg}`}
    >
      <Icon name={props.name} size={18} weight={1.8} />
    </span>
  );
}

export default function Chat() {
  const all = () => threadsAll();
  const keys = () => Object.keys(all());
  const currentKey = () => pickThreadKey(all(), state.thread);
  const hasThread = () => currentKey() != null;
  const thread = () => (hasThread() ? all()[currentKey()] : null);
  const seller = () => chatSellerOf(thread());
  const listing = () => byId(thread().listing);

  const noRealMsgsYet = () => thread().msgs.length === 0;
  const showQuick = () => !thread().support && noRealMsgsYet() && !(state.draft || '').trim();

  const [mView, setMView] = createSignal(state.thread ? 'chat' : 'list');
  const [showScrollDown, setShowScrollDown] = createSignal(false);
  const showList = () => !state.isMob || mView() === 'list';
  const showThread = () => hasThread() && (!state.isMob || mView() === 'chat');

  createEffect(() => {
    if (!hasThread() && mView() !== 'list') setMView('list');
  });

  const [viewport, setViewport] = createSignal(null);
  onMount(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => setViewport({ height: vv.height, top: vv.offsetTop });
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    onCleanup(() => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    });
  });
  const mobileFrame = () => {
    const v = viewport();
    const size = v ? `height:${v.height}px;transform:translateY(${v.top}px)` : 'height:100dvh';
    return `position:fixed;top:0;left:0;right:0;z-index:40;${size};display:flex;flex-direction:column;background:#fff;overflow:hidden;overscroll-behavior:contain;animation:bnIn .15s ease`;
  };

  const [emojiOpen, setEmojiOpen] = createSignal(false);
  const [attachOpen, setAttachOpen] = createSignal(false);
  let videoInputRef, imageInputRef, docInputRef, msgsRef;

  const voice = useVoiceRecorder({
    getUserMedia: navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices),
    MediaRecorder: typeof MediaRecorder !== 'undefined' ? MediaRecorder : undefined,
    setInterval,
    clearInterval,
    send: sendAudioMsg,
    onError: () => say(txt('micDenied'))
  });

  createEffect(() => {
    const trigger = [thread()?.msgs.length || 0, currentKey(), viewport()?.height];
    if (msgsRef)
      queueMicrotask(() => {
        msgsRef.scrollTop = msgsRef.scrollHeight;
      });
    setShowScrollDown(false);
    return trigger;
  });

  const open = (key) => {
    openThread(key);
    setMView('chat');
  };

  const toggleEmoji = () => {
    setAttachOpen(false);
    setEmojiOpen(!emojiOpen());
  };
  const toggleAttach = () => {
    setEmojiOpen(false);
    setAttachOpen(!attachOpen());
  };
  const insertEmoji = (e) => setState('draft', (state.draft || '') + e);

  const pickImage = () => {
    setAttachOpen(false);
    imageInputRef.click();
  };
  const pickVideo = () => {
    setAttachOpen(false);
    videoInputRef.click();
  };
  const pickDoc = () => {
    setAttachOpen(false);
    docInputRef.click();
  };
  const shareLocation = () => {
    setAttachOpen(false);
    if (!navigator.geolocation) {
      say(txt('geoDenied'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => sendLocationMsg(pos.coords.latitude, pos.coords.longitude),
      () => say(txt('geoDenied')),
      { timeout: 8000 }
    );
  };

  const onImagePicked = (e) => {
    const file = e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (file) sendImageMsg(URL.createObjectURL(file));
  };
  const onVideoPicked = (e) => {
    const file = e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (file) sendVideoMsg(URL.createObjectURL(file));
  };
  const onDocPicked = (e) => {
    const file = e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (file) sendFileMsg(URL.createObjectURL(file), file.name, file.size);
  };

  onCleanup(voice.cleanup);

  return (
    <div
      style={
        state.isMob
          ? mobileFrame()
          :'width:100%;max-width:1400px;margin:0 auto;padding:24px clamp(16px,3vw,28px) 40px;animation:bnIn .2s ease'
      }
    >
      <div
        style={
          state.isMob
            ? 'flex:1;min-height:0;display:flex;overflow:hidden'
            : 'display:flex;align-items:stretch;background:#fff;border-radius:20px;box-shadow:0 1px 2px rgba(28,27,25,.05);overflow:hidden;height:calc(100vh - 160px);min-height:480px;max-height:920px'
        }
      >
        <Show when={showList()}>
          <ThreadList keys={keys} all={all} currentKey={currentKey} onSelect={open} />
        </Show>

        <Show when={showThread()}>
          <div style="flex:999 1 420px;min-width:280px;display:flex;flex-direction:column;min-height:0">
            <div style="padding:16px 20px;border-bottom:1px solid #f0efec;display:flex;gap:12px;align-items:center;flex:0 0 auto">
              <Show when={state.isMob}>
                <button
                  type="button"
                  class="bn-tap"
                  aria-label={t().backW}
                  onClick={() => setMView('list')}
                  style="width:34px;height:34px;flex:0 0 auto;border-radius:11px;display:flex;align-items:center;justify-content:center;background:#f7f7f6;margin-right:-4px"
                >
                  <Icon name="back" size={16} weight={2.2} />
                </button>
              </Show>
              <span
                style={`position:relative;width:38px;height:38px;border-radius:999px;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:${seller().score < 80 ? RED_T : TEAL_T};color:${seller().score < 80 ? RED_TX : TEAL_TX}`}
              >
                {seller().ini}
              </span>
              <div style="flex:1;min-width:0">
                <div style="font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{seller().n[li()]}</div>
                <Show when={!thread().support}>
                  <div style="font-size:13px;color:#6f6d68;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px">
                    <Show when={listing()}>
                      {roomsLabel(listing())} · {addrOf(listing())} ·{' '}
                    </Show>
                    {t().honesty} {seller().score}%
                  </div>
                </Show>
              </div>
              <Show when={listing()}>
                <button
                  type="button"
                  class="bn-tap"
                  onClick={() => openListing(listing().id)}
                  style="padding:8px 12px;border-radius:11px;background:#f2f1ee;font-size:13px;font-weight:700;white-space:nowrap"
                >
                  {t().listingW}
                </button>
              </Show>
            </div>

            <VoiceMiniPlayer title={seller().n[li()]} />

            <div style="position:relative;flex:1;min-height:0;display:flex;flex-direction:column">
              <div
                ref={msgsRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
                }}
                style="flex:1;min-height:0;padding:24px 20px;display:flex;flex-direction:column;gap:16px;background:#fbfbfa;overflow-y:auto;overflow-x:hidden"
              >
                <Index each={thread().msgs}>
                  {(m, i) => {
                    const prevDate = () => thread().msgs[i - 1]?.date;
                    return (
                      <>
                        <Show when={m().date && m().date !== prevDate()}>
                          <div style="display:flex;align-items:center;justify-content:center;margin:4px 0 8px">
                            <span style="font-size:12px;font-weight:700;color:#8f8b85;background:#f0efec;padding:5px 12px;border-radius:999px">
                              {m().date}
                            </span>
                          </div>
                        </Show>
                        <MessageBubble m={m} />
                      </>
                    );
                  }}
                </Index>
              </div>
              <Show when={showScrollDown()}>
                <button
                  type="button"
                  class="bn-tap"
                  aria-label={t().scrollToBottomW}
                  onClick={() => {
                    msgsRef.scrollTo({ top: msgsRef.scrollHeight, behavior: 'smooth' });
                    setShowScrollDown(false);
                  }}
                  style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);width:38px;height:38px;border-radius:999px;background:#fff;box-shadow:0 10px 24px -8px rgba(28,27,25,.35);display:flex;align-items:center;justify-content:center;color:#4a4844;animation:bnUp .15s ease both"
                >
                  <Icon name="down" size={18} weight={2.2} />
                </button>
              </Show>
            </div>

            <div style="flex:0 0 auto">
              <Show when={!voice.recording()}>
                <Show when={showQuick()}>
                  <div style="padding:16px 20px 0;display:flex;gap:8px;flex-wrap:wrap">
                    <For each={['q1', 'q2', 'q3']}>
                      {(key) => (
                        <button
                          type="button"
                          class="bn-tap"
                          onClick={() => setState('draft', txt(key))}
                          style="padding:8px 12px;border-radius:999px;border:1px solid #e8e7e4;font-size:13px;font-weight:600"
                        >
                          {txt(key)}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>

                <div
                  style={`padding:16px 20px ${state.isMob ? 'calc(16px + env(safe-area-inset-bottom))' : '20px'};display:flex;gap:8px;align-items:center`}
                >
                  <input type="file" accept="image/*" ref={imageInputRef} style="display:none" onChange={onImagePicked} />
                  <input type="file" accept="video/*" ref={videoInputRef} style="display:none" onChange={onVideoPicked} />
                  <input type="file" ref={docInputRef} style="display:none" onChange={onDocPicked} />

                  <div style="position:relative;flex:0 0 auto">
                    <button
                      type="button"
                      class="bn-tap"
                      title={t().attachTitle}
                      aria-label={t().attachTitle}
                      aria-haspopup="menu"
                      aria-expanded={attachOpen()}
                      onClick={toggleAttach}
                      style={`${plainBtn};color:#6f6d68`}
                    >
                      <Icon name="paperclip" size={22} weight={1.7} />
                    </button>
                    <Show when={attachOpen()}>
                      <div
                        role="menu"
                        onClick={(e) => e.stopPropagation()}
                        style="position:absolute;bottom:calc(100% + 8px);left:0;z-index:30;width:208px;background:#fff;border-radius:16px;padding:6px;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7"
                      >
                        <button type="button" class="bn-tap" role="menuitem" onClick={pickImage} style={attachRowStyle}>
                          <AttachIcon name="image" bg={TEAL_T} fg={TEAL} />
                          {t().attachPhoto}
                        </button>
                        <button type="button" class="bn-tap" role="menuitem" onClick={pickVideo} style={attachRowStyle}>
                          <AttachIcon name="video" bg={TEAL_T} fg={TEAL} />
                          {t().attachVideo}
                        </button>
                        <button type="button" class="bn-tap" role="menuitem" onClick={pickDoc} style={attachRowStyle}>
                          <AttachIcon name="doc" bg={SOFT} fg="#4a4844" />
                          {t().attachDoc}
                        </button>
                        <button type="button" class="bn-tap" role="menuitem" onClick={shareLocation} style={attachRowStyle}>
                          <AttachIcon name="pin" bg={RED_T} fg={RED} />
                          {t().attachLoc}
                        </button>
                      </div>
                    </Show>
                  </div>

                  <div
                    class="bn-ring"
                    style="flex:1;min-width:0;display:flex;align-items:center;gap:2px;padding:4px 6px 4px 12px;border-radius:24px;border:1px solid #e8e7e4;background:#fbfbfa"
                  >
                    <div style="position:relative;flex:0 0 auto">
                      <button
                        type="button"
                        class="bn-tap"
                        title={t().emojiTitle}
                        aria-label={t().emojiTitle}
                        aria-haspopup="menu"
                        aria-expanded={emojiOpen()}
                        onClick={toggleEmoji}
                        style={`${plainBtn};color:#8f8b85`}
                      >
                        <Icon name="smile" size={20} weight={1.7} />
                      </button>
                      <Show when={emojiOpen()}>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style="position:absolute;bottom:calc(100% + 8px);left:-8px;z-index:30;width:236px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7"
                        >
                          <div style="max-height:200px;overflow-y:auto;padding:8px;display:grid;grid-template-columns:repeat(6,1fr);gap:4px">
                            <For each={EMOJI}>
                              {(e) => (
                                <button
                                  type="button"
                                  class="bn-tap"
                                  onClick={() => insertEmoji(e)}
                                  style="display:flex;align-items:center;justify-content:center;font-size:20px;padding:4px;border-radius:8px"
                                >
                                  {e}
                                </button>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                    </div>

                    <input
                      value={state.draft}
                      onInput={(e) => setState('draft', e.currentTarget.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
                      onFocus={() => {
                        setEmojiOpen(false);
                        setAttachOpen(false);
                      }}
                      placeholder={t().msgPh}
                      style="flex:1;min-width:0;border:0;background:transparent;padding:10px 2px;font-size:15px"
                    />

                    <Show
                      when={(state.draft || '').trim() || thread().support}
                      fallback={
                        <button
                          type="button"
                          class="bn-tap"
                          title={t().micTitle}
                          aria-label={t().micTitle}
                          onClick={voice.start}
                          style={`${plainBtn};color:${TEAL}`}
                        >
                          <Icon name="mic" size={20} weight={1.8} />
                        </button>
                      }
                    >
                      <button
                        type="button"
                        class="bn-tap"
                        title={t().sendW}
                        aria-label={t().sendW}
                        onClick={sendMsg}
                        style={`${plainBtn};color:${TEAL}`}
                      >
                        <Icon name="send" size={19} weight={1.9} />
                      </button>
                    </Show>
                  </div>
                </div>
              </Show>

              <Show when={voice.recording()}>
                <div
                  style={`padding:16px 20px ${state.isMob ? 'calc(16px + env(safe-area-inset-bottom))' : '20px'};display:flex;gap:12px;align-items:center`}
                >
                  <button
                    type="button"
                    class="bn-tap"
                    title={t().recCancel}
                    aria-label={t().recCancel}
                    onClick={() => voice.stop(false)}
                    style="width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#f2f1ee;color:#93331f;flex:0 0 auto"
                  >
                    <Icon name="trash" size={18} weight={1.9} />
                  </button>
                  <div style="flex:1;display:flex;align-items:center;gap:9px;padding:13px 16px;border-radius:14px;background:#fceeeb;min-width:0">
                    <span style="width:9px;height:9px;border-radius:999px;background:#c2452f;display:block;animation:bnPulse 1.2s infinite;flex:0 0 auto" />
                    <div style="flex:1;display:flex;align-items:center;gap:2px;height:20px;min-width:0">
                      <For each={voice.levels()}>
                        {(v) => <div style={`flex:1;min-width:2px;height:${3 + Math.min(1, v * 6) * 17}px;border-radius:999px;background:#c2452f;transition:height .08s linear`} />}
                      </For>
                    </div>
                    <span style="font-size:14px;font-weight:700;color:#93331f;font-variant-numeric:tabular-nums;flex:0 0 auto">
                      {fmtSec(voice.seconds())}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="bn-tap"
                    title={t().recSend}
                    aria-label={t().recSend}
                    onClick={() => voice.stop(true)}
                    style={`width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:${TEAL};color:#fff;flex:0 0 auto`}
                  >
                    <Icon name="stop" size={18} fill="currentColor" />
                  </button>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
