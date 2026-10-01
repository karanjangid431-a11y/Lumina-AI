const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('lumina_token') || localStorage.getItem('token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('lumina_token', token);
  localStorage.setItem('token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('lumina_token');
  localStorage.removeItem('token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// API methods
export const api = {
  // Auth
  register: (body: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  guest: () => request('/auth/guest', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Workspaces
  getWorkspaces: () => request<{ workspaces: any[] }>('/workspaces'),
  getWorkspace: (wid: string) => request<{ workspace: any }>(`/workspaces/${wid}`),
  createWorkspace: (body: any) => request<{ workspace: any }>('/workspaces', { method: 'POST', body: JSON.stringify(body) }),
  updateWorkspace: (wid: string, body: any) => request<{ workspace: any }>(`/workspaces/${wid}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWorkspace: (wid: string) => request(`/workspaces/${wid}`, { method: 'DELETE' }),

  // Sources
  getSources: (wid: string) => request<{ sources: any[] }>(`/workspaces/${wid}/sources`),
  getSource: (wid: string, sid: string) => request<{ source: any; chunks: any[] }>(`/workspaces/${wid}/sources/${sid}`),
  uploadFile: (wid: string, formData: FormData) => request<{ source: any; chunkCount: number }>(`/workspaces/${wid}/sources/upload`, { method: 'POST', body: formData }),
  addUrl: (wid: string, url: string) => request(`/workspaces/${wid}/sources/url`, { method: 'POST', body: JSON.stringify({ url }) }),
  pasteText: (wid: string, title: string, text: string) => request(`/workspaces/${wid}/sources/paste`, { method: 'POST', body: JSON.stringify({ title, text }) }),
  addPaper: (wid: string, paper: any) => request(`/workspaces/${wid}/sources/add-paper`, { method: 'POST', body: JSON.stringify({ paper }) }),
  deleteSource: (wid: string, sid: string) => request(`/workspaces/${wid}/sources/${sid}`, { method: 'DELETE' }),
  getSourceSummary: (wid: string, sid: string) => request<{ summary: any }>(`/workspaces/${wid}/sources/${sid}/summary`, { method: 'POST' }),

  // Discover (OpenAlex)
  discoverPapers: (wid: string, params: Record<string, any>) => {
    const qs = new URLSearchParams(params).toString();
    return request<any>(`/workspaces/${wid}/discover?${qs}`);
  },

  // Grounded QA & Agent
  askQuestion: (wid: string, body: any) => request<any>(`/workspaces/${wid}/qa`, { method: 'POST', body: JSON.stringify(body) }),
  runAgent: (wid: string, query: string) => request<any>(`/workspaces/${wid}/qa/agent`, { method: 'POST', body: JSON.stringify({ query }) }),

  // Insights
  getInsights: (wid: string) => request<{ insights: any }>(`/workspaces/${wid}/insights`),
  generateInsights: (wid: string) => request<{ insights: any }>(`/workspaces/${wid}/insights/generate`, { method: 'POST' }),
  getGraph: (wid: string) => request<any>(`/workspaces/${wid}/insights/graph`),
  compareSources: (wid: string, sourceA: string, sourceB: string) => request<any>(`/workspaces/${wid}/insights/compare?sourceA=${sourceA}&sourceB=${sourceB}`),
  generateBrief: (wid: string, audience: string) => request<{ brief: string }>(`/workspaces/${wid}/insights/brief`, { method: 'POST', body: JSON.stringify({ audience }) }),

  // Tables
  getTables: (wid: string) => request<{ tables: any[] }>(`/workspaces/${wid}/tables`),
  getTable: (wid: string, tid: string) => request<{ table: any }>(`/workspaces/${wid}/tables/${tid}`),
  createTable: (wid: string, body: any) => request<{ table: any }>(`/workspaces/${wid}/tables`, { method: 'POST', body: JSON.stringify(body) }),
  extractTable: (wid: string, tid: string) => request<{ table: any }>(`/workspaces/${wid}/tables/${tid}/extract`, { method: 'POST' }),
  updateTable: (wid: string, tid: string, body: any) => request<{ table: any }>(`/workspaces/${wid}/tables/${tid}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Multimodal (Voice, Scan, Vision)
  transcribeVoice: (wid: string, formData: FormData) => request<any>(`/workspaces/${wid}/voice/transcribe`, { method: 'POST', body: formData }),
  normalizeVoice: (wid: string, text: string) => request<any>(`/workspaces/${wid}/voice/normalize`, { method: 'POST', body: JSON.stringify({ text }) }),
  uploadScan: (wid: string, formData: FormData) => request<any>(`/workspaces/${wid}/scan`, { method: 'POST', body: formData }),
  askVision: (wid: string, formData: FormData) => request<any>(`/workspaces/${wid}/vision/ask`, { method: 'POST', body: formData }),

  // Feedback & Shared
  sendFeedback: (wid: string, body: any) => request(`/workspaces/${wid}/feedback`, { method: 'POST', body: JSON.stringify(body) }),
  createShareLink: (wid: string, body: any) => request<any>(`/workspaces/${wid}/share`, { method: 'POST', body: JSON.stringify(body) }),
  getShared: (token: string) => request<any>(`/shared/${token}`),

  // Gap Radar
  getGapRadar: (wid: string) => request<any>(`/workspaces/${wid}/insights/gap-radar`),

  // Reasoning SSE — returns the URL to open with EventSource (not fetch)
  getReasoningStreamUrl: (wid: string, query: string, sourceIds?: string[]) => {
    const base = API_BASE;
    const params = new URLSearchParams({ q: query });
    if (sourceIds?.length) params.set('sources', sourceIds.join(','));
    const token = getAuthToken();
    if (token) params.set('token', token);
    return `${base}/workspaces/${wid}/qa/stream?${params.toString()}`;
  },
};
