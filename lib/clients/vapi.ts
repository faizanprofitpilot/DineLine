import axios from 'axios';

function getVapiClient() {
  const apiKey = process.env.VAPI_API_KEY;

  if (!apiKey) {
    // During build, return a mock client to avoid errors
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
      return {
        post: async () => ({ data: {} }),
        get: async () => ({ data: {} }),
        put: async () => ({ data: {} }),
        delete: async () => ({ data: {} }),
      } as any;
    }
    throw new Error('Missing VAPI_API_KEY');
  }

  return axios.create({
    baseURL: 'https://api.vapi.ai',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
}

// Export as getter for lazy initialization
export const vapi = new Proxy({} as ReturnType<typeof getVapiClient>, {
  get(_target, prop) {
    const client = getVapiClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

