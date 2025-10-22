// src/hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react';
import { Settings, getSettings, updateSettings } from '../services/settings.service';

interface UseSettingsReturnType {
    settings: Settings | null;
    loading: boolean;
    error: Error | null;
    updateSettings: (newSettings: Partial<Settings>) => Promise<boolean>;
    isSubmitting: boolean;
}

export const useSettings = (): UseSettingsReturnType => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Ayarları getir
    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSettings();
            setSettings(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Ayarlar yüklenirken bir hata oluştu'));
        } finally {
            setLoading(false);
        }
    }, []);

    // Bileşen ilk yüklendiğinde ayarları getir
    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Ayarları güncelle
    const handleUpdateSettings = async (newSettings: Partial<Settings>): Promise<boolean> => {
        setIsSubmitting(true);
        try {
            const updatedSettings = await updateSettings(newSettings);
            setSettings(updatedSettings);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Ayarlar güncellenirken bir hata oluştu'));
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        settings,
        loading,
        error,
        updateSettings: handleUpdateSettings,
        isSubmitting,
    };
};