// src/hooks/useDashboard.ts
import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { getDashboardStats, DashboardStats } from '../services/dashboard.service';

interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

export const useDashboard = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getDashboardStats();
            setStats(data);
            setLoading(false);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<ApiErrorResponse>;
                setError(axiosError.response?.data?.message || 'Dashboard bilgileri yüklenirken bir hata oluştu');
                console.error('Error fetching dashboard stats:', axiosError.response?.data);
            } else {
                setError('Dashboard bilgileri yüklenirken beklenmeyen bir hata oluştu');
                console.error('Unexpected error:', error);
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return {
        stats,
        loading,
        error,
        refresh: fetchStats
    };
};