const resolveApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    // If accessed through remote domain or IP (e.g. AWS EC2 13.204.213.166)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return ''; // Relative path leverages Next.js / Nginx reverse proxy
    }
  }
  return 'http://127.0.0.1:8000';
};

const API_BASE = resolveApiBase();

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('trustvault_session_token');
    }
  }

  setSessionToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('trustvault_session_token', token);
    }
  }

  getSessionToken(): string | null {
    if (typeof window !== 'undefined' && !this.token) {
      this.token = localStorage.getItem('trustvault_session_token');
    }
    return this.token;
  }

  clearSessionToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trustvault_session_token');
      localStorage.removeItem('trustvault_user');
    }
  }

  getApiBase(): string {
    return resolveApiBase();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const base = this.getApiBase();
    const url = base ? `${base}${endpoint}` : endpoint;
    const token = this.getSessionToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Session-Token'] = token;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      // Fallback: If absolute base URL failed (e.g. port 8000 blocked or cross-origin), try relative endpoint
      if (url.startsWith('http')) {
        try {
          response = await fetch(endpoint, {
            ...options,
            headers,
          });
        } catch {
          throw new Error(`Unable to reach TrustVault security server at ${base || 'backend'}. Please ensure backend is running.`);
        }
      } else {
        throw new Error(`Unable to reach TrustVault security server. Please ensure backend is running.`);
      }
    }

    if (response.status === 401) {
      this.clearSessionToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        // Broadcast auth expired event
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    if (!response.ok) {
      let errorDetail = 'An unexpected error occurred';
      try {
        const data = await response.json();
        errorDetail = data.detail || errorDetail;
      } catch {
        errorDetail = response.statusText || errorDetail;
      }
      throw new Error(errorDetail);
    }

    return response.json();
  }

  // Auth
  async getDemoUsers() {
    return this.request<{ demo_users: Array<{ email: string; full_name: string; password?: string; role: string; role_badge: string; description: string }> }>('/api/auth/demo-users');
  }

  async login(email: string, password: string) {
    const res = await this.request<{ session_token: string; user: any; expires_at: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    this.setSessionToken(res.session_token);
    return res;
  }

  async register(email: string, fullName: string, password: string) {
    const res = await this.request<{ session_token: string; user: any; expires_at: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), full_name: fullName.trim(), password }),
    });
    this.setSessionToken(res.session_token);
    return res;
  }

  async switchDemo(email: string) {
    const res = await this.request<{ session_token: string; user: any; expires_at: string }>('/api/auth/switch-demo', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
    this.setSessionToken(res.session_token);
    return res;
  }

  async getMe() {
    return this.request<{ user: any; session_id: string; session_expires_at: string; ip_address: string }>('/api/auth/me');
  }

  async updateProfile(fullName: string) {
    return this.request<any>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ full_name: fullName.trim() }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<any>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearSessionToken();
    }
  }

  async getSessions() {
    return this.request<Array<any>>('/api/auth/sessions');
  }

  async revokeSession(sessionId: string) {
    return this.request(`/api/auth/sessions/${sessionId}/revoke`, { method: 'POST' });
  }

  // Admin User Management
  async adminListUsers() {
    return this.request<Array<any>>('/api/admin/users');
  }

  async adminUpdateUserStatus(userId: string, isActive: boolean) {
    return this.request<any>(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async adminUpdateUserRole(userId: string, role: string) {
    return this.request<any>(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  // Documents
  async listDocuments(search?: string, category?: string) {
    let q = '';
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'ALL') params.append('category', category);
    const qs = params.toString();
    if (qs) q = `?${qs}`;
    return this.request<Array<any>>(`/api/documents${q}`);
  }

  async getCategories() {
    return this.request<{ categories: Array<{ category: string; count: number }> }>('/api/documents/categories/summary');
  }

  async getDocument(id: string) {
    return this.request<any>(`/api/documents/${id}`);
  }

  async uploadDocument(file: File, title: string, classification: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('classification_level', classification);

    return this.request<any>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteDocument(id: string) {
    return this.request(`/api/documents/${id}`, { method: 'DELETE' });
  }

  async viewDocumentContent(id: string): Promise<string> {
    const token = this.getSessionToken();
    const url = `${API_BASE}/api/documents/${id}/view`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new Error(`Unable to connect to security server at ${API_BASE}`);
    }

    if (!response.ok) {
      let detail = 'Access denied or decryption failed';
      try {
        const err = await response.json();
        detail = err.detail || detail;
      } catch {}
      throw new Error(detail);
    }

    return response.text();
  }

  async downloadDocument(id: string, filename: string) {
    const token = this.getSessionToken();
    const url = `${API_BASE}/api/documents/${id}/download`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new Error(`Unable to connect to security server at ${API_BASE}`);
    }

    if (!response.ok) {
      let detail = 'Download failed';
      try {
        const err = await response.json();
        detail = err.detail || detail;
      } catch {}
      throw new Error(detail);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Grants
  async createGrant(documentId: string, recipientEmail: string, permissionLevel: string, expiresInHours?: number) {
    return this.request<any>(`/api/documents/${documentId}/grants`, {
      method: 'POST',
      body: JSON.stringify({
        recipient_email: recipientEmail,
        permission_level: permissionLevel,
        expires_in_hours: expiresInHours || null,
      }),
    });
  }

  async revokeGrant(grantId: string, reason?: string) {
    return this.request<any>(`/api/grants/${grantId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Revoked via TrustVault Security Dashboard' }),
    });
  }

  // Audit
  async getAuditLogs(action?: string, outcome?: string, limit: number = 100) {
    let query = `?limit=${limit}`;
    if (action) query += `&action=${encodeURIComponent(action)}`;
    if (outcome) query += `&outcome=${encodeURIComponent(outcome)}`;
    return this.request<Array<any>>(`/api/audit/logs${query}`);
  }

  async verifyAuditChain() {
    return this.request<any>('/api/audit/verify');
  }

  async simulateTamper(targetType: 'audit_record' | 'break_hash_pointer' | 'ciphertext' | 'restore', recordId?: string, documentId?: string) {
    return this.request<any>('/api/audit/simulate-tamper', {
      method: 'POST',
      body: JSON.stringify({ target_type: targetType, record_id: recordId, document_id: documentId }),
    });
  }

  // Security & Risk
  async getRiskAssessment(email?: string) {
    const q = email ? `?email=${encodeURIComponent(email)}` : '';
    return this.request<any>(`/api/security/risk-assessment${q}`);
  }

  async getFleetRisk() {
    return this.request<any>('/api/security/fleet-risk');
  }

  async getPolicy() {
    return this.request<any>('/api/security/policy');
  }

  async killSwitch(userId: string) {
    return this.request<any>(`/api/security/kill-switch/user/${userId}`, { method: 'POST' });
  }

  // Health
  async getHealth() {
    return this.request<any>('/api/health');
  }
}

export const api = new ApiClient();
