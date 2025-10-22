// src/hooks/usePublishers.ts
import { useState, useEffect, useCallback } from 'react';
import * as publisherService from '../services/publisher.service';

export const usePublishers = () => {
    const [publishers, setPublishers] = useState<publisherService.Publisher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Publisher'ları yükle
    const fetchPublishers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await publisherService.getPublishers();
            setPublishers(data);
        } catch (err) {
            console.error('Publishers yüklenirken hata:', err);
            setError('Publisher\'lar yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    }, []);

    // Yeni publisher oluştur (mevcut)
    const createPublisher = useCallback(async (name: string): Promise<publisherService.Publisher> => {
        try {
            const newPublisher = await publisherService.createPublisher({ name });
            setPublishers(prev => [...prev, newPublisher].sort((a, b) => a.name.localeCompare(b.name)));
            return newPublisher;
        } catch (err) {
            console.error('Publisher oluşturulurken hata:', err);
            throw err;
        }
    }, []);

    // Publisher güncelle (mevcut)
    const updatePublisher = useCallback(async (id: number, name: string): Promise<publisherService.Publisher> => {
        try {
            const updatedPublisher = await publisherService.updatePublisher(id, { name });
            setPublishers(prev =>
                prev.map(p => p.id === id ? updatedPublisher : p)
                    .sort((a, b) => a.name.localeCompare(b.name))
            );
            return updatedPublisher;
        } catch (err) {
            console.error('Publisher güncellenirken hata:', err);
            throw err;
        }
    }, []);

    // Publisher sil (mevcut)
    const deletePublisher = useCallback(async (id: number): Promise<void> => {
        try {
            await publisherService.deletePublisher(id);
            setPublishers(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error('Publisher silinirken hata:', err);
            throw err;
        }
    }, []);

    // İsme göre publisher bul veya oluştur (mevcut)
    const findOrCreatePublisher = useCallback(async (name: string): Promise<publisherService.Publisher> => {
        try {
            const publisher = await publisherService.findOrCreatePublisher(name);

            // Eğer yeni oluşturulduysa listeye ekle
            setPublishers(prev => {
                const exists = prev.some(p => p.id === publisher.id);
                if (!exists) {
                    return [...prev, publisher].sort((a, b) => a.name.localeCompare(b.name));
                }
                return prev;
            });

            return publisher;
        } catch (err) {
            console.error('Publisher bulunurken/oluşturulurken hata:', err);
            throw err;
        }
    }, []);

    // Manuel yenileme (mevcut)
    const refreshPublishers = useCallback(async () => {
        await fetchPublishers();
    }, [fetchPublishers]);

    // YENİ: Logo ile birlikte publisher oluştur
    const createPublisherWithLogo = useCallback(async (formData: FormData): Promise<publisherService.Publisher> => {
        try {
            const newPublisher = await publisherService.createPublisherWithLogo(formData);
            setPublishers(prev => [...prev, newPublisher].sort((a, b) => a.name.localeCompare(b.name)));
            return newPublisher;
        } catch (err) {
            console.error('Logo ile publisher oluşturulurken hata:', err);
            throw err;
        }
    }, []);

    // YENİ: Logo ile birlikte publisher güncelle
    const updatePublisherWithLogo = useCallback(async (id: number, formData: FormData): Promise<publisherService.Publisher> => {
        try {
            const updatedPublisher = await publisherService.updatePublisherWithLogo(id, formData);
            setPublishers(prev =>
                prev.map(p => p.id === id ? updatedPublisher : p)
                    .sort((a, b) => a.name.localeCompare(b.name))
            );
            return updatedPublisher;
        } catch (err) {
            console.error('Logo ile publisher güncellenirken hata:', err);
            throw err;
        }
    }, []);

    // YENİ: Sadece logo yükle
    const uploadLogo = useCallback(async (logoFile: File, publisherId?: number): Promise<{ logo_url: string; publisher?: publisherService.Publisher }> => {
        try {
            const result = await publisherService.uploadLogo(logoFile, publisherId);

            // Eğer publisher güncellendiyse state'i güncelle
            if (result.publisher) {
                setPublishers(prev =>
                    prev.map(p => p.id === result.publisher!.id ? result.publisher! : p)
                );
            }

            return result;
        } catch (err) {
            console.error('Logo yüklenirken hata:', err);
            throw err;
        }
    }, []);

    // YENİ: Logo sil
    const deleteLogo = useCallback(async (publisherId: number): Promise<void> => {
        try {
            await publisherService.deleteLogo(publisherId);

            // State'de logo bilgilerini temizle
            setPublishers(prev =>
                prev.map(p => p.id === publisherId ? { ...p, logo_url: undefined, has_logo: false } : p)
            );
        } catch (err) {
            console.error('Logo silinirken hata:', err);
            throw err;
        }
    }, []);

    // YENİ: Polymorphic create function - FormData veya string kabul eder
    const createPublisherFlexible = useCallback(async (data: FormData | string): Promise<publisherService.Publisher> => {
        if (data instanceof FormData) {
            return createPublisherWithLogo(data);
        } else {
            return createPublisher(data);
        }
    }, [createPublisher, createPublisherWithLogo]);

    // YENİ: Polymorphic update function - FormData veya string kabul eder
    const updatePublisherFlexible = useCallback(async (id: number, data: FormData | string): Promise<publisherService.Publisher> => {
        if (data instanceof FormData) {
            return updatePublisherWithLogo(id, data);
        } else {
            return updatePublisher(id, data);
        }
    }, [updatePublisher, updatePublisherWithLogo]);

    // Component mount olduğunda publisher'ları yükle
    useEffect(() => {
        fetchPublishers();
    }, [fetchPublishers]);

    return {
        // Mevcut fonksiyonlar (değiştirilmedi)
        publishers,
        loading,
        error,
        createPublisher,
        updatePublisher,
        deletePublisher,
        findOrCreatePublisher,
        refreshPublishers,
        fetchPublishers,

        // Yeni logo fonksiyonları
        createPublisherWithLogo,
        updatePublisherWithLogo,
        uploadLogo,
        deleteLogo,

        // Polymorphic fonksiyonlar (geriye uyumlu)
        createPublisherFlexible,
        updatePublisherFlexible
    };
};