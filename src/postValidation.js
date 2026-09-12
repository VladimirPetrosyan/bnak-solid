import { isValidRepairCondition } from './repairCondition';

export function postStepErrorKey(step, s) {
  if (step === 1) {
    if (!s.street.trim()) return 'errStreet';
    if (s.phone.replace(/\D/g, '').length < 8) return 'errPhone';
  }
  if (step === 2) {
    if (!parseInt(s.area, 10) || !parseInt(s.fl, 10)) return 'errArea';
    if (s.photos < 5) return 'errPhotos';
    if (!isValidRepairCondition(s.repair)) return 'errRepairCondition';
  }
  if (step === 3 && !(parseInt(String(s.price).replace(/\s/g, ''), 10) || 0)) return 'errPrice';
  if (step === 4) {
    if (!s.doc) return 'errDoc';
    if (!s.cadastreCode.trim()) return 'errCadastre';
    if (!s.agree) return 'errAgree';
  }
  return null;
}
