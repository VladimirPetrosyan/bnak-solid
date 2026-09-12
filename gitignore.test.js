import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

function patternToRegex(pattern) {
  const anchored = pattern.startsWith('/');
  const body = anchored ? pattern.slice(1) : pattern;
  const escaped = body
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return { anchored, regex: new RegExp(`^${escaped}$`) };
}

function isIgnored(lines, filename) {
  let ignored = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const negate = line.startsWith('!');
    const pattern = (negate ? line.slice(1) : line).replace(/\/$/, '');
    const { anchored, regex } = patternToRegex(pattern);
    const segments = filename.split('/');
    const matched = anchored
      ? regex.test(filename)
      : regex.test(filename) || segments.some((seg) => regex.test(seg));
    if (matched) ignored = !negate;
  }
  return ignored;
}

describe('.gitignore', () => {
  const lines = readFileSync(new URL('.gitignore', import.meta.url), 'utf8').split('\n');

  it('ignores dependencies and build output', () => {
    expect(isIgnored(lines, 'node_modules')).toBe(true);
    expect(isIgnored(lines, 'dist')).toBe(true);
    expect(isIgnored(lines, '.vite')).toBe(true);
  });

  it('ignores env secrets', () => {
    expect(isIgnored(lines, '.env')).toBe(true);
    expect(isIgnored(lines, '.env.local')).toBe(true);
    expect(isIgnored(lines, '.env.production')).toBe(true);
    expect(isIgnored(lines, 'backend/config.local')).toBe(true);
  });

  it('keeps .env.example tracked', () => {
    expect(isIgnored(lines, '.env.example')).toBe(false);
  });

  it('ignores local tool, IDE and cache directories, including nested files', () => {
    expect(isIgnored(lines, '.claude')).toBe(true);
    expect(isIgnored(lines, '.claude/settings.json')).toBe(true);
    expect(isIgnored(lines, '.idea')).toBe(true);
    expect(isIgnored(lines, '.idea/workspace.xml')).toBe(true);
    expect(isIgnored(lines, '.gocache')).toBe(true);
    expect(isIgnored(lines, '.gocache/x')).toBe(true);
    expect(isIgnored(lines, '.tmp')).toBe(true);
    expect(isIgnored(lines, '.tmp/build')).toBe(true);
    expect(isIgnored(lines, 'backend/.cache/go-build/xx/file')).toBe(true);
    expect(isIgnored(lines, '.cache/tool/file')).toBe(true);
  });

  it('ignores logs at root and inside backend', () => {
    expect(isIgnored(lines, 'frontend.log')).toBe(true);
    expect(isIgnored(lines, 'backend/server.log')).toBe(true);
  });

  it('ignores backend sqlite runtime files', () => {
    expect(isIgnored(lines, 'backend/bnak.db')).toBe(true);
    expect(isIgnored(lines, 'backend/bnak.db-wal')).toBe(true);
    expect(isIgnored(lines, 'backend/bnak.db-shm')).toBe(true);
  });

  it('ignores the backend binary', () => {
    expect(isIgnored(lines, 'backend/bnak-backend.exe')).toBe(true);
  });

  it('keeps backend and frontend sources tracked', () => {
    expect(isIgnored(lines, 'backend/main.go')).toBe(false);
    expect(isIgnored(lines, 'backend/go.mod')).toBe(false);
    expect(isIgnored(lines, 'backend/go.sum')).toBe(false);
    expect(isIgnored(lines, 'src/api.js')).toBe(false);
    expect(isIgnored(lines, 'src/App.jsx')).toBe(false);
    expect(isIgnored(lines, 'README.md')).toBe(false);
  });
});

describe('.env.example', () => {
  const content = readFileSync(new URL('.env.example', import.meta.url), 'utf8');
  const uuidLike = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  it('declares VITE_YANDEX_MAPS_API_KEY without a real key value', () => {
    const match = content.match(/^VITE_YANDEX_MAPS_API_KEY=(.*)$/m);
    expect(match).not.toBeNull();
    expect(uuidLike.test(match[1])).toBe(false);
  });
});
