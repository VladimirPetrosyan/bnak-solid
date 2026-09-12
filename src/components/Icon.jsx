const PATHS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.3-4.3',
  heart: 'M19.5 13.6c1.3-1.4 1.9-2.9 1.9-4.4A4.5 4.5 0 0 0 12 7.2 4.5 4.5 0 0 0 2.6 9.2c0 3.5 4.5 7.4 9.4 11 2.2-1.7 5.4-3.9 7.5-6.6z',
  chat: 'M21 11.8a8 8 0 0 1-11.7 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 11.8z',
  pin: 'M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z',
  check: 'M4 12.5l5 5L20 6.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M6 12h12',
  close: 'M6 6l12 12M18 6L6 18',
  down: 'M6 9l6 6 6-6',
  back: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1.5 1.5 0 0 1-1.7 1.5C10.8 19.6 4.4 13.2 3.5 5.7A1.5 1.5 0 0 1 5 4z',
  map: 'M9 3.5L3.5 6v14.5L9 18l6 2.5 5.5-2.5V3.5L15 6 9 3.5z',
  list: 'M4 6h16M4 12h16M4 18h16',
  sliders: 'M4 7h11M19 7h1M4 17h4M12 17h8',
  warn: 'M12 9v4.5M12 16.8v.2M10.3 4.4L3 17.2A2 2 0 0 0 4.7 20h14.6a2 2 0 0 0 1.7-2.8L13.7 4.4a2 2 0 0 0-3.4 0z',
  alert: 'M12 7.6v5.6M12 16.4v.2',
  upload: 'M12 16V5M8 9l4-4 4 4M5 19h14',
  archive: 'M3.5 6.5h17v4h-17zM5.5 10.5v9h13v-9M10 14.5h4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  home: 'M4 11l8-6.5 8 6.5M6.5 10v9h11v-9',
  building: 'M4 20V6.5L11 4v16M11 20h9V10h-9M14.5 13.5h2M14.5 16.5h2',
  image: 'M3 15l4.5-4 4 3.5 3-2.5L21 16',
  mic: 'M9 4.5v6a3 3 0 0 0 6 0v-6a3 3 0 0 0-6 0zM6 10.5a6 6 0 0 0 12 0M12 19.5V22M9 22h6',
  video: 'M4.5 7h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM15.5 10.3l4.3-2.6v8.6l-4.3-2.6',
  smile: 'M8.3 10.3h.01M15.7 10.3h.01M8 14.5a4.5 4.7 0 0 0 8 0',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v6M14 11v6',
  stop: 'M9 6h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z',
  paperclip: 'M21 11.5L12.4 20a4.5 4.5 0 0 1-6.4-6.4l8.2-8.2a3 3 0 0 1 4.3 4.3l-8.2 8.2a1.5 1.5 0 0 1-2.1-2.1l7.1-7.1',
  send: 'M21.5 2.5L10.8 13.2M21.5 2.5L14.7 21l-3.9-7.8-7.8-3.9 18.5-6.8z',
  doc: 'M6.5 3h7l4 4v14h-11zM13.5 3v4h4',
  shield: 'M12 3.5l7 2.8v5.4c0 4.8-3 8.7-7 9.8-4-1.1-7-5-7-9.8V6.3l7-2.8zM9 12l2 2 4-4.2',
  edit: 'M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1zM14.5 6.5l3 3',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z',
  calendar: 'M4.5 5h15v15h-15zM4.5 9.5h15M8.5 3v4M15.5 3v4',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'
};

export default function Icon(props) {
  return (
    <svg
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
      fill={props.fill || 'none'}
      stroke={props.stroke || 'currentColor'}
      stroke-width={props.weight || 1.8}
      stroke-linecap="round"
      stroke-linejoin="round"
      style={props.style}
    >
      {props.name === 'alert' ? <circle cx="12" cy="12" r="9" /> : null}
      {props.name === 'search' ? <circle cx="11" cy="11" r="7" /> : null}
      {props.name === 'pin' ? <circle cx="12" cy="10" r="2.4" /> : null}
      {props.name === 'sliders' ? (
        <>
          <circle cx="17" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </>
      ) : null}
      {props.name === 'smile' ? <circle cx="12" cy="12" r="9" /> : null}
      {props.name === 'eye' ? <circle cx="12" cy="12" r="2.6" /> : null}
      <path d={props.name === 'search' ? 'M20 20l-4.3-4.3' : PATHS[props.name]} />
    </svg>
  );
}
