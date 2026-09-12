export function plural(n, forms) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export const UNIT = {
  listing: ['объявление', 'объявления', 'объявлений'],
  user: ['пользователь', 'пользователя', 'пользователей'],
  complaint: ['жалоба', 'жалобы', 'жалоб'],
  category: ['категория', 'категории', 'категорий'],
  message: ['сообщение', 'сообщения', 'сообщений']
};
