// src/components/ImageSearchPanel.tsx
import React, { useState, useEffect } from 'react';
import {
    Box, TextField, IconButton, Grid, Card, CardMedia,
    Button, CircularProgress, Typography, Pagination, Alert
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import * as questionService from '../services/question.service';

interface ImageResult {
    id: string | number;
    preview_url: string;
    web_format_url: string;
    large_image_url?: string;
    title?: string;
    source?: string;
}

interface ImageSearchPanelProps {
    onImageSelected: (imagePath: string) => void;
    onCancel: () => void;
    initialQuery?: string;
}

const ImageSearchPanel: React.FC<ImageSearchPanelProps> = ({
    onImageSelected,
    onCancel,
    initialQuery = ''
}) => {
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [searchResults, setSearchResults] = useState<ImageResult[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Görsel arama fonksiyonu
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setError('Lütfen arama kelimesi girin');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await questionService.searchImages(searchQuery, page);
            
            setSearchResults(result.images || []);
            
            // Toplam sayfa sayısını hesapla (her sayfada 48 sonuç - Freepik web sitesi gibi)
            const total = result.total || 0;
            const perPage = 48; // Backend ile aynı değer
            setTotalPages(Math.ceil(total / perPage));

        } catch (err) {
            console.error('Görsel arama hatası:', err);
            setError('Görsel aranırken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    // İlk yüklemede arama yap (eğer initialQuery varsa)
    useEffect(() => {
        if (initialQuery.trim()) {
            handleSearch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sayfa değiştiğinde arama yap
    useEffect(() => {
        if (searchResults.length > 0 && searchQuery.trim()) {
            handleSearch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // Enter tuşuna basıldığında arama yap
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setPage(1); // Yeni arama için sayfa 1'e dön
            handleSearch();
        }
    };

    // Görseli seç ve HEMEN kaydet
    const handleImageClick = async (imageUrl: string) => {
        if (loading) return; // Eğer yükleme devam ediyorsa tıklamayı yoksay

        console.log('🖼️ Görsel seçildi:', imageUrl);
        setSelectedImage(imageUrl);
        
        try {
            setLoading(true);
            console.log('📤 Görsel kaydediliyor...');
            
            // Harici URL'den görseli kaydet
            const response = await questionService.saveExternalImage(imageUrl);
            console.log('✅ Görsel kaydedildi:', response.url);
            
            // Kaydedilen görselin yolunu parent component'e gönder
            onImageSelected(response.url);
            
        } catch (err) {
            console.error('❌ Görsel kaydetme hatası:', err);
            setError('Görsel kaydedilirken bir hata oluştu.');
            setSelectedImage(null); // Hata olursa seçimi temizle
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box 
            sx={{ 
                p: 1.5, 
                border: '2px solid #2196f3', 
                borderRadius: 2, 
                mt: 1,
                bgcolor: '#f5f9ff'
            }}
        >
            {/* Arama Kutusu */}
            <TextField
                fullWidth
                size="small"
                placeholder="Aramak istediğiniz konuyu yazın (örn: bitki fotosentezi, dünya gezegeni, insan kalbi)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                InputProps={{
                    endAdornment: (
                        <IconButton 
                            onClick={() => {
                                setPage(1);
                                handleSearch();
                            }}
                            disabled={loading}
                            color="primary"
                            size="small"
                        >
                            {loading ? <CircularProgress size={18} /> : <SearchIcon />}
                        </IconButton>
                    )
                }}
                sx={{ mb: 1 }}
            />

            {/* Arama İpuçları */}
            {!loading && searchResults.length === 0 && !searchQuery && (
                <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
                    <Typography variant="body2">
                        💡 <strong>İpucu:</strong> Detaylı ve Türkçe anahtar kelimeler kullanın. 
                        <br />
                        <Typography component="span" variant="caption">
                                Örn: "çocuk" yerine → "gülen kız çocuğu"
                        </Typography>
                    </Typography>
                </Alert>
            )}

            {/* Hata Mesajı */}
            {error && (
                <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Yükleme Göstergesi */}
            {loading && searchResults.length === 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={30} />
                </Box>
            )}

            {/* Sonuç Yok Mesajı */}
            {!loading && searchResults.length === 0 && searchQuery && (
                <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    align="center" 
                    sx={{ py: 2 }}
                >
                    Sonuç bulunamadı. Farklı kelime deneyin.
                </Typography>
            )}

            {/* Sonuçlar Grid */}
            {searchResults.length > 0 && (
                <Box>
                    {/* Görsel Grid - Scroll ile - Daha fazla görsel için yükseklik artırıldı */}
                    <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 1.5 }}>
                        <Grid container spacing={1.5}>
                            {searchResults.map((image, index) => (
                                <Grid item xs={6} sm={4} md={3} key={`${image.id}-${index}`}>
                                    <Card
                                        sx={{
                                            position: 'relative',
                                            cursor: loading ? 'wait' : 'pointer',
                                            border: selectedImage === image.web_format_url 
                                                ? '3px solid #4caf50' 
                                                : '1px solid #ddd',
                                            transition: 'all 0.2s',
                                            opacity: loading ? 0.6 : 1,
                                            '&:hover': { 
                                                boxShadow: loading ? 0 : 3,
                                                transform: loading ? 'none' : 'scale(1.02)'
                                            }
                                        }}
                                        onClick={() => handleImageClick(image.web_format_url)}
                                    >
                                        <CardMedia
                                            component="img"
                                            height="100"
                                            image={image.preview_url || image.web_format_url}
                                            alt={image.title || `Sonuç ${index + 1}`}
                                            sx={{ objectFit: 'cover' }}
                                        />
                                        {loading && selectedImage === image.web_format_url && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: 'rgba(255, 255, 255, 0.8)'
                                                }}
                                            >
                                                <CircularProgress size={30} />
                                            </Box>
                                        )}
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    {/* Sayfalama */}
                    {totalPages > 1 && (
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={(_e, value) => setPage(value)}
                            color="primary"
                            size="small"
                            disabled={loading}
                            sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}
                        />
                    )}

                    {/* Bilgi Mesajı */}
                    {!loading && (
                        <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
                            <Typography variant="body2">
                                💡 Görsele tıklayarak seçin. Otomatik kaydedilecek. 
                                <Typography component="span" variant="caption" sx={{ ml: 1, fontStyle: 'italic' }}>
                                    (Powered by Freepik)
                                </Typography>
                            </Typography>
                        </Alert>
                    )}
                    
                    {/* Yükleme Durumu */}
                    {loading && selectedImage && (
                        <Alert severity="success" sx={{ mb: 1.5, py: 0.5 }}>
                            <Typography variant="body2" fontWeight="bold">
                                ⏳ Görsel kaydediliyor, lütfen bekleyin...
                            </Typography>
                        </Alert>
                    )}
                </Box>
            )}

            {/* İptal Butonu - Sadece iptal için */}
            <Box 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end',
                    pt: 1.5,
                    borderTop: '2px solid #e0e0e0',
                    bgcolor: '#f5f9ff'
                }}
            >
                <Button 
                    variant="outlined" 
                    onClick={onCancel}
                    disabled={loading}
                    size="medium"
                >
                    {loading ? 'Kaydediliyor...' : 'Kapat'}
                </Button>
            </Box>
        </Box>
    );
};

export default ImageSearchPanel;
