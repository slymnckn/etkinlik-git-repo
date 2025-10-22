// src/services/question-group.service.ts
import api from './api';

export interface QuestionGroup {
    id: number;
    name: string;
    code: string;
    question_type: 'multiple_choice' | 'true_false' | 'qa';
    game_id: number;
    created_by: number;
    publisher?: string; // YENİ: Publisher alanı eklendi
    questions_count: number;
    created_at: string;
    updated_at: string;
    image_url?: string;

    // İframe ile ilgili alanlar
    iframe_url?: string;
    iframe_code?: string;
    iframe_status?: 'pending' | 'processing' | 'completed' | 'failed';
    zip_url?: string;
    game?: {
        id: number;
        name: string;
        type: string;
    };
    creator?: {
        id: number;
        name: string;
        email: string;
    };
    questions?: Question[];
    category?: {
        id: number;
        name: string;
    };
}

export interface Question {
    id: number;
    category_id: number;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'qa';
    difficulty: 'easy' | 'medium' | 'hard';
    image_path?: string;
    user_id?: number;
    publisher?: string; // YENİ: Question'da da publisher var
    category?: {
        id: number;
        name: string;
    };
    answers?: Answer[];
    pivot?: {
        order: number;
    };
}

export interface Answer {
    id: number;
    question_id: number;
    answer_text: string;
    is_correct: boolean;
    image_path?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
}

export interface QuestionGroupCreate {
    name: string;
    question_type: 'multiple_choice' | 'true_false' | 'qa';
    game_id: number;
    publisher?: string; // YENİ: Publisher eklendi
    question_ids: number[];
}

export interface QuestionGroupUpdate {
    name?: string;
    publisher?: string; // YENİ: Publisher eklendi
    question_ids?: number[];
}

export interface EligibleQuestionsParams {
    game_id: number;
    question_type: 'multiple_choice' | 'true_false' | 'qa';
    category_id?: number;
    category_ids?: number[];
    grade_id?: number;
    subject_id?: number;
    unit_id?: number;
    topic_id?: number;
    publisher?: string; // YENİ: Publisher filtresi
    page?: number;
}

export interface QuestionGroupFilters {
    search?: string;
    question_type?: 'multiple_choice' | 'true_false' | 'qa';
    game_id?: string | number;
    category_id?: string | number;
    category_ids?: number[];
    grade_id?: number;
    subject_id?: number;
    unit_id?: number;
    topic_id?: number;
    publisher?: string; // YENİ: Publisher filtresi
    sort_field?: string;
    sort_direction?: 'asc' | 'desc';
}

// Tüm soru gruplarını getir
export const getQuestionGroups = async (
    page = 1,
    filters: QuestionGroupFilters = {}
): Promise<PaginatedResponse<QuestionGroup>> => {
    const response = await api.get<PaginatedResponse<QuestionGroup>>('/question-groups', {
        params: { page, ...filters }
    });
    return response.data;
};

// Belirli bir Etkinliknu getir
export const getQuestionGroup = async (id: number): Promise<QuestionGroup> => {
    const response = await api.get<QuestionGroup>(`/question-groups/${id}`);
    return response.data;
};

// Kod ile Etkinliknu getir
export const getQuestionGroupByCode = async (code: string): Promise<QuestionGroup> => {
    const response = await api.get<QuestionGroup>(`/question-groups/code/${code}`);
    return response.data;
};

// Yeni Etkinlik oluştur
export const createQuestionGroup = async (groupData: QuestionGroupCreate): Promise<QuestionGroup> => {
    const response = await api.post<QuestionGroup>('/question-groups', groupData);
    return response.data;
};

// Görsel ile yeni Etkinlik oluştur (FormData kullanır)
export const createQuestionGroupWithImage = async (formData: FormData): Promise<QuestionGroup> => {
    const response = await api.post<QuestionGroup>('/question-groups', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

// Etkinliknu güncelle
export const updateQuestionGroup = async (id: number, groupData: QuestionGroupUpdate): Promise<QuestionGroup> => {
    const response = await api.put<QuestionGroup>(`/question-groups/${id}`, groupData);
    return response.data;
};

// Görsel ile Etkinliknu güncelle (FormData kullanır)
export const updateQuestionGroupWithImage = async (id: number, formData: FormData): Promise<QuestionGroup> => {
    const response = await api.post<QuestionGroup>(`/question-groups/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

// Etkinliknu sil
export const deleteQuestionGroup = async (id: number): Promise<void> => {
    await api.delete(`/question-groups/${id}`);
};

// Uygun soruları getir (grup oluşturma için)
export const getEligibleQuestions = async (params: EligibleQuestionsParams): Promise<PaginatedResponse<Question>> => {
    const response = await api.get<PaginatedResponse<Question>>('/eligible-questions', { params });
    return response.data;
};

// YENİ: Publisher'ları getir - question-groups tablosundan
export const getPublishers = async (): Promise<{ publisher: string; count: number }[]> => {
    const response = await api.get<{ publisher: string; count: number }[]>('/question-groups/publishers');
    return response.data;
};