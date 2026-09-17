import { t, go } from '../store';
import Icon from '../components/Icon';

function navClick(e, screen) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go(screen);
}

export default function NotFound() {
  return (
    <div style="width:100%;max-width:760px;margin:0 auto;padding:clamp(48px,10vw,96px) clamp(14px,3vw,28px);text-align:center;animation:bnIn .2s ease">
      <span style="display:inline-flex;width:64px;height:64px;border-radius:20px;background:#f2f1ee;align-items:center;justify-content:center">
        <Icon name="search" size={28} stroke="#9a9793" weight={1.7} />
      </span>
      <h1 style="margin:20px 0 0;font-size:clamp(24px,4vw,32px);font-weight:800;letter-spacing:-.03em">{t().notFoundTitle}</h1>
      <div style="margin-top:10px;font-size:15px;line-height:1.6;color:#6f6d68;max-width:48ch;margin-left:auto;margin-right:auto">
        {t().notFoundText}
      </div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:26px">
        <a
          href="/"
          class="bn-tap"
          onClick={(e) => navClick(e, 'search')}
          style="display:inline-flex;padding:13px 20px;border-radius:13px;background:#0e7c73;color:#fff;font-size:14px;font-weight:700;text-decoration:none"
        >
          {t().notFoundToSearch}
        </a>
        <a
          href="/"
          class="bn-tap"
          onClick={(e) => navClick(e, 'search')}
          style="display:inline-flex;padding:13px 20px;border-radius:13px;background:#f2f1ee;color:#1c1b19;font-size:14px;font-weight:700;text-decoration:none"
        >
          {t().notFoundToHome}
        </a>
      </div>
    </div>
  );
}
