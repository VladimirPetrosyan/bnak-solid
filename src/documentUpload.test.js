import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateDocumentFile,
  buildListingFormData,
  formatFileSize,
  documentFile,
  setDocumentFile,
  clearDocumentFile,
  MAX_DOCUMENT_SIZE
} from './documentUpload';

function makeFile(type, size, name = 'cert.pdf') {
  const bytes = new Uint8Array(size);
  return new File([bytes], name, { type });
}

describe('validateDocumentFile', () => {
  it('accepts a valid pdf under the size limit', () => {
    expect(validateDocumentFile(makeFile('application/pdf', 1024))).toBeNull();
  });

  it('accepts jpeg and png', () => {
    expect(validateDocumentFile(makeFile('image/jpeg', 1024))).toBeNull();
    expect(validateDocumentFile(makeFile('image/png', 1024))).toBeNull();
  });

  it('flags a missing file', () => {
    expect(validateDocumentFile(null)).toBe('missing');
    expect(validateDocumentFile(undefined)).toBe('missing');
  });

  it('flags a disallowed type', () => {
    expect(validateDocumentFile(makeFile('application/zip', 1024))).toBe('type');
    expect(validateDocumentFile(makeFile('text/plain', 1024))).toBe('type');
  });

  it('flags an empty file', () => {
    expect(validateDocumentFile(makeFile('application/pdf', 0))).toBe('size');
  });

  it('flags a file over the size limit', () => {
    expect(validateDocumentFile(makeFile('application/pdf', MAX_DOCUMENT_SIZE + 1))).toBe('size');
  });

  it('accepts a file exactly at the size limit', () => {
    expect(validateDocumentFile(makeFile('application/pdf', MAX_DOCUMENT_SIZE))).toBeNull();
  });
});

describe('buildListingFormData', () => {
  it('packs the listing JSON and the document file into one FormData', () => {
    const body = { street: 'Abovyan 41', price: 100000 };
    const file = makeFile('application/pdf', 10);
    const form = buildListingFormData(body, file);

    expect(JSON.parse(form.get('listing'))).toEqual(body);
    expect(form.get('document')).toBe(file);
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});

describe('documentFile store', () => {
  beforeEach(() => clearDocumentFile());

  it('starts empty', () => {
    expect(documentFile()).toBeNull();
  });

  it('holds the selected file', () => {
    const file = makeFile('application/pdf', 10);
    setDocumentFile(file);
    expect(documentFile()).toBe(file);
  });

  it('clears the selected file', () => {
    setDocumentFile(makeFile('application/pdf', 10));
    clearDocumentFile();
    expect(documentFile()).toBeNull();
  });
});
