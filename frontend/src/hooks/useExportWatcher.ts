// src/hooks/useExportWatcher.ts
import { useState, useEffect } from 'react';
import { Export, getExportById } from '../services/export.service';

// Burada ExportStatus tipine 'done' değerini ekleyin
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'done' | 'failed';

export const useExportWatcher = (exportId: number | null, interval = 5000) => {
    const [status, setStatus] = useState<ExportStatus>('pending');
    const [output, setOutput] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [exportData, setExportData] = useState<Export | null>(null);

    useEffect(() => {
        if (!exportId) return;

        const checkStatus = async () => {
            try {
                setLoading(true);
                const exportData = await getExportById(exportId);
                setExportData(exportData);

                // Status tipini güvenli bir şekilde dönüştür
                setStatus(exportData.status as ExportStatus);

                setOutput(exportData.output_url || null);
                setError(exportData.error_message || null);

                // Export tamamlandıysa veya başarısız olduysa polling'i durdur
                if (exportData.status === 'completed' || exportData.status === 'done' || exportData.status === 'failed') {
                    return;
                }

                // Sonraki kontrol için zamanlayıcı ayarla
                setTimeout(checkStatus, interval);
            } catch (err) {
                console.error('Error checking export status:', err);
                setError('Export durumu kontrol edilirken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        checkStatus();

        // Komponent unmount olduğunda temizle
        return () => {
            // Timeout'ları temizlemek için burada bir şey yapılabilir
        };
    }, [exportId, interval]);

    return {
        status,
        output,
        error,
        loading,
        exportData
    };
};