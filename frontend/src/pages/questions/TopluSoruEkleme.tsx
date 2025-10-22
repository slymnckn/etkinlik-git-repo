// src/pages/questions/TopluSoruEkleme.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Button, TextField, FormControl,
    RadioGroup, FormControlLabel, Radio, InputLabel, Select, MenuItem,
    Divider, IconButton, Alert, CircularProgress,
    Tooltip, Fab, Dialog, DialogActions, DialogContent,
    DialogTitle, DialogContentText, Accordion, AccordionSummary,
    AccordionDetails, SelectChangeEvent
} from '@mui/material';
import {
    Add as AddIcon,
    Save as SaveIcon,
    RemoveCircleOutline as RemoveIcon,
    ExpandMore as ExpandMoreIcon,
    FileCopy as FileCopyIcon
} from '@mui/icons-material';
import { useEducationStructure } from '../../hooks/useEducationStructure';
import { useCategories } from '../../hooks/useCategories';
import { usePublishers } from '../../hooks/usePublishers';
import * as questionService from '../../services/question.service';
import * as gameService from '../../services/game.service';
import * as categoryService from '../../services/category.service';
import ImageUploader from '../../components/ImageUploader';
import axios, { AxiosError } from 'axios';

// Soru tipi seçenekleri
const questionTypes = [
    { value: 'multiple_choice', label: 'Çoktan Seçmeli' },
    { value: 'true_false', label: 'Doğru-Yanlış' },
    { value: 'qa', label: 'Klasik' }
];

// Zorluk seviyesi seçenekleri
const difficultyLevels = [
    { value: 'easy', label: 'Kolay' },
    { value: 'medium', label: 'Orta' },
    { value: 'hard', label: 'Zor' }
];

interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

// Boş seçenek şablonu
const emptyChoiceTemplate = [
    { id: 'A', text: '', isCorrect: false },
    { id: 'B', text: '', isCorrect: false },
    { id: 'C', text: '', isCorrect: false },
    { id: 'D', text: '', isCorrect: false }
];

// Boş soru şablonu
interface QuestionTemplate {
    id: number;
    questionText: string;
    imagePath: string | null;
    imageError: string | null;
    difficulty: string;
    publisherName: string;
    correctAnswer: string;
    trueOrFalse: string;
    choices: {
        id: string;
        text: string;
        isCorrect: boolean;
    }[];
    expanded: boolean;
    valid: boolean;
    error: string | null;
}

const TopluSoruEkleme = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Genel ayarlar
    const [questionType, setQuestionType] = useState<string>('');
    const [globalPublisherName, setGlobalPublisherName] = useState<string>('');

    // Manuel seçim alanları
    const [gradeId, setGradeId] = useState<number | ''>('');
    const [subjectId, setSubjectId] = useState<number | ''>('');
    const [unitId, setUnitId] = useState<number | ''>('');
    const [topicId, setTopicId] = useState<number | ''>('');

    // Kategori durumu
    const [categoryId, setCategoryId] = useState<number | ''>('');
    const [categoryExists, setCategoryExists] = useState<boolean>(false);
    const [creatingCategory, setCreatingCategory] = useState<boolean>(false);

    // Filtrelenmiş listeler
    const [filteredUnits, setFilteredUnits] = useState<any[]>([]);
    const [filteredTopics, setFilteredTopics] = useState<any[]>([]);

    // Soru listesi ve sayacı
    const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
    const [questionCounter, setQuestionCounter] = useState(1);

    // Dialog kontrolleri
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [navigateAfterSave, setNavigateAfterSave] = useState(false);

    // Eğitim yapısı ve kategorileri yükle
    const { grades, subjects, units, topics } = useEducationStructure();
    const { categories, refreshCategories } = useCategories();
    const { publishers } = usePublishers();

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
                setCategoryId(matchingCategory.id);
            } else {
                setCategoryExists(false);
                setCategoryId('');
            }
        } else {
            setCategoryExists(false);
            setCategoryId('');
        }
    }, [gradeId, subjectId, unitId, topicId, categories]);

    // Soru tipi değiştiğinde tüm soruları temizle
    useEffect(() => {
        if (questions.length > 0) {
            setConfirmDialogOpen(true);
        }
    }, [questionType]);

    // Global publisher değiştiğinde tüm soruların publisher'ını güncelle
    useEffect(() => {
        if (globalPublisherName && questions.length > 0) {
            const updatedQuestions = questions.map(q => ({
                ...q,
                publisherName: globalPublisherName
            }));
            setQuestions(updatedQuestions);
        }
    }, [globalPublisherName, questions.length]);

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
            setCategoryId(newCategory.id);
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

    // Yeni soru ekle
    const handleAddQuestion = () => {
        const newQuestion: QuestionTemplate = {
            id: questionCounter,
            questionText: '',
            imagePath: null,
            imageError: null,
            difficulty: 'medium',
            publisherName: globalPublisherName,
            correctAnswer: '',
            trueOrFalse: 'true',
            choices: JSON.parse(JSON.stringify(emptyChoiceTemplate)),
            expanded: true,
            valid: false,
            error: null
        };

        setQuestions([...questions, newQuestion]);
        setQuestionCounter(questionCounter + 1);
    };

    // Soru kopyala
    const handleDuplicateQuestion = (questionIndex: number) => {
        const questionToDuplicate = questions[questionIndex];
        const newQuestion: QuestionTemplate = {
            ...JSON.parse(JSON.stringify(questionToDuplicate)),
            id: questionCounter,
            expanded: true
        };

        const updatedQuestions = [...questions];
        updatedQuestions.splice(questionIndex + 1, 0, newQuestion);
        setQuestions(updatedQuestions);
        setQuestionCounter(questionCounter + 1);
    };

    // Soruyu kaldır
    const handleRemoveQuestion = (questionIndex: number) => {
        const updatedQuestions = questions.filter((_, index) => index !== questionIndex);
        setQuestions(updatedQuestions);
    };

    // Soru metnini güncelle
    const handleQuestionTextChange = (text: string, questionIndex: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].questionText = text;
        setQuestions(updatedQuestions);
    };

    // Zorluk seviyesini güncelle
    const handleDifficultyChange = (value: string, questionIndex: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].difficulty = value;
        setQuestions(updatedQuestions);
    };

    // Publisher'ı güncelle
    const handlePublisherChange = (value: string, questionIndex: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].publisherName = value;
        setQuestions(updatedQuestions);
    };

    // Doğru/Yanlış değerini güncelle
    const handleTrueFalseChange = (value: string, questionIndex: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].trueOrFalse = value;
        setQuestions(updatedQuestions);
    };

    // Klasik soru cevabını güncelle
    const handleCorrectAnswerChange = (text: string, questionIndex: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].correctAnswer = text;
        setQuestions(updatedQuestions);
    };

    // Çoktan seçmeli şık metnini güncelle
    const handleChoiceTextChange = (text: string, choiceId: string, questionIndex: number) => {
        const updatedQuestions = [...questions];
        const choiceIndex = updatedQuestions[questionIndex].choices.findIndex(c => c.id === choiceId);
        updatedQuestions[questionIndex].choices[choiceIndex].text = text;
        setQuestions(updatedQuestions);
    };

    // Doğru şıkkı güncelle
    const handleCorrectChoiceChange = (choiceId: string, questionIndex: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].choices.forEach(choice => {
            choice.isCorrect = choice.id === choiceId;
        });
        setQuestions(updatedQuestions);
    };

    // Resim seçimi
    const handleImagePathChange = (path: string | null, questionIndex: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].imagePath = path;
        updatedQuestions[questionIndex].imageError = null;
        setQuestions(updatedQuestions);
    };

    const handleImageError = (error: string | null, questionIndex: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].imageError = error;
        setQuestions(updatedQuestions);
    };

    // Soru açılır/kapanır durumunu değiştir
    const handleExpandQuestion = (questionIndex: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[questionIndex].expanded = !updatedQuestions[questionIndex].expanded;
        setQuestions(updatedQuestions);
    };

    // Tüm soruları doğrula
    const validateQuestions = (): boolean => {
        if (!questionType || !categoryId || !globalPublisherName.trim()) {
            setError('Lütfen soru tipi seçin, gerekli kategoriyi oluşturun ve yayınevi belirtin');
            return false;
        }

        if (questions.length === 0) {
            setError('En az bir soru eklemelisiniz');
            return false;
        }

        const updatedQuestions = [...questions];
        let allValid = true;

        updatedQuestions.forEach((question) => {
            let valid = true;

            // Soru metni kontrolü
            if (!question.questionText.trim()) {
                valid = false;
                question.error = 'Soru metni boş olamaz';
            } else if (!question.publisherName.trim()) {
                valid = false;
                question.error = 'Yayınevi seçimi zorunludur';
            } else {
                question.error = null;

                // Cevap kontrolü
                if (questionType === 'multiple_choice') {
                    const allChoicesFilled = question.choices.every(choice => choice.text.trim() !== '');
                    const hasCorrectChoice = question.choices.some(choice => choice.isCorrect);

                    if (!allChoicesFilled) {
                        valid = false;
                        question.error = 'Tüm şıkları doldurun';
                    } else if (!hasCorrectChoice) {
                        valid = false;
                        question.error = 'Bir doğru şık seçin';
                    }
                } else if (questionType === 'qa') {
                    if (!question.correctAnswer.trim()) {
                        valid = false;
                        question.error = 'Doğru cevabı girin';
                    }
                }
            }

            question.valid = valid;
            if (!valid) allValid = false;
        });

        setQuestions(updatedQuestions);
        return allValid;
    };

    // Soruları kaydet ve tüm oyunlara ekle
    const handleSaveQuestions = async () => {
        if (!validateQuestions()) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const savedQuestions = [];

            // Her soru için kayıt işlemini yap
            for (const question of questions) {
                // Soru tipine göre cevapları hazırla
                const answers = getAnswersBasedOnType(question);

                // QuestionCreate için veri oluştur
                const questionData: questionService.QuestionCreate = {
                    category_id: categoryId as number,
                    question_text: question.questionText,
                    question_type: questionType as 'multiple_choice' | 'true_false' | 'qa',
                    difficulty: question.difficulty as 'easy' | 'medium' | 'hard',
                    publisher: question.publisherName.trim(),
                    answers
                };

                // Resim varsa yükle
                if (question.imagePath) {
                    questionData.image_path = question.imagePath;
                }

                // Soruyu kaydet
                const savedQuestion = await questionService.createQuestion(questionData);
                savedQuestions.push(savedQuestion);
            }

            // Tüm soruları oyunlara ekle
            try {
                // Tüm oyunları getir
                const gamesResponse = await gameService.getGames(1);
                const games = gamesResponse.data;

                // Her oyun için
                for (const game of games) {
                    // Her soruyu oyuna ekle
                    for (const question of savedQuestions) {
                        try {
                            await gameService.addQuestionToGame(game.id, {
                                question_id: question.id,
                                points: 100 // Varsayılan puan
                            });
                        } catch (error) {
                            console.error(`Soru (ID: ${question.id}) oyuna (ID: ${game.id}) eklenirken hata:`, error);
                            // Oyuna ekleme hatası genel akışı etkilemesin
                        }
                    }
                }

                console.log(`${savedQuestions.length} soru ${games.length} oyuna başarıyla eklendi`);
            } catch (error) {
                console.error('Oyunlar alınırken veya sorular oyunlara eklenirken hata:', error);
                // Oyunlara ekleme hatası genel akışı etkilemesin
            }

            setSuccess(true);
            setError(null);
            setTimeout(() => {
                if (navigateAfterSave) {
                    navigate('/questions');
                } else {
                    // Sayfayı temizle ve yeni sorular için hazırla
                    setQuestions([]);
                    setSuccess(false);
                }
            }, 1000);

        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<ApiErrorResponse>;
                setError(axiosError.response?.data?.message || 'Sorular eklenirken bir hata oluştu');
                console.error('Sorular kaydedilirken hata:', axiosError.response?.data);
            } else {
                setError('Sorular eklenirken beklenmeyen bir hata oluştu');
                console.error('Beklenmeyen hata:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    // Soru tipine göre cevapları düzenle
    const getAnswersBasedOnType = (question: QuestionTemplate) => {
        switch (questionType) {
            case 'multiple_choice':
                return question.choices.map(choice => ({
                    answer_text: choice.text,
                    is_correct: choice.isCorrect
                }));
            case 'true_false':
                return [
                    { answer_text: 'Doğru', is_correct: question.trueOrFalse === 'true' },
                    { answer_text: 'Yanlış', is_correct: question.trueOrFalse === 'false' }
                ];
            case 'qa':
                return [{ answer_text: question.correctAnswer, is_correct: true }];
            default:
                return [];
        }
    };

    // Uyarı dialogunu kapat ve soru tipini güncelle
    const handleConfirmChange = (confirm: boolean) => {
        setConfirmDialogOpen(false);

        if (confirm) {
            // Soruları temizle
            setQuestions([]);
        }
    };

    const canProceed = questionType !== '' && categoryExists && globalPublisherName.trim() !== '';

    return (
        <Box sx={{
            width: '100%',
            px: 3,
            boxSizing: 'border-box'
        }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Toplu Soru Ekleme
            </Typography>

            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                    Genel Ayarlar
                </Typography>

                <Box sx={{ mb: 3 }}>
                    <FormControl component="fieldset" sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Soru Tipi
                        </Typography>
                        <RadioGroup
                            row
                            value={questionType}
                            onChange={(e) => setQuestionType(e.target.value)}
                        >
                            {questionTypes.map((type) => (
                                <FormControlLabel
                                    key={type.value}
                                    value={type.value}
                                    control={<Radio />}
                                    label={type.label}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>

                    <Typography variant="subtitle1" gutterBottom>
                        Kategori Seçimi
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'end' }}>
                        <FormControl fullWidth required sx={{ mb: 2, maxWidth: 200 }}>
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

                        <FormControl fullWidth required sx={{ mb: 2, maxWidth: 200 }}>
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

                        <FormControl fullWidth required sx={{ mb: 2, maxWidth: 200 }}>
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

                        <FormControl fullWidth required sx={{ mb: 2, maxWidth: 200 }}>
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

                        {gradeId && subjectId && unitId && topicId && !categoryExists && (
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={handleCreateCategory}
                                disabled={creatingCategory}
                                sx={{ mb: 2, height: 'fit-content' }}
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
                        )}
                    </Box>

                    {gradeId && subjectId && unitId && topicId && (
                        <Alert
                            severity={categoryExists ? "success" : "info"}
                            sx={{ mt: 2, mb: 3 }}
                        >
                            {categoryExists
                                ? `Kategori mevcut: ${generateCategoryName()}`
                                : `Bu kombinasyon için kategori bulunamadı: ${generateCategoryName()}`
                            }
                        </Alert>
                    )}

                    {/* Global Yayınevi Seçimi */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Yayınevi (Tüm Sorular İçin)
                        </Typography>
                        <FormControl fullWidth required sx={{ maxWidth: 300 }}>
                            <InputLabel>Yayınevi</InputLabel>
                            <Select
                                value={globalPublisherName}
                                label="Yayınevi"
                                onChange={(e) => setGlobalPublisherName(e.target.value)}
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
                                        {publisher.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {!globalPublisherName.trim() && (
                                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                                    Yayınevi seçimi zorunludur
                                </Typography>
                            )}
                        </FormControl>
                    </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {!canProceed ? (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Lütfen önce soru tipi seçin, gerekli kategoriyi oluşturun ve yayınevi belirtin.
                    </Alert>
                ) : (
                    <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6">
                                Sorular ({questions.length})
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={handleAddQuestion}
                                disabled={!canProceed}
                            >
                                Yeni Soru Ekle
                            </Button>
                        </Box>

                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        )}

                        {success && (
                            <Alert severity="success" sx={{ mb: 3 }}>
                                Sorular başarıyla kaydedildi!
                            </Alert>
                        )}

                        {questions.length === 0 ? (
                            <Alert severity="info" sx={{ mb: 3 }}>
                                Henüz soru eklenmedi. "Yeni Soru Ekle" butonuna tıklayarak başlayabilirsiniz.
                            </Alert>
                        ) : (
                            <Box sx={{ mb: 4 }}>
                                {questions.map((question, index) => (
                                    <Accordion
                                        key={question.id}
                                        expanded={question.expanded}
                                        onChange={() => handleExpandQuestion(index)}
                                        sx={{
                                            mb: 2,
                                            border: question.error ? '1px solid #f44336' : 'none',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                                        }}
                                    >
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                                <Typography sx={{ flexGrow: 1 }}>
                                                    {`Soru ${index + 1}: ${question.questionText.substring(0, 50)}${question.questionText.length > 50 ? '...' : ''}`}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                                                    <Tooltip title="Soruyu Kopyala">
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDuplicateQuestion(index);
                                                            }}
                                                        >
                                                            <FileCopyIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Soruyu Sil">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveQuestion(index);
                                                            }}
                                                        >
                                                            <RemoveIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            {question.error && (
                                                <Alert severity="error" sx={{ mb: 2 }}>
                                                    {question.error}
                                                </Alert>
                                            )}

                                            <Box sx={{ mb: 3 }}>
                                                <TextField
                                                    label="Soru Metni"
                                                    fullWidth
                                                    multiline
                                                    rows={4}
                                                    value={question.questionText}
                                                    onChange={(e) => handleQuestionTextChange(e.target.value, index)}
                                                    required
                                                    error={!!question.error && !question.questionText.trim()}
                                                />
                                            </Box>

                                            <Box sx={{ mb: 3 }}>
                                                <ImageUploader
                                                    imagePath={question.imagePath}
                                                    onImagePathChange={(path) => handleImagePathChange(path, index)}
                                                    onError={(error) => handleImageError(error, index)}
                                                />

                                                {question.imageError && (
                                                    <Alert severity="error" sx={{ mt: 1 }}>
                                                        {question.imageError}
                                                    </Alert>
                                                )}
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                                <FormControl sx={{ minWidth: 150 }}>
                                                    <InputLabel>Zorluk Seviyesi</InputLabel>
                                                    <Select
                                                        value={question.difficulty}
                                                        label="Zorluk Seviyesi"
                                                        onChange={(e) => handleDifficultyChange(e.target.value, index)}
                                                    >
                                                        {difficultyLevels.map((level) => (
                                                            <MenuItem key={level.value} value={level.value}>
                                                                {level.label}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>

                                                <FormControl sx={{ minWidth: 200 }}>
                                                    <InputLabel>Yayınevi</InputLabel>
                                                    <Select
                                                        value={question.publisherName}
                                                        label="Yayınevi"
                                                        onChange={(e) => handlePublisherChange(e.target.value, index)}
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
                                                                {publisher.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Box>

                                            <Divider sx={{ my: 2 }} />

                                            <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                                Cevap Bilgisi
                                            </Typography>

                                            {questionType === 'multiple_choice' && (
                                                <Box sx={{ mb: 2 }}>
                                                    {question.choices.map((choice) => (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }} key={choice.id}>
                                                            <Radio
                                                                checked={choice.isCorrect}
                                                                onChange={() => handleCorrectChoiceChange(choice.id, index)}
                                                            />
                                                            <TextField
                                                                label={`${choice.id} Şıkkı`}
                                                                fullWidth
                                                                value={choice.text}
                                                                onChange={(e) => handleChoiceTextChange(e.target.value, choice.id, index)}
                                                                error={!!question.error && !choice.text.trim()}
                                                                required
                                                            />
                                                        </Box>
                                                    ))}
                                                </Box>
                                            )}

                                            {questionType === 'true_false' && (
                                                <FormControl component="fieldset">
                                                    <RadioGroup
                                                        value={question.trueOrFalse}
                                                        onChange={(e) => handleTrueFalseChange(e.target.value, index)}
                                                    >
                                                        <FormControlLabel value="true" control={<Radio />} label="Doğru" />
                                                        <FormControlLabel value="false" control={<Radio />} label="Yanlış" />
                                                    </RadioGroup>
                                                </FormControl>
                                            )}

                                            {questionType === 'qa' && (
                                                <TextField
                                                    label="Doğru Cevap"
                                                    fullWidth
                                                    multiline
                                                    rows={3}
                                                    value={question.correctAnswer}
                                                    onChange={(e) => handleCorrectAnswerChange(e.target.value, index)}
                                                    error={!!question.error && !question.correctAnswer.trim()}
                                                    required
                                                />
                                            )}
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </Box>
                        )}

                        {questions.length > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => navigate('/questions')}
                                    disabled={loading}
                                >
                                    İptal
                                </Button>

                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<SaveIcon />}
                                        onClick={() => {
                                            setNavigateAfterSave(false);
                                            handleSaveQuestions();
                                        }}
                                        disabled={loading || success}
                                    >
                                        {loading ? (
                                            <>
                                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                                Kaydediliyor...
                                            </>
                                        ) : 'Kaydet ve Devam Et'}
                                    </Button>

                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<SaveIcon />}
                                        onClick={() => {
                                            setNavigateAfterSave(true);
                                            handleSaveQuestions();
                                        }}
                                        disabled={loading || success}
                                    >
                                        {loading ? (
                                            <>
                                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                                Kaydediliyor...
                                            </>
                                        ) : 'Kaydet ve Tamamla'}
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </>
                )}
            </Paper>

            {/* Onay Dialogu */}
            <Dialog open={confirmDialogOpen} onClose={() => handleConfirmChange(false)}>
                <DialogTitle>Değişiklikleri Onayla</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Soru tipi değişikliği, mevcut tüm soruları silecektir. Devam etmek istiyor musunuz?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleConfirmChange(false)}>İptal</Button>
                    <Button onClick={() => handleConfirmChange(true)} color="error">
                        Evet, Temizle
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Yeni Soru Ekle FAB */}
            {canProceed && (
                <Fab
                    color="primary"
                    aria-label="add"
                    onClick={handleAddQuestion}
                    sx={{ position: 'fixed', bottom: 32, right: 32 }}
                >
                    <AddIcon />
                </Fab>
            )}
        </Box>
    );
};

export default TopluSoruEkleme;