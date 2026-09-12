import { INK } from '../../theme';

export default function Kpi(props) {
  return (
    <div style={`padding:20px;border-radius:16px;box-shadow:0 1px 2px rgba(28,27,25,.05);background:${props.bg || '#fff'}`}>
      <div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6f6d68">{props.label}</div>
      <div style={`font-size:31px;font-weight:800;letter-spacing:-.03em;margin-top:8px;color:${props.fg || INK}`}>{props.value}</div>
      <div style="font-size:12.5px;color:#6f6d68;margin-top:4px">{props.note}</div>
    </div>
  );
}
