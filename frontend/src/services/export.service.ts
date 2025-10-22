// src/services/export.service.ts
import api from './api';

export interface Export {
    id: number;
    question_group_id?: number;
    game_id: number;
    version?: string;
    // Backend'de 'done' kullanılıyor, frontend'de 'completed'
    status: 'pending' | 'processing' | 'done' | 'completed' | 'failed';
    download_url?: string;
    output_url?: string;
    created_by?: number;
    config_snapshot?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
    requested_at?: string;
    completed_at?: string;
    error_message?: string;
}

export interface ExportCreate {
    question_group_id: number;
    game_id: number;
}

interface PaginatedResponse<T> {
    data: T[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
}



// Tüm exportları getir
export const getExports = async (page = 1): Promise<PaginatedResponse<Export>> => {
    const response = await api.get<PaginatedResponse<Export>>('/exports', { params: { page } });
    return response.data;
};

// Yeni export oluştur
export const createExport = async (data: ExportCreate): Promise<Export> => {
    const response = await api.post<Export>("/exports", data);
    return response.data;
};

// Export detaylarını getir
export const getExportById = async (id: number): Promise<Export> => {
    const response = await api.get<Export>(`/exports/${id}`);
    return response.data;
};



// Export dosyasını indir (doğrudan indirme linki döner)
export const getExportDownloadUrl = (exportId: number): string => {
    return `${api.defaults.baseURL}/exports/${exportId}/download`;
};

// Export işlemini izleme/polling fonksiyonu (export detay sayfasında kullanılabilir)
export const pollExportStatus = async (
    exportId: number,
    onUpdate: (data: Export) => void,
    interval = 5000,
    maxAttempts = 60
): Promise<void> => {
    let attempts = 0;

    const checkStatus = async () => {
        try {
            const data = await getExportById(exportId);
            onUpdate(data);

            // Export tamamlandıysa veya başarısız olduysa polling'i durdur
            if (data.status === 'done' || data.status === 'completed' || data.status === 'failed') {
                return;
            }

            // Maksimum deneme sayısını kontrol et
            attempts++;
            if (attempts >= maxAttempts) {
                console.warn(`Export durumu kontrol edilirken maksimum deneme sayısına ulaşıldı: ${exportId}`);
                return;
            }

            // Belirtilen aralıklarla tekrar kontrol et
            setTimeout(checkStatus, interval);
        } catch (error) {
            console.error(`Export durumu kontrol edilirken hata oluştu: ${exportId}`, error);
        }
    };

    checkStatus();
};

// Export işlemini iptal et (backend'de bu endpoint varsa)
export const cancelExport = async (exportId: number): Promise<Export> => {
    const response = await api.post<Export>(`/exports/${exportId}/cancel`);
    return response.data;
};

// Export işlemini yeniden dene (backend'de bu endpoint varsa)
export const retryExport = async (exportId: number): Promise<Export> => {
    const response = await api.post<Export>(`/exports/${exportId}/retry`);
    return response.data;
};