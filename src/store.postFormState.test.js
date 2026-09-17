import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => {
  class ApiError extends Error {
    constructor(code, status) {
      super(code);
      this.code = code;
      this.status = status;
    }
  }
  return {
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(), upload: vi.fn(), blob: vi.fn() },
    setAuthToken: vi.fn(),
    getAuthToken: vi.fn(),
    setApiLang: vi.fn(),
    fileURL: (p) => p,
    ApiError
  };
});

globalThis.window = globalThis.window || { innerWidth: 1024, scrollTo: () => {}, location: { pathname: '/' } };
globalThis.localStorage = globalThis.localStorage || {
  data: {},
  getItem(k) {
    return k in this.data ? this.data[k] : null;
  },
  setItem(k, v) {
    this.data[k] = String(v);
  },
  removeItem(k) {
    delete this.data[k];
  }
};

const { setState, postState, setPost } = await import('./store');
const { postStepErrorKeys } = await import('./postValidation');

beforeEach(() => {
  vi.clearAllMocks();
  setState({ post: null, user: { role: 'hotel', phone: '+374 551 234 56' } });
});

describe('hotel post form: clearing the title after a blocked step-1 submit', () => {
  it('does not resurrect the cleared title, and re-runs street validation instead of keeping the stale error', () => {
    // 1) название "Тест", адрес пуст
    setPost({ deal: 'hotel', title: 'Тест' });
    let keys = postStepErrorKeys(1, postState());
    expect(keys).toContain('errStreet');
    expect(keys).not.toContain('errHotelRequired');

    // 2) очищаем название
    setPost({ title: '' });
    expect(postState().title).toBe(''); // пустая строка — не должна трактоваться как "нет изменения"

    // 3) заполняем адрес
    setPost({ street: 'Абовяна 1' });

    // 4) переход на шаг 2 должен блокироваться из-за пустого названия,
    //    и старая ошибка про улицу не должна пережить валидный ввод адреса
    keys = postStepErrorKeys(1, postState());
    expect(keys).toContain('errHotelRequired');
    expect(keys).not.toContain('errStreet');
    expect(postState().street).toBe('Абовяна 1');
    expect(postState().title).toBe('');
  });
});
