// src/pages/categories/AddEditCategory.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Box, Typography, Paper, Button, TextField, Grid,
    CircularProgress, Alert, IconButton, FormControl,
    InputLabel, Select, MenuItem, SelectChangeEvent
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import * as categoryService from '../../services/category.service';
import { useEducationStructure } from '../../hooks/useEducationStructure';

const AddEditCategory = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;

    // Eğitim yapısı verilerini yükle
    const { grades, subjects, units, topics, loading: educationLoading } = useEducationStructure();

    // Form state
    const [name, setName] = useState('');
    const [gradeId, setGradeId] = useState<number | ''>('');
    const [subjectId, setSubjectId] = useState<number | ''>('');
    const [unitId, setUnitId] = useState<number | ''>('');
    const [topicId, setTopicId] = useState<number | ''>('');

    // Filtrelenmiş listeler
    const [filteredUnits, setFilteredUnits] = useState(units);
    const [filteredTopics, setFilteredTopics] = useState(topics);

    // UI states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Kategoriyi yükle (düzenleme modu için)
    useEffect(() => {
        if (isEdit) {
            const fetchCategory = async () => {
                try {
                    setLoading(true);
                    const categoryData = await categoryService.getCategory(parseInt(id!));

                    // Form alanlarını doldur
                    setName(categoryData.name);
                    setGradeId(categoryData.grade_id);
                    setSubjectId(categoryData.subject_id);
                    setUnitId(categoryData.unit_id || '');
                    setTopicId(categoryData.topic_id || '');

                    setLoading(false);
                } catch (err) {
                    console.error('Error fetching category:', err);
                    setError('Kategori yüklenirken bir hata oluştu.');
                    setLoading(false);
                }
            };

            fetchCategory();
        }
    }, [id, isEdit]);

    // Grade ve Subject değiştiğinde ilgili üniteleri filtrele
    useEffect(() => {
        if (gradeId && subjectId) {
            const filtered = units.filter(
                unit => unit.grade_id === gradeId && unit.subject_id === subjectId
            );
            setFilteredUnits(filtered);

            // Eğer seçili ünite bu filtrelere uygun değilse, seçimi sıfırla
            if (unitId && !filtered.some(unit => unit.id === unitId)) {
                setUnitId('');
                setTopicId('');
            }
        } else {
            setFilteredUnits([]);
            setUnitId('');
            setTopicId('');
        }
    }, [gradeId, subjectId, units, unitId]);

    // Unit değiştiğinde ilgili konuları filtrele
    useEffect(() => {
        if (unitId) {
            const filtered = topics.filter(topic => topic.unit_id === unitId);
            setFilteredTopics(filtered);

            // Eğer seçili konu bu filtreye uygun değilse, seçimi sıfırla
            if (topicId && !filtered.some(topic => topic.id === topicId)) {
                setTopicId('');
            }
        } else {
            setFilteredTopics([]);
            setTopicId('');
        }
    }, [unitId, topics, topicId]);

    // Form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError(null);

            const categoryData: categoryService.CategoryCreate = {
                name,
                grade_id: gradeId as number,
                subject_id: subjectId as number,
                unit_id: unitId ? (unitId as number) : undefined,
                topic_id: topicId ? (topicId as number) : undefined
            };

            if (isEdit) {
                await categoryService.updateCategory(parseInt(id!), categoryData);
                setSuccess('Kategori başarıyla güncellendi.');
            } else {
                await categoryService.createCategory(categoryData);
                setSuccess('Kategori başarıyla oluşturuldu.');

                // Yeni kategori eklendiyse formu sıfırla
                if (!isEdit) {
                    setName('');
                    setGradeId('');
                    setSubjectId('');
                    setUnitId('');
                    setTopicId('');
                }
            }

            // 2 saniye sonra kategoriler sayfasına yönlendir
            setTimeout(() => {
                navigate('/categories');
            }, 2000);

        } catch (err) {
            console.error('Error saving category:', err);
            setError(isEdit ? 'Kategori güncellenirken bir hata oluştu.' : 'Kategori oluşturulurken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Sınıf ve ders seçimi
    const handleGradeChange = (event: SelectChangeEvent<number | ''>) => {
        setGradeId(event.target.value as number | '');
    };

    const handleSubjectChange = (event: SelectChangeEvent<number | ''>) => {
        setSubjectId(event.target.value as number | '');
    };

    const handleUnitChange = (event: SelectChangeEvent<number | ''>) => {
        setUnitId(event.target.value as number | '');
    };

    const handleTopicChange = (event: SelectChangeEvent<number | ''>) => {
        setTopicId(event.target.value as number | '');
    };

    return (
        <Box sx={{
            width: '100%',
            px: 2,            // Responsive boşluk (varsayılan container gibi)
            boxSizing: 'border-box'
        }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <IconButton
                    component={Link}
                    to="/categories"
                    color="primary"
                    sx={{ mr: 1 }}
                >
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" fontWeight="bold">
                    {isEdit ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
                </Typography>
            </Box>

            {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    {success}
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                {(loading && !isEdit) || educationLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Kategori Adı"
                                    fullWidth
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Sınıf Seviyesi</InputLabel>
                                    <Select
                                        value={gradeId}
                                        label="Sınıf Seviyesi"
                                        onChange={handleGradeChange}
                                        required
                                        disabled={loading}
                                    >
                                        <MenuItem value="" disabled>Sınıf Seçin</MenuItem>
                                        {grades.map((grade) => (
                                            <MenuItem key={grade.id} value={grade.id}>{grade.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Ders</InputLabel>
                                    <Select
                                        value={subjectId}
                                        label="Ders"
                                        onChange={handleSubjectChange}
                                        required
                                        disabled={loading}
                                    >
                                        <MenuItem value="" disabled>Ders Seçin</MenuItem>
                                        {subjects.map((subject) => (
                                            <MenuItem key={subject.id} value={subject.id}>{subject.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Ünite</InputLabel>
                                    <Select
                                        value={unitId}
                                        label="Ünite"
                                        onChange={handleUnitChange}
                                        disabled={loading || !gradeId || !subjectId || filteredUnits.length === 0}
                                    >
                                        <MenuItem value="">Ünite Seçin (Opsiyonel)</MenuItem>
                                        {filteredUnits.map((unit) => (
                                            <MenuItem key={unit.id} value={unit.id}>{unit.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Konu</InputLabel>
                                    <Select
                                        value={topicId}
                                        label="Konu"
                                        onChange={handleTopicChange}
                                        disabled={loading || !unitId || filteredTopics.length === 0}
                                    >
                                        <MenuItem value="">Konu Seçin (Opsiyonel)</MenuItem>
                                        {filteredTopics.map((topic) => (
                                            <MenuItem key={topic.id} value={topic.id}>{topic.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sx={{ mt: 2, textAlign: 'right' }}>
                                <Button
                                    component={Link}
                                    to="/categories"
                                    variant="outlined"
                                    sx={{ mr: 2 }}
                                    disabled={loading}
                                >
                                    İptal
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading || !name || !gradeId || !subjectId}
                                    startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                                    sx={{
                                        py: 1.5,
                                        px: 3,
                                        bgcolor: '#1a1a27',
                                        '&:hover': { bgcolor: '#2a2a37' }
                                    }}
                                >
                                    {loading ? 'Kaydediliyor...' : (isEdit ? 'Güncelle' : 'Kaydet')}
                                </Button>
                            </Grid>
                        </Grid>
                    </form>
                )}
            </Paper>
        </Box>
    );
};

export default AddEditCategory;