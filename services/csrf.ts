export const getCsrfToken = () => {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];
};

export const csrfHeaders = (headers: HeadersInit = {}): HeadersInit => {
  const token = getCsrfToken();
  return token ? { ...headers, 'X-XSRF-TOKEN': decodeURIComponent(token) } : headers;
};
