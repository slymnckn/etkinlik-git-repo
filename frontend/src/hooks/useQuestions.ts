// src/hooks/useQuestions.ts
import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import * as questionService from '../services/question.service';
import { Question, QuestionFilter, PaginatedResponse } from '../services/question.service';

interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

export const useQuestions = (page = 1, filters: QuestionFilter = {}) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<Omit<PaginatedResponse<never>, 'data'>>({
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1
    });

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await questionService.getQuestions(page, filters);
            setQuestions(response.data);
            setPagination({
                total: response.total,
                per_page: response.per_page,
                current_page: response.current_page,
                last_page: response.last_page
            });
            setLoading(false);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<ApiErrorResponse>;
                setError(axiosError.response?.data?.message || 'Sorular yüklenirken bir hata oluştu');
                console.error('Error fetching questions:', axiosError.response?.data);
            } else {
                setError('Sorular yüklenirken beklenmeyen bir hata oluştu');
                console.error('Unexpected error:', error);
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [page, JSON.stringify(filters)]); // filters değiştiğinde yeniden yükle

    // Soru silme işlemi
    const deleteQuestion = async (id: number): Promise<boolean> => {
        try {
            setLoading(true);
            await questionService.deleteQuestion(id);
            await fetchQuestions(); // Listeyi yenile
            return true;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<ApiErrorResponse>;
                setError(axiosError.response?.data?.message || 'Soru silinirken bir hata oluştu');
                console.error('Error deleting question:', axiosError.response?.data);
            } else {
                setError('Soru silinirken beklenmeyen bir hata oluştu');
                console.error('Unexpected error:', error);
            }
            setLoading(false);
            return false;
        }
    };

    return {
        questions,
        loading,
        error,
        pagination,
        refresh: fetchQuestions,
        deleteQuestion
    };
};

// YENİ: Publisher'ları getiren hook
export const usePublishers = () => {
    const [publishers, setPublishers] = useState<{ publisher: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPublishers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await questionService.getPublishers();
            setPublishers(response);
            setLoading(false);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<ApiErrorResponse>;
                setError(axiosError.response?.data?.message || 'Yayınevleri yüklenirken bir hata oluştu');
                console.error('Error fetching publishers:', axiosError.response?.data);
            } else {
                setError('Yayınevleri yüklenirken beklenmeyen bir hata oluştu');
                console.error('Unexpected error:', error);
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPublishers();
    }, []);

    return {
        publishers,
        loading,
        error,
        refresh: fetchPublishers
    };
};