import { createBrowserClient as createSSRBrowserClient, createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Browser client singleton (for client-side components) - uses cookies
let browserClient: ReturnType<typeof createSSRBrowserClient<Database>> | null = null;

export const createBrowserClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserClient should only be called on the client side');
  }

  // Client-side: reuse singleton instance with cookie support
  if (!browserClient) {
    browserClient = createSSRBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return document.cookie.split('; ').map(cookie => {
            const [name, ...rest] = cookie.split('=');
            return { name, value: decodeURIComponent(rest.join('=')) };
          });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = `${name}=${encodeURIComponent(value)}; path=${options?.path || '/'}; ${options?.maxAge ? `max-age=${options.maxAge};` : ''} ${options?.sameSite ? `sameSite=${options.sameSite};` : ''} ${options?.secure ? 'secure;' : ''}`;
          });
        },
    },
  });
  }

  return browserClient;
};

// Server client (for server components and API routes) - uses cookies from Next.js
export const createServerClient = async () => {
  // Dynamically import cookies to avoid issues with client components
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return createSSRServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
};

// Service role client (for admin operations, bypasses RLS)
export const createServiceClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
};

