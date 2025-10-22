// src/hooks/useCategories.ts
import { useState, useEffect, useCallback } from 'react';
import * as categoryService from '../services/category.service';

export const useCategories = () => {
    const [categories, setCategories] = useState<categoryService.Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const response = await categoryService.getCategories();
            setCategories(response);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Kategoriler yüklenirken bir hata oluştu.');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const deleteCategory = async (id: number): Promise<boolean> => {
        try {
            await categoryService.deleteCategory(id);
            // Silme başarılıysa tüm kategorileri yeniden yükle
            await fetchCategories();
            return true;
        } catch (err) {
            console.error('Error deleting category:', err);
            setError('Kategori silinirken bir hata oluştu.');
            return false;
        }
    };

    const filterCategories = async (grade_id?: number, subject_id?: number): Promise<categoryService.Category[]> => {
        try {
            setLoading(true);
            const filteredCategories = await categoryService.filterCategories(grade_id, subject_id);
            setLoading(false);
            return filteredCategories;
        } catch (err) {
            console.error('Error filtering categories:', err);
            setError('Kategoriler filtrelenirken bir hata oluştu.');
            setLoading(false);
            return [];
        }
    };

    return {
        categories,
        loading,
        error,
        deleteCategory,
        filterCategories,
        refreshCategories: fetchCategories
    };
};