// src/pages/question-groups/EditQuestionGroup.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Box, Typography, Paper, Button, TextField,
    Grid, List, ListItem, ListItemText, Checkbox,
    ListItemIcon, Alert, CircularProgress, Chip,
    Pagination, FormHelperText, IconButton, FormControl,
    InputLabel, Select, MenuItem, SelectChangeEvent
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    CloudUpload as CloudUploadIcon,
    DeleteOutline as DeleteIcon
} from '@mui/icons-material';
import * as questionGroupService from '../../services/question-group.service';
import { usePublishers } from '../../hooks/usePublishers'; // DEĞIŞIKLIK: usePublishers hook'u eklendi

// Drag & Drop dosya yükleme için stiller
const dropzoneStyles = {
    border: '2px dashed #cccccc',
    borderRadius: '4px',
    padding: '20px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    backgroundColor: '#f9f9f9',
    transition: 'border .3s ease-in-out, background-color .3s ease-in-out',
    '&:hover': {
        backgroundColor: '#f0f0f0',
        borderColor: '#999999'
    },
    '&.active': {
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)'
    }
};

const EditQuestionGroup = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Form verileri
    const [name, setName] = useState('');
    const [questionType, setQuestionType] = useState<string>('');
    const [gameId, setGameId] = useState<number>(0);
    const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

    // DEĞIŞIKLIK: Publisher state'i - Question sayfası gibi string olarak
    const [publisherName, setPublisherName] = useState<string>('');

    // Görsel yükleme için yeni state değişkenleri
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [existingImage, setExistingImage] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [imageChanged, setImageChanged] = useState(false);

    // Liste verileri
    const [eligibleQuestions, setEligibleQuestions] = useState<questionGroupService.Question[]>([]);
    const [allGroupQuestions, setAllGroupQuestions] = useState<questionGroupService.Question[]>([]);

    // Durum
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [questionsPage, setQuestionsPage] = useState(1);
    const [totalQuestionsPages, setTotalQuestionsPages] = useState(1);

    const { publishers } = usePublishers(); // DEĞIŞIKLIK: usePublishers hook'u kullanılıyor

    // Grup verilerini yükle
    useEffect(() => {
        if (!id) return;
        fetchQuestionGroup();
    }, [id]);

    // Publisher değiştiğinde logo kontrolü
    useEffect(() => {
        if (publisherName && !imageChanged) {
            const selectedPublisher = publishers.find(p => p.name === publisherName);
            if (selectedPublisher?.logo_url && !imageFile && !existingImage) {
                setImagePreview(selectedPublisher.logo_url);
                setUploadError(null);
            }
        }
    }, [publisherName, publishers, imageFile, imageChanged, existingImage]);

    const fetchQuestionGroup = async () => {
        try {
            setLoading(true);
            const response = await questionGroupService.getQuestionGroup(parseInt(id!));

            // Form verilerini doldur
            setName(response.name);
            setQuestionType(response.question_type);
            setGameId(response.game_id);
            setAllGroupQuestions(response.questions || []);
            setSelectedQuestions(response.questions?.map(q => q.id) || []);

            // DEĞIŞIKLIK: Publisher bilgisini yükle - Question sayfası gibi
            if (response.publisher) {
                setPublisherName(response.publisher);
            }

            // Mevcut görseli ayarla
            if (response.image_url) {
                const fullImageUrl = response.image_url;
                setImagePreview(fullImageUrl);
                setExistingImage(fullImageUrl);
            }

            setLoading(false);

        } catch (err) {
            console.error('Error fetching question group:', err);
            setError('Etkinlik yüklenirken bir hata oluştu.');
            setLoading(false);
        }
    };

    // Uygun soruları yükle
    useEffect(() => {
        if (!loading && gameId && questionType) {
            fetchEligibleQuestions();
        }
    }, [loading, questionsPage, gameId, questionType]);

    const fetchEligibleQuestions = async () => {
        try {
            setQuestionsLoading(true);
            const response = await questionGroupService.getEligibleQuestions({
                game_id: gameId,
                question_type: questionType as 'multiple_choice' | 'true_false' | 'qa',
                page: questionsPage
            });
            setEligibleQuestions(response.data);
            setTotalQuestionsPages(response.last_page);
            setQuestionsLoading(false);
        } catch (err) {
            console.error('Error fetching eligible questions:', err);
            setError('Sorular yüklenirken bir hata oluştu.');
            setQuestionsLoading(false);
        }
    };

    // Soru seçimi
    const handleQuestionToggle = (questionId: number) => {
        const currentIndex = selectedQuestions.indexOf(questionId);
        const newSelectedQuestions = [...selectedQuestions];

        if (currentIndex === -1) {
            // Seçilecek soru sayısı limitini kontrol et
            if (newSelectedQuestions.length >= 48) {
                setError('En fazla 48 soru seçebilirsiniz.');
                return;
            }
            newSelectedQuestions.push(questionId);
        } else {
            newSelectedQuestions.splice(currentIndex, 1);
        }

        setSelectedQuestions(newSelectedQuestions);
        setError(null);
    };

    // DEĞIŞIKLIK: Publisher değiştir - Question sayfası gibi Select ile
    const handlePublisherChange = (event: SelectChangeEvent) => {
        const newPublisherName = event.target.value as string;
        setPublisherName(newPublisherName);

        // Eğer manuel görsel yok ve mevcut görsel de yoksa, yayınevi logosunu kullan
        if (!imageFile && !existingImage && newPublisherName) {
            const selectedPublisher = publishers.find(p => p.name === newPublisherName);
            if (selectedPublisher?.logo_url) {
                setImagePreview(selectedPublisher.logo_url);
                setUploadError(null);
                setImageChanged(false); // Yayınevi logosu değişiklik sayılmaz
            }
        }
    };

    // Görsel yükleme işlemleri
    const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
        }
    };

    const handleFileChange = (file: File) => {
        // Dosya tipini kontrol et
        if (!file.type.match('image.*')) {
            setUploadError('Lütfen geçerli bir görsel dosyası yükleyin (JPEG, PNG, GIF, vs.)');
            return;
        }

        // Dosya boyutunu kontrol et (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('Görsel dosyası 5MB\'tan küçük olmalıdır');
            return;
        }

        setUploadError(null);
        setImageFile(file);
        setImageChanged(true);

        // Önizleme URL'i oluştur
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);

        // Eğer zaten bir görsel varsa, bunu silmek istediğimizi belirtiyoruz
        if (existingImage) {
            setExistingImage(null);
            setImageChanged(true);
        }

        setUploadError(null);

        // Görsel kaldırıldıktan sonra yayınevi logosu varsa onu göster
        if (publisherName) {
            const selectedPublisher = publishers.find(p => p.name === publisherName);
            const logoUrl = selectedPublisher?.logo_url;
            if (logoUrl) {
                setTimeout(() => {
                    setImagePreview(logoUrl);
                    setImageChanged(false); // Yayınevi logosu değişiklik sayılmaz
                }, 100);
            }
        }
    };

    // Form gönderme - DEĞIŞIKLIK: Publisher string olarak dahil
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSaving(true);
            setError(null);

            // Soru sayısını kontrol et
            if (selectedQuestions.length < 16) {
                setError('En az 16 soru seçmelisiniz.');
                setSaving(false);
                return;
            }

            if (selectedQuestions.length > 48) {
                setError('En fazla 48 soru seçebilirsiniz.');
                setSaving(false);
                return;
            }

            // FormData oluştur
            const formData = new FormData();
            formData.append('name', name);
            formData.append('publisher', publisherName); // DEĞIŞIKLIK: Publisher string olarak eklendi
            formData.append('_method', 'PUT'); // Laravel'de PUT/PATCH için gerekli

            // Seçili soruları ekle
            selectedQuestions.forEach((id, index) => {
                formData.append(`question_ids[${index}]`, id.toString());
            });

            // Görsel durumunu işle
            if (imageChanged) {
                if (imageFile) {
                    formData.append('image', imageFile);
                } else {
                    // Görsel silindi
                    formData.append('remove_image', '1');
                }
            }

            // API'ye FormData gönder
            await questionGroupService.updateQuestionGroupWithImage(parseInt(id!), formData);

            // Başarılı mesajı göster
            alert('Etkinlik başarıyla güncellendi.');

            // Grup detay sayfasına yönlendir
            navigate(`/question-groups/${id}`);
        } catch (err) {
            console.error('Error updating question group:', err);
            setError('Etkinlik güncellenirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    // Soru tipi etiketini getir
    const getQuestionTypeLabel = (type: string) => {
        switch (type) {
            case 'multiple_choice':
                return 'Çoktan Seçmeli';
            case 'true_false':
                return 'Doğru-Yanlış';
            case 'qa':
                return 'Klasik';
            default:
                return type;
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{
            width: '100%',
            px: 2,
            boxSizing: 'border-box'
        }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                        component={Link}
                        to={`/question-groups/${id}`}
                        color="primary"
                        sx={{ mr: 1 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h4" fontWeight="bold">
                        Etkinliği Düzenle
                    </Typography>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        Etkinlik Bilgileri
                    </Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                label="Etkinlik"
                                fullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </Grid>

                        {/* DEĞIŞIKLIK: Publisher Alanı - Question sayfası gibi Select dropdown */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Yayınevi</InputLabel>
                                <Select
                                    value={publisherName}
                                    label="Yayınevi"
                                    onChange={handlePublisherChange}
                                    MenuProps={{
                                        PaperProps: {
                                            style: {
                                                maxHeight: 300,
                                                width: 'auto',
                                                minWidth: 200,
                                                zIndex: 1500
                                            },
                                        },
                                    }}
                                >
                                    <MenuItem value="">Yayınevi Seçin</MenuItem>
                                    {publishers.map((publisher) => (
                                        <MenuItem key={publisher.id} value={publisher.name}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {publisher.logo_url && (
                                                    <Box
                                                        component="img"
                                                        src={publisher.logo_url}
                                                        alt={publisher.name}
                                                        sx={{
                                                            width: 24,
                                                            height: 24,
                                                            objectFit: 'contain',
                                                            borderRadius: 0.5
                                                        }}
                                                    />
                                                )}
                                                <Typography>{publisher.name}</Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Soru Tipi"
                                fullWidth
                                value={getQuestionTypeLabel(questionType)}
                                InputProps={{
                                    readOnly: true,
                                }}
                                disabled
                                helperText="Soru tipi değiştirilemez"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Oyun"
                                fullWidth
                                value={gameId}
                                InputProps={{
                                    readOnly: true,
                                }}
                                disabled
                                helperText="Oyun değiştirilemez"
                            />
                        </Grid>

                        {/* Görsel Yükleme Alanı */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Etkinlik Görseli
                                {publisherName && publishers.find(p => p.name === publisherName)?.logo_url && !imageFile && !existingImage && (
                                    <Typography component="span" variant="caption" color="primary" sx={{ ml: 1 }}>
                                        (Yayınevi logosu kullanılıyor)
                                    </Typography>
                                )}
                            </Typography>

                            {imagePreview ? (

                                <Box sx={{
                                    position: 'relative',
                                    width: 'fit-content',
                                    margin: '0 auto',
                                    mb: 2
                                }}>
                                    <Box
                                        component="img"
                                        src={imagePreview}
                                        alt="Etkinlik görseli önizleme"
                                        sx={{
                                            maxWidth: '100%',
                                            maxHeight: '200px',
                                            borderRadius: 1,
                                            border: (imageFile || existingImage) ? '2px solid #2196f3' : '1px solid #e0e0e0',
                                            objectFit: 'contain'
                                        }}
                                    />
                                    <IconButton
                                        onClick={handleRemoveImage}
                                        sx={{
                                            position: 'absolute',
                                            top: -10,
                                            right: -10,
                                            bgcolor: 'rgba(255, 255, 255, 0.7)',
                                            '&:hover': {
                                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                                            }
                                        }}
                                        size="small"
                                    >
                                        <DeleteIcon />
                                    </IconButton>

                                    {/* Yayınevi logosu mu yoksa yüklenen görsel mi göster */}
                                    {!imageFile && !existingImage && publisherName && publishers.find(p => p.name === publisherName)?.logo_url && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                position: 'absolute',
                                                bottom: -25,
                                                left: 0,
                                                right: 0,
                                                textAlign: 'center',
                                                color: 'primary.main',
                                                fontWeight: 'medium'
                                            }}
                                        >
                                            Yayınevi logosu
                                        </Typography>
                                    )}
                                </Box>

                            ) : (
                                <Box
                                    sx={{
                                        ...dropzoneStyles,
                                        ...(dragActive ? {
                                            borderColor: '#2196f3',
                                            backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                        } : {})
                                    }}
                                    onDragEnter={handleDrag}
                                    onDragOver={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                >
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />
                                    <CloudUploadIcon sx={{ fontSize: 40, color: '#666', mb: 1 }} />
                                    <Typography>
                                        Görsel yüklemek için tıklayın veya sürükleyin
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Maksimum dosya boyutu: 5MB (JPEG, PNG, GIF)
                                    </Typography>

                                    {/* Yayınevi logosu olduğunda ek bilgi */}
                                    {publisherName && publishers.find(p => p.name === publisherName)?.logo_url && (
                                        <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 1 }}>
                                            Veya "{publisherName}" yayınevi logosu otomatik kullanılacak
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            {uploadError && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {uploadError}
                                </Alert>
                            )}
                        </Grid>
                    </Grid>
                </Paper>

                <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6">
                            Soruları Seçin
                        </Typography>

                        <Chip
                            label={`Seçili: ${selectedQuestions.length}/48`}
                            color={
                                selectedQuestions.length < 16 ? "error" :
                                    selectedQuestions.length <= 48 ? "success" : "error"
                            }
                        />
                    </Box>

                    <FormHelperText sx={{ mb: 2 }}>
                        Not: En az 16, en fazla 48 soru seçmelisiniz.
                    </FormHelperText>

                    {questionsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : eligibleQuestions.length === 0 ? (
                        <Alert severity="warning" sx={{ mb: 3 }}>
                            Bu oyunda seçilen tipteki sorular bulunamadı.
                        </Alert>
                    ) : (
                        <>
                            <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                                {eligibleQuestions.map((question) => {
                                    const isSelected = selectedQuestions.indexOf(question.id) !== -1;
                                    const isOriginallyInGroup = allGroupQuestions.some(q => q.id === question.id);

                                    return (
                                        <ListItem
                                            key={question.id}
                                            dense
                                            onClick={() => handleQuestionToggle(question.id)}
                                            sx={{
                                                borderBottom: '1px solid #f0f0f0',
                                                '&:last-child': { borderBottom: 'none' },
                                                bgcolor: isOriginallyInGroup ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <ListItemIcon>
                                                <Checkbox
                                                    edge="start"
                                                    checked={isSelected}
                                                    tabIndex={-1}
                                                    disableRipple
                                                />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={question.question_text}
                                                secondary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Typography variant="body2" component="span" sx={{ mr: 1 }}>
                                                            {question.category?.name}
                                                        </Typography>
                                                        {isOriginallyInGroup && (
                                                            <Chip
                                                                label="Mevcut"
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                    );
                                })}
                            </List>

                            {totalQuestionsPages > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                    <Pagination
                                        count={totalQuestionsPages}
                                        page={questionsPage}
                                        onChange={(_, page) => setQuestionsPage(page)}
                                        color="primary"
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </Paper>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                    <Button
                        component={Link}
                        to={`/question-groups/${id}`}
                        variant="outlined"
                        sx={{ mr: 2 }}
                    >
                        İptal
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                        disabled={saving || name.trim() === '' || selectedQuestions.length < 16 || selectedQuestions.length > 48}
                        sx={{
                            py: 1.5,
                            px: 3,
                            bgcolor: '#1a1a27',
                            '&:hover': { bgcolor: '#2a2a37' }
                        }}
                    >
                        {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </Button>
                </Box>
            </form>
        </Box>
    );
};

export default EditQuestionGroup;