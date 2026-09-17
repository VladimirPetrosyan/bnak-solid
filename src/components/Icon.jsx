import rawSearch from '@tabler/icons/outline/search.svg?raw';
import rawHeart from '@tabler/icons/outline/heart.svg?raw';
import rawChat from '@tabler/icons/outline/message-circle.svg?raw';
import rawPin from '@tabler/icons/outline/map-pin.svg?raw';
import rawCheck from '@tabler/icons/outline/check.svg?raw';
import rawChecks from '@tabler/icons/outline/checks.svg?raw';
import rawPlus from '@tabler/icons/outline/plus.svg?raw';
import rawMinus from '@tabler/icons/outline/minus.svg?raw';
import rawClose from '@tabler/icons/outline/x.svg?raw';
import rawDown from '@tabler/icons/outline/chevron-down.svg?raw';
import rawBack from '@tabler/icons/outline/chevron-left.svg?raw';
import rawNext from '@tabler/icons/outline/chevron-right.svg?raw';
import rawPhone from '@tabler/icons/outline/phone.svg?raw';
import rawMap from '@tabler/icons/outline/map-2.svg?raw';
import rawList from '@tabler/icons/outline/list.svg?raw';
import rawSliders from '@tabler/icons/outline/adjustments-horizontal.svg?raw';
import rawWarn from '@tabler/icons/outline/alert-triangle.svg?raw';
import rawAlert from '@tabler/icons/outline/alert-circle.svg?raw';
import rawUpload from '@tabler/icons/outline/upload.svg?raw';
import rawArchive from '@tabler/icons/outline/archive.svg?raw';
import rawUser from '@tabler/icons/outline/user.svg?raw';
import rawHome from '@tabler/icons/outline/home.svg?raw';
import rawBuilding from '@tabler/icons/outline/building.svg?raw';
import rawImage from '@tabler/icons/outline/photo.svg?raw';
import rawMic from '@tabler/icons/outline/microphone.svg?raw';
import rawVideo from '@tabler/icons/outline/video.svg?raw';
import rawSmile from '@tabler/icons/outline/mood-smile.svg?raw';
import rawTrash from '@tabler/icons/outline/trash.svg?raw';
import rawStop from '@tabler/icons/filled/player-stop.svg?raw';
import rawPaperclip from '@tabler/icons/outline/paperclip.svg?raw';
import rawSend from '@tabler/icons/outline/send.svg?raw';
import rawDoc from '@tabler/icons/outline/file-text.svg?raw';
import rawShield from '@tabler/icons/outline/shield-check.svg?raw';
import rawEdit from '@tabler/icons/outline/edit.svg?raw';
import rawEye from '@tabler/icons/outline/eye.svg?raw';
import rawCalendar from '@tabler/icons/outline/calendar.svg?raw';
import rawRefresh from '@tabler/icons/outline/refresh.svg?raw';
import rawPlay from '@tabler/icons/filled/player-play.svg?raw';
import rawPause from '@tabler/icons/filled/player-pause.svg?raw';
import rawVolume from '@tabler/icons/outline/volume.svg?raw';
import rawVolumeOff from '@tabler/icons/outline/volume-off.svg?raw';
import rawMaximize from '@tabler/icons/outline/maximize.svg?raw';
import rawMessageLanguage from '@tabler/icons/outline/message-language.svg?raw';
import rawStar from '@tabler/icons/outline/star.svg?raw';
import rawStarFilled from '@tabler/icons/filled/star.svg?raw';

function shapesOf(svg) {
  const shapes = [...svg.matchAll(/<(path|circle)\b([^>]*)\/?>/g)]
    .map(([, tag, attrs]) => ({ tag, attrs }))
    .filter(({ attrs }) => !/stroke="none"/.test(attrs));
  return shapes.map(({ tag, attrs }) => {
    const num = (name) => Number(attrs.match(new RegExp(`${name}="([-\\d.]+)"`))?.[1]);
    if (tag === 'circle') return { tag, cx: num('cx'), cy: num('cy'), r: num('r') };
    return { tag, d: attrs.match(/\sd="([^"]+)"/)[1] };
  });
}

const ICONS = {
  search: shapesOf(rawSearch),
  heart: shapesOf(rawHeart),
  chat: shapesOf(rawChat),
  pin: shapesOf(rawPin),
  check: shapesOf(rawCheck),
  checks: shapesOf(rawChecks),
  plus: shapesOf(rawPlus),
  minus: shapesOf(rawMinus),
  close: shapesOf(rawClose),
  down: shapesOf(rawDown),
  back: shapesOf(rawBack),
  next: shapesOf(rawNext),
  phone: shapesOf(rawPhone),
  map: shapesOf(rawMap),
  list: shapesOf(rawList),
  sliders: shapesOf(rawSliders),
  warn: shapesOf(rawWarn),
  alert: shapesOf(rawAlert),
  upload: shapesOf(rawUpload),
  archive: shapesOf(rawArchive),
  user: shapesOf(rawUser),
  home: shapesOf(rawHome),
  building: shapesOf(rawBuilding),
  image: shapesOf(rawImage),
  mic: shapesOf(rawMic),
  video: shapesOf(rawVideo),
  smile: shapesOf(rawSmile),
  trash: shapesOf(rawTrash),
  stop: shapesOf(rawStop),
  paperclip: shapesOf(rawPaperclip),
  send: shapesOf(rawSend),
  doc: shapesOf(rawDoc),
  shield: shapesOf(rawShield),
  edit: shapesOf(rawEdit),
  eye: shapesOf(rawEye),
  calendar: shapesOf(rawCalendar),
  refresh: shapesOf(rawRefresh),
  play: shapesOf(rawPlay),
  pause: shapesOf(rawPause),
  volume: shapesOf(rawVolume),
  volumeOff: shapesOf(rawVolumeOff),
  maximize: shapesOf(rawMaximize),
  messageLanguage: shapesOf(rawMessageLanguage),
  star: shapesOf(rawStar),
  starFilled: shapesOf(rawStarFilled)
};

const FILLED = new Set(['stop', 'play', 'pause', 'starFilled']);

export default function Icon(props) {
  return (
    <svg
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
      fill={FILLED.has(props.name) ? props.stroke || 'currentColor' : 'none'}
      stroke={FILLED.has(props.name) ? 'none' : props.stroke || 'currentColor'}
      stroke-width={props.weight || 1.8}
      stroke-linecap="round"
      stroke-linejoin="round"
      style={props.style}
    >
      {(ICONS[props.name] || []).map((s) => (s.tag === 'circle' ? <circle cx={s.cx} cy={s.cy} r={s.r} /> : <path d={s.d} />))}
    </svg>
  );
}
