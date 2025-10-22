// src/hooks/useSignup.ts
import { useState } from 'react';
import axios from 'axios';
import { signupService } from '../services/signup.service';

interface SignupData {
    name: string;
    email: string;
    password: string;
    role: string;
}

export const useSignup = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const signup = async (data: SignupData) => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await signupService.register(data);
            setSuccess(true);
            return response;
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.data) {
                // API error with response data
                const errorMsg = typeof err.response.data.message === 'string'
                    ? err.response.data.message
                    : 'Kayıt işlemi başarısız oldu';
                setError(errorMsg);
            } else if (err instanceof Error) {
                // JavaScript error with message
                setError(err.message);
            } else {
                // Unknown error
                setError('Beklenmeyen bir hata oluştu');
            }
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { signup, loading, error, success };
};