// src/hooks/useExport.ts
import {useState} from 'react';
import {Export, createExport, ExportCreate} from '../services/export.service';

export const useExport = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const triggerExport = async (data: ExportCreate): Promise<Export> => {
        try {
            setLoading(true);
            setError(null);

            return await createExport(data);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Export işlemi başarısız.");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        triggerExport,
        loading,
        error,
    };
};
