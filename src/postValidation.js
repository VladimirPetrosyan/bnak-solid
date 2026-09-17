import { isValidRepairCondition } from './repairCondition';

export const MAX_STREET_LEN = 120;
export const MAX_DESC_LEN = 1500;
export const MAX_AREA = 3000;
export const MAX_FLOORS_TOTAL = 200;

function stepErrorKeys(step, s) {
  const hotel = s.deal === 'hotel';
  const keys = [];
  if (step === 1) {
    if (hotel && !(s.title || '').trim()) keys.push('errHotelRequired');
    const street = s.street.trim();
    if (!street) keys.push('errStreet');
    else if (street.length > MAX_STREET_LEN) keys.push('errStreetTooLong');
    if (s.phone.replace(/\D/g, '').length < 8) keys.push('errPhone');
  }
  if (step === 2) {
    if (!hotel) {
      const area = parseInt(s.area, 10);
      if (!area || area <= 0) keys.push('errArea');
      else if (area > MAX_AREA) keys.push('errAreaRange');
      const fls = parseInt(s.fls, 10);
      if (!fls || fls < 1 || fls > MAX_FLOORS_TOTAL) keys.push('errFloorsTotal');
      const fl = parseInt(s.fl, 10);
      if (!fl || fl < 1 || fl > MAX_FLOORS_TOTAL) keys.push('errFloor');
      else if (fls >= 1 && fl > fls) keys.push('errFloorExceeds');
      if (!isValidRepairCondition(s.repair)) keys.push('errRepairCondition');
    }
    if ((s.desc || '').length > MAX_DESC_LEN) keys.push('errDescTooLong');
    if (s.photos < 5) keys.push('errPhotos');
  }
  if (step === 3 && !hotel && !(parseInt(String(s.price).replace(/\s/g, ''), 10) || 0)) keys.push('errPrice');
  if (step === 4) {
    if (!s.doc) keys.push('errDoc');
    if (!hotel && !s.cadastreCode.trim()) keys.push('errCadastre');
    if (!s.agree) keys.push('errAgree');
  }
  return keys;
}

export function postStepErrorKeys(step, s) {
  return stepErrorKeys(step, s);
}

export function postStepErrorKey(step, s) {
  return stepErrorKeys(step, s)[0] || null;
}
