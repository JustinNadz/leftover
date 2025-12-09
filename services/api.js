// API Configuration
const API_BASE_URL = 'http://localhost:3000';

let authToken = null;

export const setAuthToken = (token) => {
    authToken = token;
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
    authToken = null;
};

// Helper for API requests
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
};

// Auth API
export const authApi = {
    sendOtp: (phone) =>
        apiRequest('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ phone }),
        }),

    verifyOtp: (phone, otp) =>
        apiRequest('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ phone, otp }),
        }),

    updateRole: (role, name) =>
        apiRequest('/auth/update-role', {
            method: 'POST',
            body: JSON.stringify({ role, name }),
        }),
};

// Users API
export const usersApi = {
    getMe: () => apiRequest('/users/me'),

    updateMe: (data) =>
        apiRequest('/users/me', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getStats: () => apiRequest('/users/stats'),
};

// Products API
export const productsApi = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.search) params.append('search', filters.search);
        const queryString = params.toString();
        return apiRequest(`/products${queryString ? `?${queryString}` : ''}`);
    },

    getMy: () => apiRequest('/products/my'),

    getOne: (id) => apiRequest(`/products/${id}`),

    create: (productData) =>
        apiRequest('/products', {
            method: 'POST',
            body: JSON.stringify(productData),
        }),

    update: (id, productData) =>
        apiRequest(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData),
        }),

    delete: (id) =>
        apiRequest(`/products/${id}`, {
            method: 'DELETE',
        }),
};

// Orders API
export const ordersApi = {
    getAll: (status = null) => {
        const params = status ? `?status=${status}` : '';
        return apiRequest(`/orders${params}`);
    },

    getOne: (id) => apiRequest(`/orders/${id}`),

    create: (orderData) =>
        apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        }),

    updateStatus: (id, status) =>
        apiRequest(`/orders/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        }),
};

// Upload API
export const uploadApi = {
    uploadImage: async (imageUri) => {
        const formData = new FormData();

        // Get file extension
        const uriParts = imageUri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('image', {
            uri: imageUri,
            name: `photo.${fileType}`,
            type: `image/${fileType}`,
        });

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }

        return data;
    },
};

export default {
    authApi,
    usersApi,
    productsApi,
    ordersApi,
    uploadApi,
    setAuthToken,
    getAuthToken,
    clearAuthToken,
};
