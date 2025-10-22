// src/services/api.ts
import axios from 'axios';

// API temel URL'si - geliştirme ortamında proxy kullan
const API_URL = import.meta.env.DEV ? '/api' : 'https://etkinlik.app/api';

// axios örneğini oluştur
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// İstek gönderilmeden önce çalışacak interceptor - token ekleme
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Yanıt geldiğinde çalışacak interceptor - hata işleme
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // 401 Unauthorized hatası - token süresi dolmuş veya geçersiz
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;