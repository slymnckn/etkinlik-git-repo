// src/services/question.service.ts
import api from './api';
import { Grade, Subject, Unit, Topic } from '../types/education';

export interface Category {
    id: number;
    name: string;
    grade_id: number;
    subject_id: number;
    unit_id?: number;
    topic_id?: number;
    // İlişkisel veri
    grade?: Grade;
    subject?: Subject;
    unit?: Unit;
    topic?: Topic;
}

export interface Answer {
    id?: number;
    answer_text: string;
    is_correct: boolean;
    image_path?: string;
}

export interface Question {
    id: number;
    category_id: number;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'qa';
    difficulty: 'easy' | 'medium' | 'hard';
    image_path?: string;
    metadata?: Record<string, unknown>;
    user_id?: number;
    publisher?: string; // YENİ: Publisher alanı artık Question'da
    answers: Answer[];
    category?: Category;
    user?: {
        id: number;
        name: string;
        email: string;
        publisher?: string; // Fallback için hala kullanılabilir
    };
}

export interface QuestionCreate {
    category_id: number;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'qa';
    difficulty: 'easy' | 'medium' | 'hard';
    image_path?: string | null;
    metadata?: Record<string, unknown>;
    publisher?: string; // YENİ: Publisher artık zorunlu değil ama eklenebilir
    answers: Omit<Answer, 'id'>[];
}

export interface QuestionFilter {
    search?: string;
    type?: string;
    difficulty?: string;
    category_id?: number;
    category_ids?: number[];
    user_id?: number;
    publisher?: string; // YENİ: Publisher filtresi artık doğrudan question'dan
    grade_id?: number;
    subject_id?: number;
    unit_id?: number;
    topic_id?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
}

export interface GoogleImage {
    id: string;
    preview_url: string;
    web_format_url: string;
    large_image_url: string;
    source: string;
    title: string;
}

export interface GoogleSearchResult {
    total: number;
    images: GoogleImage[];
}

// Tüm soruları getir (filtreleme ve sayfalama ile)
export const getQuestions = async (page = 1, filters: QuestionFilter = {}): Promise<PaginatedResponse<Question>> => {
    const response = await api.get<PaginatedResponse<Question>>('/questions', {
        params: { page, ...filters }
    });
    return response.data;
};

// Tek bir soruyu getir
export const getQuestion = async (id: number): Promise<Question> => {
    const response = await api.get<Question>(`/questions/${id}`);
    return response.data;
};

// Yeni soru oluştur
export const createQuestion = async (questionData: QuestionCreate): Promise<Question> => {
    const response = await api.post<Question>('/questions', questionData);
    return response.data;
};

// Soruyu güncelle
export const updateQuestion = async (id: number, questionData: Partial<QuestionCreate>): Promise<Question> => {
    const response = await api.put<Question>(`/questions/${id}`, questionData);
    return response.data;
};

// Soruyu sil
export const deleteQuestion = async (id: number): Promise<void> => {
    await api.delete(`/questions/${id}`);
};

// Resim yükleme
export const uploadImage = async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post<{ url: string }>('/questions/upload-image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data;
};

// Base64 formatındaki görseli yükle (kopyala-yapıştır için)
export const uploadBase64Image = async (imageData: string): Promise<{ url: string }> => {
    const response = await api.post<{ url: string }>('/questions/upload-base64-image', {
        image_data: imageData,
    });

    return response.data;
};

// Google'dan görsel ara
export const searchImages = async (query: string, page: number = 1): Promise<GoogleSearchResult> => {
    const response = await api.get<GoogleSearchResult>('/images/search', {
        params: {
            query,
            page,
        },
    });

    return response.data;
};

// Harici URL'den görsel indir ve sunucuya kaydet
export const saveExternalImage = async (imageUrl: string): Promise<{ url: string }> => {
    const response = await api.post<{ url: string }>('/images/save-external', {
        image_url: imageUrl,
    });

    return response.data;
};

// YENİ: Publisher'ları getir - artık questions tablosundan
export const getPublishers = async (): Promise<{ publisher: string; count: number }[]> => {
    const response = await api.get<{ publisher: string; count: number }[]>('/questions/publishers');
    return response.data;
};