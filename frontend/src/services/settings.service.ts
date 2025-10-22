// src/services/settings.service.ts
import api from './api';

export interface GeneralSettings {
    app_name: string;
    logo_url: string;
    theme_color: string;
    logo_file?: File; // Logo dosyası yükleme için
}

export interface AdvertisementSettings {
    ads_enabled: boolean;
    ad_type: 'image' | 'video';
    ad_file?: File; // Reklam dosyası yükleme için
    ad_file_url?: string; // API'den gelecek, kaydedilmiş dosya yolu
}

export interface Settings {
    general: GeneralSettings;
    advertisements: AdvertisementSettings;
}

// Tüm ayarları getir
export const getSettings = async (): Promise<Settings> => {
    const response = await api.get<Settings>('/settings');
    return response.data;
};

// Ayarları güncelle
export const updateSettings = async (settingsData: Partial<Settings>): Promise<Settings> => {
    // Logo dosyası içeriyorsa FormData kullan
    if (settingsData.general?.logo_file) {
        const formData = new FormData();

        // Genel ayarları ekle
        if (settingsData.general) {
            if (settingsData.general.app_name) {
                formData.append('app_name', settingsData.general.app_name);
            }
            if (settingsData.general.logo_url) {
                formData.append('logo_url', settingsData.general.logo_url);
            }
            if (settingsData.general.theme_color) {
                formData.append('theme_color', settingsData.general.theme_color);
            }
            // Logo dosyasını ekle
            formData.append('logo_file', settingsData.general.logo_file);
        }

        const response = await api.post<Settings>('/settings/uploadLogo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } else {
        // Dosya yoksa normal JSON formatında gönder
        const response = await api.put<Settings>('/settings', settingsData);
        return response.data;
    }
};