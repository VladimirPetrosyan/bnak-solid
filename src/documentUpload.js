import { createSignal } from 'solid-js';

export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

export function validateDocumentFile(file) {
  if (!file) return 'missing';
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) return 'type';
  if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE) return 'size';
  return null;
}

export function buildListingFormData(listingBody, file) {
  const form = new FormData();
  form.append('listing', JSON.stringify(listingBody));
  form.append('document', file);
  return form;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const [documentFile, setDocumentFileSignal] = createSignal(null);

export { documentFile };

export function setDocumentFile(file) {
  setDocumentFileSignal(file);
}

export function clearDocumentFile() {
  setDocumentFileSignal(null);
}
