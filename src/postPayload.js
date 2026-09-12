export function buildListingPayload(p) {
  return {
    deal: p.deal,
    city: p.city,
    d: p.dist,
    street: p.street,
    price: parseInt(String(p.price).replace(/\s/g, ''), 10) || 0,
    rooms: parseInt(p.rooms, 10) || 0,
    area: parseInt(p.area, 10) || 0,
    fl: parseInt(p.fl, 10) || 1,
    fls: parseInt(p.fls, 10) || 1,
    f: Object.keys(p.feats).filter((k) => p.feats[k]),
    desc: p.desc,
    dep: p.dep,
    cadastreCode: (p.cadastreCode || '').trim(),
    repairCondition: p.repair
  };
}
