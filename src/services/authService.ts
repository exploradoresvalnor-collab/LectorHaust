/**
 * MangaDex Authentication Service
 */

const BASE_URL = 'https://api.mangadex.org';

export interface AuthToken {
    session: string;
    refresh: string;
}

export interface User {
    id: string;
    type: string;
    attributes: {
        username: string;
        [key: string]: any;
    };
}

export interface AuthResponse {
    result: string;
    token: AuthToken;
    errors?: Array<{ detail: string }>;
}

export const authService = {
    /**
     * Login to MangaDex
     */
    async login(username: string, password: string): Promise<AuthToken> {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.result === 'ok') {
            localStorage.setItem('md_session', data.token.session);
            localStorage.setItem('md_refresh', data.token.refresh);
            return data.token;
        } else {
            throw new Error(data.errors?.[0]?.detail || 'Error de autenticación');
        }
    },

    /**
     * Refresh session token
     */
    async refresh(): Promise<AuthToken | null> {
        const refreshToken = localStorage.getItem('md_refresh');
        if (!refreshToken) return null;

        const response = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: refreshToken })
        });

        const data = await response.json();
        if (data.result === 'ok') {
            localStorage.setItem('md_session', data.token.session);
            localStorage.setItem('md_refresh', data.token.refresh);
            return data.token;
        }
        return null;
    },

    /**
     * Logout
     */
    logout() {
        localStorage.removeItem('md_session');
        localStorage.removeItem('md_refresh');
    },

    /**
     * Get current user
     */
    async getMe(): Promise<User | null> {
        const sessionToken = localStorage.getItem('md_session');
        if (!sessionToken) return null;

        const response = await fetch(`${BASE_URL}/user/me`, {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
        });

        if (response.status === 401) {
            const newToken = await this.refresh();
            if (newToken) return this.getMe();
            return null;
        }

        const data = await response.json();
        return data.data;
    }
};
