import api from './api';
import { UserFormData } from '../types/user';

export const getUsers = async () => {
    const response = await api.get('/users');
    return response.data;
};

export const deleteUser = async (userId: number) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
};

export const getUser = async (userId: number) => {
    const response = await api.get(`/user/${userId}`);
    return response.data;
};

export const updateUser = async (id: number, formData: UserFormData) => {
    const response = await api.put(`/user-update/${id}`, formData);
    return response.data;
};

export const getCurrentUser = async () => {
    try {
        // Önce API'den güncel user bilgisini al
        const response = await api.get('/user');
        const userData = response.data;
        
        // Başarılıysa localStorage'ı güncelle
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        return userData;
    } catch (error) {
        // API başarısızsa localStorage'dan al (fallback)
        const userData = localStorage.getItem('user_data');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (parseError) {
                // Silent fail
            }
        }
        
        throw error; // API ve localStorage da başarısızsa hata fırlat
    }
};
