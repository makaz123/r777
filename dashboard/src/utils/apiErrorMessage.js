const FIELD_LABELS = {
  name: 'Client name',
  userName: 'User name',
  accountType: 'Account type',
  password: 'Password',
  masterPassword: 'Master password',
  balance: 'Balance',
  creditReference: 'Credit reference',
  partnership: 'Partnership',
};

const GENERIC_SERVER_MESSAGES = new Set([
  'Server error',
  'Operation failed',
  'Internal server error',
]);

function formatValidationDetail(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const requiredMatch = raw.match(/Path `(\w+)` is required\.?/i);
  if (requiredMatch) {
    const field = requiredMatch[1];
    const label = FIELD_LABELS[field] || field;
    return `${label} is required.`;
  }

  const fieldSegment = raw.match(/:\s*(\w+):\s*Path/i);
  if (fieldSegment) {
    const field = fieldSegment[1];
    const label = FIELD_LABELS[field] || field;
    if (/required/i.test(raw)) return `${label} is required.`;
  }

  const withoutPrefix = raw.replace(/^[A-Za-z]+ validation failed:\s*/i, '');
  return withoutPrefix.trim() || raw;
}

export function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) {
    return typeof error === 'string' ? error : error?.message || 'Something went wrong';
  }

  const detail = data.error || data.details;
  const message = data.message;

  if (detail) {
    const formatted = formatValidationDetail(detail);
    if (
      formatted &&
      (!message || GENERIC_SERVER_MESSAGES.has(message))
    ) {
      return formatted;
    }
  }

  if (message && !GENERIC_SERVER_MESSAGES.has(message)) {
    return message;
  }

  if (detail) {
    return formatValidationDetail(detail) || detail;
  }

  return message || error?.message || 'Something went wrong';
}
