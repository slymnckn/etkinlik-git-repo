// src/services/signup.service.ts
import api from './api';

interface SignupData {
    name: string;
    email: string;
    password: string;
    role: string;
}

interface SignupResponse {
    success: boolean;
    message: string;
    user?: {
        id: number | string;
        name: string;
        email: string;
        role: string;
    };
    token?: string;
}

class SignupService {
    /**
     * Register a new user
     * @param {SignupData} data The user registration data
     * @returns {Promise<SignupResponse>} The API response
     */
    async register(data: SignupData): Promise<SignupResponse> {
        const response = await api.post<SignupResponse>('/auth/register', data);
        return response.data;
    }
}

export const signupService = new SignupService();