// src/services/iframe.service.ts
import api from './api';

/**
 * İframe oluşturma işlemini başlatır
 * @param groupId Etkinlik ID'si
 */
interface CreateIframeResponse {
    success: boolean;
    message: string;
    job_id?: string;
}

export const createIframe = async (groupId: number, gameId: number): Promise<CreateIframeResponse> => {
    try {
        const response = await api.post(`/jenkins/create-iframe/${groupId}/${gameId}`);
        return response.data;
    } catch (error) {
        console.error('İframe oluşturma hatası:', error);
        throw error;
    }
};
/**
 * İframe durumunu kontrol eder
 * @param groupId Etkinlik ID'si
 */
export interface IframeStatus {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    statusText: string;
    isReady: boolean;
    iframe_code: string | null;
}

export const checkIframeStatus = async (groupId: number): Promise<IframeStatus> => {
    try {
        const response = await api.get(`/question-groups/${groupId}/check-iframe-status`);
        return response.data;
    } catch (error) {
        console.error('İframe durumu kontrol hatası:', error);
        throw error;
    }
};