// src/services/publisher.service.ts
import api from './api';

export interface Publisher {
    id: number;
    name: string;
    logo_url?: string;
    has_logo?: boolean;
    logo_file_name?: string;
    logo_file_size?: number;
    created_at?: string;
    updated_at?: string;
}

export interface PublisherCreate {
    name: string;
}

export interface PublisherUpdate {
    name: string;
}

export interface ApiResponse<T> {
    message: string;
    data: T;
}

// Tüm publisher'ları getir
export const getPublishers = async (): Promise<Publisher[]> => {
    const response = await api.get('/publishers');
    return response.data;
};

// Publisher oluştur
export const createPublisher = async (data: PublisherCreate): Promise<Publisher> => {
    const response = await api.post<ApiResponse<Publisher>>('/publishers', data);
    return response.data.data;
};

// Publisher güncelle
export const updatePublisher = async (id: number, data: PublisherUpdate): Promise<Publisher> => {
    const response = await api.put<ApiResponse<Publisher>>(`/publishers/${id}`, data);
    return response.data.data;
};

// Publisher sil
export const deletePublisher = async (id: number): Promise<void> => {
    await api.delete(`/publishers/${id}`);
};

// İsme göre publisher bul veya oluştur
export const findOrCreatePublisher = async (name: string): Promise<Publisher> => {
    const response = await api.post<Publisher>('/publishers/find-or-create', { name });
    return response.data;
};

// Belirli publisher'ı getir
export const getPublisher = async (id: number): Promise<Publisher> => {
    const response = await api.get<Publisher>(`/publishers/${id}`);
    return response.data;
};

// YENİ: Logo ile birlikte publisher oluştur
export const createPublisherWithLogo = async (formData: FormData): Promise<Publisher> => {
    const response = await api.post<ApiResponse<Publisher>>('/publishers', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.data;
};

// YENİ: Logo ile birlikte publisher güncelle
export const updatePublisherWithLogo = async (id: number, formData: FormData): Promise<Publisher> => {
    const response = await api.post<ApiResponse<Publisher>>(`/publishers/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data.data;
};

// YENİ: Sadece logo yükle
export const uploadLogo = async (logoFile: File, publisherId?: number): Promise<{ logo_url: string; publisher?: Publisher }> => {
    const formData = new FormData();
    formData.append('logo', logoFile);
    if (publisherId) {
        formData.append('publisher_id', publisherId.toString());
    }

    const response = await api.post<{ message: string; logo_url: string; publisher?: Publisher }>('/publishers/upload-logo', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// YENİ: Logo sil
export const deleteLogo = async (publisherId: number): Promise<void> => {
    await api.delete(`/publishers/${publisherId}/delete-logo`);
};