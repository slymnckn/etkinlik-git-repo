import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Stepper, Step, StepLabel, Button,
    Grid, TextField, FormControl, InputLabel, Select, MenuItem,
    SelectChangeEvent, Divider, Alert, CircularProgress, List,
    ListItem, ListItemText, Checkbox, ListItemIcon,
    FormHelperText, Chip, IconButton, FormGroup, FormControlLabel,
    Accordion, AccordionSummary, AccordionDetails, LinearProgress
} from '@mui/material';
import {
    CloudUpload as CloudUploadIcon,
    DeleteOutline as DeleteIcon,
    ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import * as questionGroupService from '../../services/question-group.service';
import * as gameService from '../../services/game.service';
import * as userService from '../../services/user.service';
import { useCategories } from '../../hooks/useCategories';
import * as categoryService from '../../services/category.service';
import { useEducationStructure } from "../../hooks/useEducationStructure.ts";
import { usePublishers } from '../../hooks/usePublishers';

const steps = ['Etkinlik Bilgileri', 'Soru Seçimi', 'Önizleme'];

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

// Soru tipi interface'i
interface QuestionTypeData {
    key: 'multiple_choice' | 'true_false' | 'qa';
    label: string;
    questions: questionGroupService.Question[];
    selectedQuestions: number[];
    loading: boolean;
}

// Etkinlik kombinasyonu interface'i
interface ActivityCombination {
    gameId: number;
    gameName: string;
    questionType: string;
    questionTypeLabel: string;
    questionIds: number[];
    name: string;
}

const AddQuestionGroup = () => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);

    // Form verileri
    const [name, setName] = useState('');
    const [selectedGames, setSelectedGames] = useState<number[]>([]);
    const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([]);
    const [categoryId, setCategoryId] = useState<string>('');
    const [categoryExists, setCategoryExists] = useState<boolean>(false);
    const [creatingCategory, setCreatingCategory] = useState<boolean>(false);
    const [publisherName, setPublisherName] = useState<string>('');

    // Filtrelenmiş listeler
    const [filteredUnits, setFilteredUnits] = useState<any[]>([]);
    const [filteredTopics, setFilteredTopics] = useState<any[]>([]);

    // Manuel seçim alanları
    const [gradeId, setGradeId] = useState<number | ''>('');
    const [subjectId, setSubjectId] = useState<number | ''>('');
    const [unitId, setUnitId] = useState<number | ''>('');
    const [topicId, setTopicId] = useState<number | ''>('');

    // Görsel yükleme için state değişkenleri
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Liste verileri
    const [games, setGames] = useState<gameService.Game[]>([]);

    // Soru tipi bazlı veri yönetimi
    const [questionTypeData, setQuestionTypeData] = useState<Record<string, QuestionTypeData>>({
        'multiple_choice': {
            key: 'multiple_choice',
            label: 'Çoktan Seçmeli',
            questions: [],
            selectedQuestions: [],
            loading: false
        },
        'true_false': {
            key: 'true_false',
            label: 'Doğru-Yanlış',
            questions: [],
            selectedQuestions: [],
            loading: false
        },
        'qa': {
            key: 'qa',
            label: 'Klasik',
            questions: [],
            selectedQuestions: [],
            loading: false
        }
    });

    // Etkinlik kombinasyonları
    const [activityCombinations, setActivityCombinations] = useState<ActivityCombination[]>([]);

    // Durum
    const [loading, setLoading] = useState(false);
    const [gamesLoading, setGamesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [creationProgress, setCreationProgress] = useState<{
        current: number;
        total: number;
        currentActivity: string;
    } | null>(null);

    const { grades, subjects, units, topics } = useEducationStructure();
    const { categories, refreshCategories } = useCategories();
    const { publishers } = usePublishers();

    // Current user'dan default publisher yükleme
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const user = await userService.getCurrentUser();
                if (user.publisher) {
                    setPublisherName(user.publisher);
                }
            } catch (error) {
                console.error('Current user yüklenirken hata:', error);
            }
        };

        fetchCurrentUser();
    }, []);

    // Oyunları yükle
    useEffect(() => {
        const fetchGames = async () => {
            try {
                setGamesLoading(true);
                const response = await gameService.getGames(1);
                setGames(response.data);
                setGamesLoading(false);
            } catch (err) {
                console.error('Error fetching games:', err);
                setError('Oyunlar yüklenirken bir hata oluştu.');
                setGamesLoading(false);
            }
        };

        fetchGames();
    }, []);

    // Grade ve Subject değiştiğinde ilgili üniteleri filtrele
    useEffect(() => {
        if (gradeId && subjectId) {
            const filtered = units.filter(
                unit => unit.grade_id === gradeId && unit.subject_id === subjectId
            );
            setFilteredUnits(filtered);

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

            if (topicId && !filtered.some(topic => topic.id === topicId)) {
                setTopicId('');
            }
        } else {
            setFilteredTopics([]);
            setTopicId('');
        }
    }, [unitId, topics, topicId]);

    // Seçilen kombinasyona göre kategori durumunu kontrol et
    useEffect(() => {
        if (gradeId && subjectId && unitId && topicId) {
            const matchingCategory = categories.find(category =>
                category.grade_id === gradeId &&
                category.subject_id === subjectId &&
                category.unit_id === unitId &&
                category.topic_id === topicId
            );

            if (matchingCategory) {
                setCategoryExists(true);
                setCategoryId(matchingCategory.id.toString());
            } else {
                setCategoryExists(false);
                setCategoryId('');
            }
        } else {
            setCategoryExists(false);
            setCategoryId('');
        }
    }, [gradeId, subjectId, unitId, topicId, categories]);

    // Seçilen soru tiplerinde değişiklik olduğunda soruları yükle
    useEffect(() => {
        if (activeStep === 1 && selectedGames.length > 0 && selectedQuestionTypes.length > 0 && categoryId) {
            selectedQuestionTypes.forEach(questionType => {
                if (questionTypeData[questionType].questions.length === 0) {
                    fetchQuestionsForType(questionType);
                }
            });
        }
    }, [activeStep, selectedGames, selectedQuestionTypes, categoryId]);

    // Önizleme adımında kombinasyonları hesapla
    useEffect(() => {
        if (activeStep === 2) {
            generateActivityCombinations();
        }
    }, [activeStep, selectedGames, selectedQuestionTypes, questionTypeData, name]);

    // Publisher değiştiğinde logo kontrolü
    useEffect(() => {
        if (publisherName) {
            const selectedPublisher = publishers.find(p => p.name === publisherName);
            if (selectedPublisher?.logo_url && !imageFile && !imagePreview) {
                setImagePreview(selectedPublisher.logo_url);
                setUploadError(null);
            }
        } else {
            if (imagePreview && !imageFile) {
                setImagePreview(null);
            }
        }
    }, [publisherName, publishers, imageFile]);

    // Belirli bir soru tipi için soruları yükle
    const fetchQuestionsForType = async (questionType: string) => {
        try {
            setQuestionTypeData(prev => ({
                ...prev,
                [questionType]: {
                    ...prev[questionType],
                    loading: true
                }
            }));

            // Tüm soruları toplamak için array
            let allQuestions: questionGroupService.Question[] = [];
            let currentPage = 1;
            let hasMorePages = true;

            // İlk oyunu kullanarak soruları çek (tüm oyunlar için aynı sorular kullanılabilir)
            const firstGameId = selectedGames[0];

            // Tüm sayfaları sırayla çek
            while (hasMorePages) {
                const response = await questionGroupService.getEligibleQuestions({
                    game_id: firstGameId,
                    question_type: questionType as 'multiple_choice' | 'true_false' | 'qa',
                    category_id: parseInt(categoryId),
                    page: currentPage
                });

                allQuestions = [...allQuestions, ...response.data];

                if (currentPage >= response.last_page) {
                    hasMorePages = false;
                } else {
                    currentPage++;
                }
            }

            setQuestionTypeData(prev => ({
                ...prev,
                [questionType]: {
                    ...prev[questionType],
                    questions: allQuestions,
                    loading: false
                }
            }));

        } catch (err) {
            console.error(`Error fetching questions for type ${questionType}:`, err);
            setQuestionTypeData(prev => ({
                ...prev,
                [questionType]: {
                    ...prev[questionType],
                    loading: false
                }
            }));
        }
    };

    // Kombinasyonları oluştur
    const generateActivityCombinations = () => {
        const combinations: ActivityCombination[] = [];

        selectedGames.forEach(gameId => {
            const game = games.find(g => g.id === gameId);
            if (!game) return;

            selectedQuestionTypes.forEach(questionType => {
                const typeData = questionTypeData[questionType];
                const questionIds = typeData.selectedQuestions;

                if (questionIds.length >= 16) {
                    combinations.push({
                        gameId,
                        gameName: game.name,
                        questionType,
                        questionTypeLabel: typeData.label,
                        questionIds,
                        name: `${name} - ${game.name} - ${typeData.label}`
                    });
                }
            });
        });

        setActivityCombinations(combinations);
    };

    // Adım kontrolü
    const handleNext = () => {
        setActiveStep((prevStep) => prevStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    // Oyun seçimi
    const handleGameToggle = (gameId: number) => {
        setSelectedGames(prev => {
            if (prev.includes(gameId)) {
                return prev.filter(id => id !== gameId);
            } else {
                return [...prev, gameId];
            }
        });
    };

    // Soru tipi seçimi
    const handleQuestionTypeToggle = (questionType: string) => {
        setSelectedQuestionTypes(prev => {
            if (prev.includes(questionType)) {
                // Soru tipi kaldırılırken seçilen soruları da temizle
                setQuestionTypeData(current => ({
                    ...current,
                    [questionType]: {
                        ...current[questionType],
                        selectedQuestions: []
                    }
                }));
                return prev.filter(type => type !== questionType);
            } else {
                return [...prev, questionType];
            }
        });
    };

    const handlePublisherChange = (event: SelectChangeEvent) => {
        const newPublisherName = event.target.value;
        setPublisherName(newPublisherName);

        if (!imageFile && newPublisherName) {
            const selectedPublisher = publishers.find(p => p.name === newPublisherName);
            if (selectedPublisher?.logo_url) {
                setImagePreview(selectedPublisher.logo_url);
                setUploadError(null);
            }
        }
    };

    // Kategori adını oluştur
    const generateCategoryName = (): string => {
        const gradeName = grades.find(g => g.id === gradeId)?.name || '';
        const subjectName = subjects.find(s => s.id === subjectId)?.name || '';
        const unitName = unitId ? units.find(u => u.id === unitId)?.name : '';
        const topicName = topicId ? topics.find(t => t.id === topicId)?.name : '';

        let categoryName = `${gradeName} - ${subjectName}`;
        if (unitName) categoryName += ` - ${unitName}`;
        if (topicName) categoryName += ` - ${topicName}`;

        return categoryName;
    };

    // Yeni kategori oluştur
    const handleCreateCategory = async () => {
        if (!gradeId || !subjectId || !unitId || !topicId) {
            setError('Sınıf, ders, ünite ve konu seçimi zorunludur.');
            return;
        }

        setCreatingCategory(true);
        setError(null);

        try {
            const categoryData: categoryService.CategoryCreate = {
                name: generateCategoryName(),
                grade_id: gradeId as number,
                subject_id: subjectId as number,
                unit_id: unitId as number,
                topic_id: topicId as number
            };

            const newCategory = await categoryService.createCategory(categoryData);
            await refreshCategories();
            setCategoryId(newCategory.id.toString());
            setCategoryExists(true);
            setError(null);
        } catch (err) {
            console.error('Error creating category:', err);
            setError('Kategori oluşturulurken bir hata oluştu.');
        } finally {
            setCreatingCategory(false);
        }
    };

    // Form alanları için handle fonksiyonları
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

    // Soru seçimi (tip bazlı)
    const handleQuestionToggle = (questionType: string, questionId: number) => {
        setQuestionTypeData(prev => {
            const currentSelected = prev[questionType].selectedQuestions;
            const newSelected = currentSelected.includes(questionId)
                ? currentSelected.filter(id => id !== questionId)
                : currentSelected.length >= 48
                    ? currentSelected
                    : [...currentSelected, questionId];

            if (currentSelected.length >= 48 && !currentSelected.includes(questionId)) {
                setError(`${prev[questionType].label} için en fazla 48 soru seçebilirsiniz.`);
                setTimeout(() => setError(null), 3000);
                return prev;
            }

            return {
                ...prev,
                [questionType]: {
                    ...prev[questionType],
                    selectedQuestions: newSelected
                }
            };
        });
    };

    // Soru tipi için tümünü seç/kaldır
    const handleSelectAllForType = (questionType: string) => {
        setQuestionTypeData(prev => {
            const typeData = prev[questionType];
            const isAllSelected = typeData.questions.every(q => typeData.selectedQuestions.includes(q.id));

            let newSelected: number[];
            if (isAllSelected) {
                newSelected = [];
            } else {
                const unselected = typeData.questions
                    .filter(q => !typeData.selectedQuestions.includes(q.id))
                    .slice(0, 48 - typeData.selectedQuestions.length);
                newSelected = [...typeData.selectedQuestions, ...unselected.map(q => q.id)];
            }

            return {
                ...prev,
                [questionType]: {
                    ...prev[questionType],
                    selectedQuestions: newSelected
                }
            };
        });
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
        if (!file.type.match('image.*')) {
            setUploadError('Lütfen geçerli bir görsel dosyası yükleyin (JPEG, PNG, GIF, vs.)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadError('Görsel dosyası 5MB\'tan küçük olmalıdır');
            return;
        }

        setUploadError(null);
        setImageFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setUploadError(null);

        if (publisherName) {
            const selectedPublisher = publishers.find(p => p.name === publisherName);
            if (selectedPublisher?.logo_url) {
                setTimeout(() => {
                    setImagePreview(selectedPublisher.logo_url || null);
                }, 100);
            }
        }
    };

    // Form gönderme (çoklu etkinlik oluşturma)
    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            if (activityCombinations.length === 0) {
                setError('Oluşturulacak etkinlik bulunamadı.');
                setLoading(false);
                return;
            }

            setCreationProgress({
                current: 0,
                total: activityCombinations.length,
                currentActivity: ''
            });

            const successfulActivities: string[] = [];
            const failedActivities: string[] = [];

            for (let i = 0; i < activityCombinations.length; i++) {
                const combination = activityCombinations[i];

                setCreationProgress({
                    current: i,
                    total: activityCombinations.length,
                    currentActivity: combination.name
                });

                try {
                    const formData = new FormData();
                    formData.append('name', combination.name);
                    formData.append('question_type', combination.questionType);
                    formData.append('game_id', combination.gameId.toString());
                    formData.append('category_id', categoryId);
                    formData.append('publisher', publisherName);

                    combination.questionIds.forEach((id, index) => {
                        formData.append(`question_ids[${index}]`, id.toString());
                    });

                    if (imageFile) {
                        formData.append('image', imageFile);
                    }

                    await questionGroupService.createQuestionGroupWithImage(formData);
                    successfulActivities.push(combination.name);
                } catch (err) {
                    console.error(`Error creating activity ${combination.name}:`, err);
                    failedActivities.push(combination.name);
                }
            }

            setCreationProgress({
                current: activityCombinations.length,
                total: activityCombinations.length,
                currentActivity: 'Tamamlandı'
            });

            // Sonuç mesajı
            let message = '';
            if (successfulActivities.length > 0) {
                message += `${successfulActivities.length} etkinlik başarıyla oluşturuldu.`;
            }
            if (failedActivities.length > 0) {
                message += ` ${failedActivities.length} etkinlik oluşturulamadı.`;
            }

            if (failedActivities.length === 0) {
                alert(message);
                navigate('/question-groups');
            } else {
                setError(message + ' Başarısız etkinlikler: ' + failedActivities.join(', '));
            }

        } catch (err) {
            console.error('Error creating activities:', err);
            setError('Etkinlikler oluşturulurken bir hata oluştu.');
        } finally {
            setLoading(false);
            setCreationProgress(null);
        }
    };



    // Adım geçerlilik kontrolleri
    const isFirstStepValid = () => {
        return name.trim() !== '' &&
            selectedGames.length > 0 &&
            selectedQuestionTypes.length > 0 &&
            publisherName.trim() !== '' &&
            categoryExists;
    };

    const isSecondStepValid = () => {
        return selectedQuestionTypes.every(type => {
            const typeData = questionTypeData[type];
            return typeData.selectedQuestions.length >= 16 && typeData.selectedQuestions.length <= 48;
        });
    };

    // Adım içeriği
    const getStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Box sx={{ width: '100%', px: 2, boxSizing: 'border-box' }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Etkinlik Bilgilerini Girin
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Etkinlik Adı (Temel)"
                                    fullWidth
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    helperText="Bu isim oyun ve soru tipi ile birlikte kullanılacak"
                                />
                            </Grid>

                            {/* Publisher Alanı */}
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel>Yayınevi</InputLabel>
                                    <Select
                                        value={publisherName}
                                        label="Yayınevi"
                                        onChange={handlePublisherChange}
                                        error={!publisherName.trim() && activeStep === 0}
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

                            {/* Kategori Seçimi */}
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Kategori Seçimi
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <FormControl fullWidth required>
                                            <InputLabel>Sınıf</InputLabel>
                                            <Select
                                                value={gradeId}
                                                label="Sınıf"
                                                onChange={handleGradeChange}
                                                required
                                            >
                                                <MenuItem value="" disabled>Sınıf Seçin</MenuItem>
                                                {grades.map((grade) => (
                                                    <MenuItem key={grade.id} value={grade.id}>
                                                        {grade.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={3}>
                                        <FormControl fullWidth required>
                                            <InputLabel>Ders</InputLabel>
                                            <Select
                                                value={subjectId}
                                                label="Ders"
                                                onChange={handleSubjectChange}
                                                required
                                            >
                                                <MenuItem value="" disabled>Ders Seçin</MenuItem>
                                                {subjects.map((subject) => (
                                                    <MenuItem key={subject.id} value={subject.id}>
                                                        {subject.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={3}>
                                        <FormControl fullWidth required>
                                            <InputLabel>Ünite</InputLabel>
                                            <Select
                                                value={unitId}
                                                label="Ünite"
                                                onChange={handleUnitChange}
                                                disabled={!gradeId || !subjectId || filteredUnits.length === 0}
                                            >
                                                <MenuItem value="">Ünite Seçin</MenuItem>
                                                {filteredUnits.map((unit) => (
                                                    <MenuItem key={unit.id} value={unit.id}>
                                                        {unit.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12} sm={6} md={3}>
                                        <FormControl fullWidth required>
                                            <InputLabel>Konu</InputLabel>
                                            <Select
                                                value={topicId}
                                                label="Konu"
                                                onChange={handleTopicChange}
                                                disabled={!unitId || filteredTopics.length === 0}
                                            >
                                                <MenuItem value="">Konu Seçin</MenuItem>
                                                {filteredTopics.map((topic) => (
                                                    <MenuItem key={topic.id} value={topic.id}>
                                                        {topic.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    {/* Kategori Ekle Butonu */}
                                    {gradeId && subjectId && unitId && topicId && !categoryExists && (
                                        <Grid item xs={12}>
                                            <Button
                                                variant="contained"
                                                color="secondary"
                                                onClick={handleCreateCategory}
                                                disabled={creatingCategory}
                                                sx={{ mt: 1 }}
                                            >
                                                {creatingCategory ? (
                                                    <>
                                                        <CircularProgress size={20} sx={{ mr: 1 }} />
                                                        Oluşturuluyor...
                                                    </>
                                                ) : (
                                                    'Kategoriyi Ekle'
                                                )}
                                            </Button>
                                        </Grid>
                                    )}
                                </Grid>

                                {/* Alert mesajı */}
                                {gradeId && subjectId && unitId && topicId && (
                                    <Alert
                                        severity={categoryExists ? "success" : "info"}
                                        sx={{ mt: 2 }}
                                    >
                                        {categoryExists
                                            ? `Kategori mevcut: ${generateCategoryName()}`
                                            : `Bu kombinasyon için kategori bulunamadı: ${generateCategoryName()}`
                                        }
                                    </Alert>
                                )}
                            </Grid>

                            {/* Oyun Seçimi - Çoklu */}
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Oyun Seçimi (Çoklu)
                                </Typography>
                                {gamesLoading ? (
                                    <CircularProgress />
                                ) : (
                                    <FormGroup>
                                        <Grid container spacing={1}>
                                            {games.map((game) => (
                                                <Grid item xs={12} sm={6} md={4} key={game.id}>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={selectedGames.includes(game.id)}
                                                                onChange={() => handleGameToggle(game.id)}
                                                            />
                                                        }
                                                        label={`${game.name} (${game.type === 'jeopardy' ? 'Jeopardy' : 'Bilgi Çarkı'})`}
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </FormGroup>
                                )}
                                <FormHelperText>
                                    En az 1 oyun seçmelisiniz. Seçilen: {selectedGames.length}
                                </FormHelperText>
                            </Grid>

                            {/* Soru Tipi Seçimi - Çoklu */}
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Soru Tipi Seçimi (Çoklu)
                                </Typography>
                                <FormGroup>
                                    <Grid container spacing={1}>
                                        {Object.values(questionTypeData).map((typeData) => (
                                            <Grid item xs={12} sm={6} md={4} key={typeData.key}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={selectedQuestionTypes.includes(typeData.key)}
                                                            onChange={() => handleQuestionTypeToggle(typeData.key)}
                                                        />
                                                    }
                                                    label={typeData.label}
                                                />
                                            </Grid>
                                        ))}
                                    </Grid>
                                </FormGroup>
                                <FormHelperText>
                                    En az 1 soru tipi seçmelisiniz. Seçilen: {selectedQuestionTypes.length}
                                </FormHelperText>
                            </Grid>

                            {/* Görsel Yükleme Alanı */}
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Etkinlik Görseli (Opsiyonel)
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
                                                border: '1px solid #e0e0e0'
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
                                    </Box>
                                )}

                                {uploadError && (
                                    <Alert severity="error" sx={{ mt: 2 }}>
                                        {uploadError}
                                    </Alert>
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                );

            case 1:
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Soru Tipi Bazlı Soru Seçimi
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Her soru tipi için ayrı ayrı sorularınızı seçin. Her tip için en az 16, en fazla 48 soru seçmelisiniz.
                        </Typography>

                        {selectedQuestionTypes.map((questionType) => {
                            const typeData = questionTypeData[questionType];
                            const isExpanded = typeData.selectedQuestions.length > 0 || typeData.questions.length > 0;

                            return (
                                <Accordion
                                    key={questionType}
                                    expanded={isExpanded}
                                    sx={{ mb: 2 }}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        sx={{
                                            bgcolor: typeData.selectedQuestions.length >= 16 ? 'success.light' : 'warning.light',
                                            '&.Mui-expanded': {
                                                bgcolor: typeData.selectedQuestions.length >= 16 ? 'success.light' : 'warning.light'
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: 2 }}>
                                            <Typography variant="h6">
                                                {typeData.label} Soruları
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                <Chip
                                                    label={`Seçili: ${typeData.selectedQuestions.length}/48`}
                                                    color={
                                                        typeData.selectedQuestions.length < 16 ? "error" :
                                                            typeData.selectedQuestions.length <= 48 ? "success" : "error"
                                                    }
                                                    size="small"
                                                />
                                                <Chip
                                                    label={`Mevcut: ${typeData.questions.length}`}
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            </Box>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        {typeData.loading ? (
                                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                                <CircularProgress />
                                                <Typography sx={{ ml: 2 }}>
                                                    {typeData.label} soruları yükleniyor...
                                                </Typography>
                                            </Box>
                                        ) : typeData.questions.length === 0 ? (
                                            <Alert severity="warning">
                                                Bu kategori için {typeData.label.toLowerCase()} soru bulunamadı.
                                            </Alert>
                                        ) : (
                                            <>
                                                <FormHelperText sx={{ mb: 2 }}>
                                                    En az 16, en fazla 48 soru seçmelisiniz.
                                                </FormHelperText>

                                                {/* Soru Listesi */}
                                                <Box sx={{
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    bgcolor: 'background.paper',
                                                    maxHeight: '400px',
                                                    overflow: 'hidden',
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                }}>
                                                    {/* Tümünü Seç Header */}
                                                    <Box sx={{
                                                        borderBottom: '2px solid #f0f0f0',
                                                        bgcolor: '#f9f9f9',
                                                        p: 1
                                                    }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Checkbox
                                                                checked={typeData.questions.length > 0 && typeData.questions.every(q => typeData.selectedQuestions.includes(q.id))}
                                                                indeterminate={
                                                                    typeData.selectedQuestions.length > 0 &&
                                                                    !typeData.questions.every(q => typeData.selectedQuestions.includes(q.id))
                                                                }
                                                                onChange={() => handleSelectAllForType(questionType)}
                                                                disabled={typeData.questions.length === 0}
                                                            />
                                                            <Typography variant="subtitle2" sx={{ ml: 1 }}>
                                                                Tüm {typeData.label} Sorularını Seç
                                                                {typeData.questions.length > 48 ?
                                                                    ` (maksimum 48 soru seçilecek)` :
                                                                    ` (${typeData.questions.length} soru)`
                                                                }
                                                            </Typography>
                                                        </Box>
                                                    </Box>

                                                    {/* Kaydırılabilir Soru Listesi */}
                                                    <Box sx={{
                                                        flex: 1,
                                                        overflow: 'auto',
                                                        maxHeight: '350px'
                                                    }}>
                                                        <List sx={{ p: 0 }}>
                                                            {typeData.questions.map((question, index) => {
                                                                const isSelected = typeData.selectedQuestions.includes(question.id);

                                                                return (
                                                                    <ListItem
                                                                        key={question.id}
                                                                        dense
                                                                        onClick={() => handleQuestionToggle(questionType, question.id)}
                                                                        sx={{
                                                                            borderBottom: index === typeData.questions.length - 1 ? 'none' : '1px solid #f0f0f0',
                                                                            cursor: 'pointer',
                                                                            bgcolor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                                                                            '&:hover': {
                                                                                bgcolor: isSelected ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                                                                            },
                                                                            py: 1.5
                                                                        }}
                                                                    >
                                                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                                                            <Checkbox
                                                                                edge="start"
                                                                                checked={isSelected}
                                                                                tabIndex={-1}
                                                                                disableRipple
                                                                            />
                                                                        </ListItemIcon>
                                                                        <ListItemText
                                                                            primary={
                                                                                <Typography variant="body2" sx={{ fontWeight: isSelected ? 500 : 400 }}>
                                                                                    {question.question_text}
                                                                                </Typography>
                                                                            }
                                                                            secondary={
                                                                                <Typography variant="caption" color="text.secondary">
                                                                                    {question.category?.name} • Soru #{question.id}
                                                                                </Typography>
                                                                            }
                                                                        />
                                                                    </ListItem>
                                                                );
                                                            })}
                                                        </List>
                                                    </Box>
                                                </Box>

                                                {/* Seçili soruların özeti */}
                                                {typeData.selectedQuestions.length > 0 && (
                                                    <Box sx={{ mt: 2 }}>
                                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                            Seçili {typeData.label} Soruları ({typeData.selectedQuestions.length}):
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: 1,
                                                            maxHeight: '80px',
                                                            overflow: 'auto',
                                                            p: 1,
                                                            border: '1px solid #e0e0e0',
                                                            borderRadius: 1,
                                                            bgcolor: '#f9f9f9'
                                                        }}>
                                                            {typeData.selectedQuestions.map((questionId) => (
                                                                <Chip
                                                                    key={questionId}
                                                                    label={`#${questionId}`}
                                                                    size="small"
                                                                    onDelete={() => handleQuestionToggle(questionType, questionId)}
                                                                    color="primary"
                                                                    variant="outlined"
                                                                />
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                )}
                                            </>
                                        )}
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}

                        {/* Genel durum özeti */}
                        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                                Seçim Durumu Özeti:
                            </Typography>
                            {selectedQuestionTypes.map(questionType => {
                                const typeData = questionTypeData[questionType];
                                const isValid = typeData.selectedQuestions.length >= 16 && typeData.selectedQuestions.length <= 48;

                                return (
                                    <Box key={questionType} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                                        <Typography>
                                            {typeData.label}:
                                        </Typography>
                                        <Chip
                                            label={`${typeData.selectedQuestions.length} soru`}
                                            color={isValid ? "success" : "error"}
                                            size="small"
                                        />
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                );

            case 2:
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Oluşturulacak Etkinlikler Önizleme
                        </Typography>

                        {creationProgress && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    İşlem Durumu: {creationProgress.current}/{creationProgress.total}
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={(creationProgress.current / creationProgress.total) * 100}
                                    sx={{ mb: 1 }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {creationProgress.currentActivity}
                                </Typography>
                            </Box>
                        )}

                        {activityCombinations.length === 0 ? (
                            <Alert severity="warning">
                                Oluşturulacak etkinlik bulunamadı. Lütfen önceki adımlarda seçimlerinizi kontrol edin.
                            </Alert>
                        ) : (
                            <>
                                <Alert severity="info" sx={{ mb: 3 }}>
                                    Toplam {activityCombinations.length} etkinlik oluşturulacak.
                                    Her oyun × soru tipi kombinasyonu için ayrı bir etkinlik oluşturulur.
                                </Alert>

                                {/* Görsel Önizleme */}
                                {imagePreview && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Tüm Etkinlikler İçin Kullanılacak Görsel:
                                        </Typography>
                                        <Box
                                            component="img"
                                            src={imagePreview}
                                            alt="Etkinlik görseli"
                                            sx={{
                                                maxWidth: '100%',
                                                maxHeight: '200px',
                                                mt: 1,
                                                borderRadius: 1,
                                                border: '1px solid #e0e0e0'
                                            }}
                                        />
                                    </Box>
                                )}

                                {/* Genel Bilgiler */}
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Temel Ad:
                                        </Typography>
                                        <Typography>{name}</Typography>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Yayınevi:
                                        </Typography>
                                        <Typography>{publisherName}</Typography>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Kategori:
                                        </Typography>
                                        <Typography>{generateCategoryName()}</Typography>
                                    </Grid>

                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            Toplam Etkinlik:
                                        </Typography>
                                        <Typography>{activityCombinations.length}</Typography>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 3 }} />

                                {/* Etkinlik Listesi */}
                                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                    Oluşturulacak Etkinlikler:
                                </Typography>

                                <List sx={{
                                    width: '100%',
                                    bgcolor: 'background.paper',
                                    borderRadius: 1,
                                    border: '1px solid #e0e0e0',
                                    maxHeight: '400px',
                                    overflow: 'auto'
                                }}>
                                    {activityCombinations.map((combination, index) => (
                                        <ListItem
                                            key={`${combination.gameId}-${combination.questionType}`}
                                            sx={{
                                                borderBottom: index === activityCombinations.length - 1 ? 'none' : '1px solid #f0f0f0',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                py: 2
                                            }}
                                        >
                                            <Box sx={{ width: '100%' }}>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {index + 1}. {combination.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                                                    <Chip
                                                        label={`Oyun: ${combination.gameName}`}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                    <Chip
                                                        label={`Tip: ${combination.questionTypeLabel}`}
                                                        size="small"
                                                        color="secondary"
                                                        variant="outlined"
                                                    />
                                                    <Chip
                                                        label={`${combination.questionIds.length} soru`}
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </Box>
                                        </ListItem>
                                    ))}
                                </List>

                                {/* Özet İstatistikler */}
                                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                        Özet İstatistikler:
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2">
                                                <strong>Seçilen Oyunlar:</strong> {selectedGames.length}
                                            </Typography>
                                            <Typography variant="body2">
                                                <strong>Seçilen Soru Tipleri:</strong> {selectedQuestionTypes.length}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2">
                                                <strong>Toplam Etkinlik:</strong> {activityCombinations.length}
                                            </Typography>
                                            <Typography variant="body2">
                                                <strong>Toplam Soru Kullanımı:</strong> {activityCombinations.reduce((total, combo) => total + combo.questionIds.length, 0)}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </>
                        )}
                    </Box>
                );

            default:
                return 'Bilinmeyen adım';
        }
    };

    // Adım butonlarının durumu
    const getStepActions = () => {
        const isStepValid = [
            isFirstStepValid(),
            isSecondStepValid(),
            true
        ][activeStep];

        return (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                    disabled={activeStep === 0 || loading}
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                >
                    Geri
                </Button>
                <Box>
                    {activeStep === steps.length - 1 ? (
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={loading || activityCombinations.length === 0}
                            sx={{
                                py: 1,
                                px: 3,
                                bgcolor: '#1a1a27',
                                '&:hover': { bgcolor: '#2a2a37' }
                            }}
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                            {loading ? 'Oluşturuluyor...' : `${activityCombinations.length} Etkinliği Oluştur`}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={!isStepValid || loading}
                            sx={{
                                py: 1,
                                px: 3,
                                bgcolor: '#1a1a27',
                                '&:hover': { bgcolor: '#2a2a37' }
                            }}
                        >
                            İleri
                        </Button>
                    )}
                </Box>
            </Box>
        );
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Yeni Etkinlikler Oluştur (Çoklu Seçim)
            </Typography>

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <Box>
                    {getStepContent(activeStep)}
                    {getStepActions()}
                </Box>
            </Paper>
        </Box>
    );
};

export default AddQuestionGroup;