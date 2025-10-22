// src/hooks/useGames.ts
import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import * as gameService from '../services/game.service';
import { Game, PaginatedResponse } from '../services/game.service';

interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

export const useGames = (page = 1) => {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<Omit<PaginatedResponse<never>, 'data'>>({
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1
    });

    const fetchGames = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await gameService.getGames(page);
            setGames(response.data);
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
                setError(axiosError.response?.data?.message || 'Oyunlar yüklenirken bir hata oluştu');
                console.error('Error fetching games:', axiosError.response?.data);
            } else {
                setError('Oyunlar yüklenirken beklenmeyen bir hata oluştu');
                console.error('Unexpected error:', error);
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
    }, [page]);

    // Oyun silme işlemi
    const deleteGame = async (id: number): Promise<boolean> => {
        try {
            setLoading(true);
            await gameService.deleteGame(id);
            await fetchGames(); // Listeyi yenile
            return true;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<ApiErrorResponse>;
                setError(axiosError.response?.data?.message || 'Oyun silinirken bir hata oluştu');
                console.error('Error deleting game:', axiosError.response?.data);
            } else {
                setError('Oyun silinirken beklenmeyen bir hata oluştu');
                console.error('Unexpected error:', error);
            }
            setLoading(false);
            return false;
        }
    };

    return {
        games,
        loading,
        error,
        pagination,
        refresh: fetchGames,
        deleteGame
    };
};