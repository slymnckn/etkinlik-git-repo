// src/components/ImageUploader.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    Box, Typography, Button, Dialog, DialogTitle, DialogContent, IconButton, Alert, CircularProgress
} from '@mui/material';
import {
    Close as CloseIcon,
    CloudUpload as CloudUploadIcon,
    ContentPaste as ContentPasteIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import ImageSearchPanel from './ImageSearchPanel';
import * as questionService from '../services/question.service';

interface ImageUploaderProps {
    imagePath: string | null;
    onImagePathChange: (path: string | null) => void;
    onError: (error: string | null) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ imagePath, onImagePathChange, onError }) => {
    const [openDialog, setOpenDialog] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [pasteMode, setPasteMode] = useState(false);

    // Dialog'u açma
    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    // Dialog'u kapatma
    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    // Görsel seçildiğinde
    const handleImageSelected = (selectedImagePath: string) => {
        onImagePathChange(selectedImagePath);
        onError(null);
        handleCloseDialog();
    };

    // Görsel silme
    const handleRemoveImage = () => {
        onImagePathChange(null);
        onError(null);
    };

    // Dosya seçimini aç
    const handlePickFile = () => {
        fileInputRef.current?.click();
    };

    // Seçilen dosyayı yükle
    const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basit doğrulamalar
        if (!file.type.startsWith('image/')) {
            const msg = 'Lütfen geçerli bir görsel dosyası seçin.';
            setLocalError(msg);
            onError(msg);
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            const msg = 'Dosya boyutu 2MB\'dan küçük olmalıdır.';
            setLocalError(msg);
            onError(msg);
            return;
        }

        try {
            setUploading(true);
            setLocalError(null);
            onError(null);

            const res = await questionService.uploadImage(file);
            onImagePathChange(res.url);
        } catch {
            const msg = 'Görsel yüklenirken bir hata oluştu.';
            setLocalError(msg);
            onError(msg);
        } finally {
            setUploading(false);
            // Aynı dosyayı tekrar seçebilsin diye input temizle
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Pano (paste) modunu başlat
    const handleStartPasteMode = async () => {
        setLocalError(null);
        onError(null);

    // Önce Clipboard API ile doğrudan okumayı deneyelim (kullanıcı jesti gerekli)
    type ClipboardReader = { read?: () => Promise<ClipboardItem[]> };
    type NavigatorWithClipboard = Navigator & { clipboard?: ClipboardReader };
    const nav = navigator as NavigatorWithClipboard;
    const clip = nav.clipboard;
    if (clip && typeof clip.read === 'function') {
            try {
                setUploading(true);
        const items: ClipboardItem[] = await clip.read!();
                for (const item of items) {
                    const types = item.types || [];
                    const imgType = types.find((t) => t.startsWith('image/'));
                    if (imgType) {
                        const blob = await item.getType(imgType);
                        const file = new File([blob], 'pasted-image.' + (imgType.split('/')[1] || 'png'), { type: imgType });

                        if (file.size > 2 * 1024 * 1024) {
                            throw new Error('Görsel boyutu 2MB\'dan küçük olmalıdır.');
                        }

                        const res = await questionService.uploadImage(file);
                        onImagePathChange(res.url);
                        setUploading(false);
                        return;
                    }
                }
                // Görsel bulunamadıysa paste moduna düş
                setUploading(false);
                setPasteMode(true);
            } catch {
                // API başarısızsa manuel Ctrl+V yakalamaya geç
                setUploading(false);
                setPasteMode(true);
            }
        } else {
            // API desteklenmiyor, manuel yakalama
            setPasteMode(true);
        }
    };

    // Ctrl+V ile yapıştırmayı yakala (pasteMode aktifken)
    useEffect(() => {
        if (!pasteMode) return;

        const onPasteEvent = async (evt: Event) => {
            const ev = evt as ClipboardEvent;
            try {
                const items = ev.clipboardData?.items || [];
                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    if (it.type.indexOf('image') !== -1) {
                        const file = it.getAsFile();
                        if (!file) continue;
                        if (file.size > 2 * 1024 * 1024) {
                            throw new Error('Görsel boyutu 2MB\'dan küçük olmalıdır.');
                        }
                        setUploading(true);
                        const res = await questionService.uploadImage(file);
                        onImagePathChange(res.url);
                        setUploading(false);
                        setPasteMode(false);
                        ev.preventDefault();
                        return;
                    }
                }
                setLocalError('Panodan görsel bulunamadı. Lütfen bir görsel kopyalayın ve tekrar deneyin.');
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Panodan görsel alınamadı.';
                setLocalError(msg);
                onError(msg);
                setUploading(false);
                setPasteMode(false);
            }
        };

        document.addEventListener('paste', onPasteEvent);
        return () => {
            document.removeEventListener('paste', onPasteEvent);
        };
    }, [pasteMode, onImagePathChange, onError]);

    return (
        <Box>
            {/* Görsel Önizleme ve Butonlar */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Soru Resmi (Opsiyonel)
            </Typography>

            {imagePath ? (
                <Box sx={{ mb: 2, position: 'relative', width: 'fit-content' }}>
                    <img
                        src={imagePath}
                        alt="Soru resmi"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                    <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={handleRemoveImage}
                        sx={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            minWidth: '30px',
                            width: '30px',
                            height: '30px',
                            p: 0
                        }}
                    >
                        X
                    </Button>
                </Box>
            ) : (
                <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Gizli dosya inputu */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />

                    <Button
                        variant="outlined"
                        onClick={handlePickFile}
                        startIcon={<CloudUploadIcon />}
                        disabled={uploading}
                    >
                        Bilgisayardan Dosya Seç
                    </Button>

                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleStartPasteMode}
                        startIcon={<ContentPasteIcon />}
                        disabled={uploading}
                    >
                        Panodan Yapıştır
                    </Button>

                    <Button
                        variant="outlined"
                        onClick={handleOpenDialog}
                        startIcon={<SearchIcon />}
                        disabled={uploading}
                    >
                        İnternetten Bul
                    </Button>

                    {uploading && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, ml: 1 }}>
                            <CircularProgress size={18} />
                            <Typography variant="body2">Yükleniyor...</Typography>
                        </Box>
                    )}
                </Box>
            )}

            {/* Uyarılar */}
            {pasteMode && (
                <Alert severity="info" sx={{ mb: 1 }}>
                    Panodan yapıştırma aktif. Lütfen bir görsel kopyalayın ve Ctrl+V ile yapıştırın.
                </Alert>
            )}
            {localError && (
                <Alert severity="error" sx={{ mb: 1 }} onClose={() => setLocalError(null)}>
                    {localError}
                </Alert>
            )}

            {/* Görsel Arama Dialog'u */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Görsel Ara ve Seç
                    <IconButton
                        onClick={handleCloseDialog}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Aşağıdaki arama kutusunu kullanarak görselleri arayabilirsiniz. 
                        Görsele tıklayarak seçebilirsiniz.
                    </Typography>
                    
                    {/* ImageSearchPanel Component */}
                    <ImageSearchPanel
                        onImageSelected={handleImageSelected}
                        onCancel={handleCloseDialog}
                        initialQuery=""
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default ImageUploader;
