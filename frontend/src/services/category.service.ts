// src/services/category.service.ts
import api from './api';

// İlgili entity tiplerini kullan
import { Grade, Subject, Unit, Topic } from '../types/education';

export interface Category {
    id: number;
    name: string;
    grade_id: number;
    subject_id: number;
    unit_id?: number;
    topic_id?: number;
    // İlişkili veriler
    grade?: Grade;
    subject?: Subject;
    unit?: Unit;
    topic?: Topic;
}

export interface CategoryCreate {
    name: string;
    grade_id: number;
    subject_id: number;
    unit_id?: number;
    topic_id?: number;
}

// Tüm kategorileri getir
export const getCategories = async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
};

// Belirli filtrelerle kategorileri getir
export const getCategoriesByFilter = async (grade_id?: number, subject_id?: number): Promise<Category[]> => {
    const url = grade_id && subject_id
        ? `/categories/filter/${grade_id}/${subject_id}`
        : grade_id
            ? `/categories/filter/${grade_id}`
            : '/categories';

    const response = await api.get<Category[]>(url);
    return response.data;
};

// Tek bir kategoriyi getir
export const getCategory = async (id: number): Promise<Category> => {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
};

// Yeni kategori oluştur
export const createCategory = async (categoryData: CategoryCreate): Promise<Category> => {
    const response = await api.post<Category>('/categories', categoryData);
    return response.data;
};

// Kategoriyi güncelle
export const updateCategory = async (id: number, categoryData: Partial<CategoryCreate>): Promise<Category> => {
    const response = await api.put<Category>(`/categories/${id}`, categoryData);
    return response.data;
};

// Kategoriyi sil
export const deleteCategory = async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
};

// Sınıf ve ders bazında filtreleme
export const filterCategories = async (grade_id?: number, subject_id?: number): Promise<Category[]> => {
    const response = await api.get<Category[]>(`/categories/filter/${grade_id || ''}/${subject_id || ''}`);
    return response.data;
};