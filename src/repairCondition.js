export const REPAIR_CONDITIONS = ['none', 'needs', 'cosmetic', 'good', 'designer'];

export const REPAIR_LABELS = {
  none: ['Առանց վերանորոգման', 'Без ремонта', 'No renovation'],
  needs: ['Պահանջում է վերանորոգում', 'Требует ремонта', 'Needs renovation'],
  cosmetic: ['Կոսմետիկ վերանորոգում', 'Косметический ремонт', 'Cosmetic renovation'],
  good: ['Լավ ժամանակակից վերանորոգում', 'Хороший современный ремонт', 'Good modern renovation'],
  designer: ['Դիզայներական վերանորոգում', 'Дизайнерский ремонт', 'Designer renovation']
};

export const REPAIR_HINTS = {
  none: [
    'Հարդարանք չկա կամ սև հարդարանք է՝ պատրաստ սեփական վերանորոգման',
    'Черновая отделка или её отсутствие — под собственный ремонт',
    'Bare shell or unfinished — ready for your own renovation'
  ],
  needs: [
    'Հին հարդարանք է, անհրաժեշտ է վերանորոգում մինչև բնակվելը',
    'Старая отделка, требуется ремонт перед заселением',
    'Worn finish — needs work before moving in'
  ],
  cosmetic: [
    'Թարմ, թեթև հարդարանք՝ առանց հիմնանորոգման',
    'Свежая косметика без капитальных изменений',
    'Fresh surface finish without major changes'
  ],
  good: [
    'Ամբողջական, ժամանակակից հարդարանք, պատրաստ բնակվելու համար',
    'Полноценный современный ремонт, можно сразу заезжать',
    'Complete modern renovation, move-in ready'
  ],
  designer: [
    'Հեղինակային նախագծով պրեմիում հարդարանք',
    'Премиальная отделка по авторскому проекту',
    'Premium finish from a designer project'
  ]
};

export function isValidRepairCondition(v) {
  return REPAIR_CONDITIONS.includes(v);
}

export function repairConditionLabel(value, li) {
  return isValidRepairCondition(value) ? REPAIR_LABELS[value][li] : null;
}

export function repairConditionHint(value, li) {
  return isValidRepairCondition(value) ? REPAIR_HINTS[value][li] : null;
}
