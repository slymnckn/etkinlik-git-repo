// src/services/dashboard.service.ts
import api from './api';

export interface DashboardStats {
    questionCount: number;
    gameCount: number;
    categoryCount: number;
    exportCount: number;
    advertisementCount: number;
    questionGroupCount: number;
    recentQuestions: {
        id: number;
        question_text: string;
        created_at: string;
    }[];
    recentGames: {
        id: number;
        name: string;
        type: string;
        created_at: string;
    }[];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
};