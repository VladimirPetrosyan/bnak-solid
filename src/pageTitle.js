const SUFFIX = ' — HayHome';
const DEFAULT_TITLE = 'HayHome — жильё в Армении';

export function pageTitle(screen, ctx, t) {
  switch (screen) {
    case 'search':
      return `${ctx.dealTitle} · ${ctx.city}${SUFFIX}`;
    case 'map':
      return `${t.mapPageTitle}${SUFFIX}`;
    case 'chat':
      return `${t.messages}${SUFFIX}`;
    case 'auth':
      return `${t.signin}${SUFFIX}`;
    case 'fav':
      return `${t.favs}${SUFFIX}`;
    case 'post':
      return `${t.post}${SUFFIX}`;
    case 'cabinet':
      return `${t.cabinet}${SUFFIX}`;
    case 'profile':
      return `${t.profileTitle}${SUFFIX}`;
    case 'legal':
      return `${ctx.legalTitle}${SUFFIX}`;
    case 'listing':
      return ctx.listingTitle ? `${ctx.listingTitle}${SUFFIX}` : DEFAULT_TITLE;
    case 'notFound':
      return `${t.notFoundTitle}${SUFFIX}`;
    default:
      return DEFAULT_TITLE;
  }
}
