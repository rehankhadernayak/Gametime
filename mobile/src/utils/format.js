export function fmtDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export function sanitizeText(value) {
  return String(value || '').replace(/[<>]/g, '').trim();
}

export function getErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return 'Something went wrong';
}
