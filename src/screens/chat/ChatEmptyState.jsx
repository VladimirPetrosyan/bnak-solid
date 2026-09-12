import { t, go } from '../../store';
import Icon from '../../components/Icon';

export default function ChatEmptyState() {
  return (
    <div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px">
      <div style="display:flex;align-items:center;justify-content:center;gap:12px">
        <span style="width:44px;height:44px;border-radius:14px;background:#f2f1ee;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto">
          <Icon name="chat" size={21} stroke="#9a9793" weight={1.7} />
        </span>
        <div style="font-size:20px;font-weight:800;letter-spacing:-.02em">{t().chatEmptyT}</div>
      </div>
      <div style="font-size:15px;color:#6f6d68;margin-top:7px;max-width:38ch">{t().chatEmptyS}</div>
      <button
        type="button"
        class="bn-tap"
        onClick={() => go('search')}
        style="display:inline-flex;margin-top:20px;padding:13px 20px;border-radius:13px;background:#0e7c73;color:#fff;font-size:14px;font-weight:700"
      >
        {t().searchW}
      </button>
    </div>
  );
}
