function normalizeApiUrl(value) {
    const fallback = import.meta.env?.PROD ? 'https://voicedin.onrender.com/api' : 'http://localhost:5000/api';
    const rawUrl = (value || fallback).trim().replace(/\/+$/, '');
    return rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;
}

const API_URL = normalizeApiUrl(import.meta.env?.VITE_API_URL);
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function assetUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
    return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

async function readErrorMessage(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        try {
            const data = await response.json();
            return data.message || data.error || 'API Error';
        } catch {
            return 'API Error';
        }
    }

    try {
        const text = await response.text();
        return text || 'API Error';
    } catch {
        return 'API Error';
    }
}

export async function fetchApi(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Handle unauthorized (token expired, etc)
                localStorage.removeItem('token');
                // You might want to reload or emit an event here in a real app
                // window.location.href = '/login'; 
            }
            throw new Error(await readErrorMessage(response));
        }

        return response.json();
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Could not connect to the server. Make sure the backend is running.');
        }
        throw error;
    }
}

export async function fetchBlob(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const { expectedTypes = [], ...fetchOptions } = options;
    const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...fetchOptions,
            headers,
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
            }
            throw new Error(await readErrorMessage(response));
        }

        const blob = await response.blob();
        const contentType = blob.type || response.headers.get('content-type') || '';

        if (!blob.size) {
            throw new Error('Downloaded file is empty');
        }

        if (contentType.includes('application/json') || contentType.includes('text/html')) {
            throw new Error(await readBlobErrorMessage(blob));
        }

        if (expectedTypes.length > 0 && !expectedTypes.some(type => contentType.includes(type))) {
            throw new Error(`Expected ${expectedTypes.join(' or ')} but received ${contentType || 'an unknown file type'}`);
        }

        return blob;
    } catch (error) {
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Could not connect to the server. Make sure the backend is running.');
        }
        throw error;
    }
}

async function readBlobErrorMessage(blob) {
    try {
        const text = await blob.text();
        if (!text) return 'Download failed';
        try {
            const data = JSON.parse(text);
            return data.message || data.error || 'Download failed';
        } catch {
            return text.slice(0, 300);
        }
    } catch {
        return 'Download failed';
    }
}

export const api = {
    request: (endpoint, options = {}) => fetchApi(endpoint, options),
    get: (endpoint) => fetchApi(endpoint, { method: 'GET' }),
    post: (endpoint, body) => fetchApi(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => fetchApi(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (endpoint, body) => fetchApi(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (endpoint) => fetchApi(endpoint, { method: 'DELETE' }),
    download: (endpoint, expectedTypes = []) => fetchBlob(endpoint, { method: 'GET', expectedTypes }),
    upload: async (endpoint, formData) => {
        // For file uploads, don't set Content-Type header (browser sets it automatically with boundary)
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }

        return response.json();
    }
};
