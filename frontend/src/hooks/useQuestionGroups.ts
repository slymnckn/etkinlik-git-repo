// src/hooks/useQuestionGroups.ts
import { useState, useEffect, useCallback } from 'react';
import * as questionGroupService from '../services/question-group.service';

export const useQuestionGroups = (initialPage = 1) => {
    const [questionGroups, setQuestionGroups] = useState<questionGroupService.QuestionGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<{
        total: number;
        per_page: number;
        current_page: number;
        last_page: number;
    } | null>(null);
    const [page, setPage] = useState(initialPage);

    const fetchQuestionGroups = useCallback(async (page: number) => {
        try {
            setLoading(true);
            const response = await questionGroupService.getQuestionGroups(page);
            setQuestionGroups(response.data);
            setPagination({
                total: response.total,
                per_page: response.per_page,
                current_page: response.current_page,
                last_page: response.last_page
            });
            setLoading(false);
        } catch (err) {
            console.error('Error fetching question groups:', err);
            setError('Soru grupları yüklenirken bir hata oluştu.');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuestionGroups(page);
    }, [page, fetchQuestionGroups]);

    const deleteQuestionGroup = async (id: number): Promise<boolean> => {
        try {
            await questionGroupService.deleteQuestionGroup(id);
            // Başarılı silme sonrasında listeyi güncelle
            await fetchQuestionGroups(page);
            return true;
        } catch (err) {
            console.error('Error deleting question group:', err);
            setError('Etkinlik silinirken bir hata oluştu.');
            return false;
        }
    };

    return {
        questionGroups,
        loading,
        error,
        pagination,
        setPage,
        deleteQuestionGroup,
        refreshGroups: () => fetchQuestionGroups(page)
    };
};