import { QueryClient } from '@tanstack/react-query';
import { getToken } from './authStorage';

// Her istekte gönderilecek kimlik doğrulama başlıklarını oluştur
// (iframe'de çerezler engellenebildiği için token'ı Authorization ile gönderiyoruz)
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      queryFn: async ({ queryKey }) => {
        if (typeof queryKey[0] === 'string') {
          const response = await fetch(queryKey[0], {
            credentials: 'include', // Cookies'leri göndermek için
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders(),
            },
          });
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        }
        throw new Error('Invalid query key');
      },
    },
  },
});

export async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Önemli: Cookies gönderimi sağlar
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
    body: options.body || (options.method !== 'GET' && options.method !== 'HEAD' && (options as any).data ? JSON.stringify((options as any).data) : undefined),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API Error');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}