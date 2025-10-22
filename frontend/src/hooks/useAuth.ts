// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/auth.service';

export const useAuth = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Component mount olduğunda role'ü local storage'dan al
        const role = localStorage.getItem('user_role');
        setUserRole(role);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);
            const data = await authService.login(email, password);
            const role = data.user?.role;

            // Kullanıcı bilgilerini local storage'a kaydet
            if (data.user) {
                localStorage.setItem('user_role', role);
                localStorage.setItem('user_data', JSON.stringify(data.user));
                setUserRole(role);
            }

            setLoading(false);

            if (role === 'editor') {
                navigate('/user-management');
            } else {
                navigate('/');
            }
            return data;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error
                ? err.message
                : (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Giriş başarısız';
            setError(errorMessage);
            setLoading(false);
            throw err;
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            await authService.logout();
            // Kullanıcı rolünü temizle
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_data');
            setUserRole(null);
            setLoading(false);
            navigate('/login');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error
                ? err.message
                : (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Çıkış başarısız';
            setError(errorMessage);
            setLoading(false);
        }
    };

    return {
        login,
        logout,
        loading,
        error,
        userRole,
        isAuthenticated: authService.isAuthenticated()
    };
};