// src/pages/questions/AddQuestion.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Typography, Paper, Stepper, Step, StepLabel, Button,
    Grid, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
    TextField, Divider, Alert, MenuItem, Select, SelectChangeEvent,
    CircularProgress, InputLabel
} from '@mui/material';
import { useEducationStructure } from '../../hooks/useEducationStructure';
import { usePublishers } from '../../hooks/usePublishers';
import * as questionService from '../../services/question.service';
import * as gameService from '../../services/game.service';
import * as categoryService from '../../services/category.service';
import axios, { AxiosError } from 'axios';
import { useCategories } from '../../hooks/useCategories';
import ImageUploader from '../../components/ImageUploader';

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

// Adımlar
const steps = ['Soru Tipi', 'Soru ve Cevap'];

interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

const AddQuestion = () => {
    const navigate = useNavigate();
    const params = useParams();
    const isEdit = !!params.id;
    const questionId = params.id ? parseInt(params.id) : undefined;

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [questionLoaded, setQuestionLoaded] = useState(false); // Sorunun yüklenip yüklenmediğini takip et
    const { grades, subjects, units, topics } = useEducationStructure();
    const { categories, refreshCategories } = useCategories();
    const { publishers } = usePublishers();

    // Form verileri
    const [questionType, setQuestionType] = useState<string>('');
    const [questionText, setQuestionText] = useState('');
    const [difficulty, setDifficulty] = useState('medium');

    // Publisher state'leri - Sadece name string'i kullanacağız
    const [publisherName, setPublisherName] = useState<string>('');

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

    // Resim yükleme için state'ler
    const [imagePath, setImagePath] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);

    // Cevap verileri
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [trueOrFalse, setTrueOrFalse] = useState('true');
    const [choices, setChoices] = useState([
        { id: 'A', text: '', isCorrect: false },
        { id: 'B', text: '', isCorrect: false },
        { id: 'C', text: '', isCorrect: false },
        { id: 'D', text: '', isCorrect: false }
    ]);

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

    // Düzenleme durumunda soruyu yükle - choices dependency'sini kaldır
    useEffect(() => {
        const fetchQuestion = async () => {
            if (isEdit && questionId && categories.length > 0 && !questionLoaded) {
                try {
                    setLoading(true);
                    const question = await questionService.getQuestion(questionId);

                    // Form verilerini doldur
                    setQuestionType(question.question_type);
                    setQuestionText(question.question_text);
                    setDifficulty(question.difficulty);
                    setCategoryId(question.category_id);

                    // Publisher bilgisini doldur
                    if (question.publisher) {
                        setPublisherName(question.publisher);
                    } else if (question.user?.publisher) {
                        // Fallback: User'ın publisher'ı varsa onu kullan
                        setPublisherName(question.user.publisher);
                    }

                    // Kategori bilgilerinden sınıf, ders, ünite, konu bilgilerini doldur
                    const selectedCategory = categories.find(c => c.id === question.category_id);
                    if (selectedCategory) {
                        setGradeId(selectedCategory.grade_id);
                        setSubjectId(selectedCategory.subject_id);
                        setUnitId(selectedCategory.unit_id ?? '');
                        setTopicId(selectedCategory.topic_id ?? '');
                        setCategoryExists(true);
                    }

                    // Resim yolunu ayarla
                    if (question.image_path) {
                        setImagePath(question.image_path);
                    }

                    // Cevapları doldur
                    if (question.question_type === 'multiple_choice') {
                        const updatedChoices = [
                            { id: 'A', text: '', isCorrect: false },
                            { id: 'B', text: '', isCorrect: false },
                            { id: 'C', text: '', isCorrect: false },
                            { id: 'D', text: '', isCorrect: false }
                        ];
                        question.answers.forEach((answer, index) => {
                            if (index < updatedChoices.length) {
                                updatedChoices[index].text = answer.answer_text;
                                updatedChoices[index].isCorrect = answer.is_correct;
                            }
                        });
                        setChoices(updatedChoices);
                    } else if (question.question_type === 'true_false') {
                        const trueAnswer = question.answers.find(a => a.is_correct);
                        setTrueOrFalse(trueAnswer?.answer_text.toLowerCase() === 'doğru' ? 'true' : 'false');
                    } else if (question.question_type === 'qa') {
                        const correctAns = question.answers.find(a => a.is_correct);
                        if (correctAns) {
                            setCorrectAnswer(correctAns.answer_text);
                        }
                    }

                    setQuestionLoaded(true); // Soru yüklendi olarak işaretle
                    setLoading(false);
                    setActiveStep(1); // Düzenleme modunda direkt 2. adıma geç
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        const axiosError = error as AxiosError<ApiErrorResponse>;
                        setError(axiosError.response?.data?.message || 'Soru yüklenirken bir hata oluştu');
                    } else {
                        setError('Soru yüklenirken beklenmeyen bir hata oluştu');
                    }
                    setLoading(false);
                }
            }
        };

        fetchQuestion();
    }, [isEdit, questionId, categories, publishers, questionLoaded]); // choices dependency'sini kaldır, questionLoaded ekle

    // Adım kontrolü
    const handleNext = () => {
        setActiveStep((prevStep) => prevStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    // Soru tipini değiştir
    const handleQuestionTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuestionType(event.target.value);
    };

    // Zorluk seviyesini değiştir
    const handleDifficultyChange = (event: SelectChangeEvent) => {
        setDifficulty(event.target.value);
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

    // Doğru/Yanlış değiştir
    const handleTrueFalseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTrueOrFalse(event.target.value);
    };

    // Çoktan seçmeli şık değiştir
    const handleChoiceTextChange = (id: string, text: string) => {
        setChoices(choices.map(choice =>
            choice.id === id ? { ...choice, text } : choice
        ));
    };

    // Doğru şık seç
    const handleCorrectChoiceChange = (id: string) => {
        setChoices(choices.map(choice =>
            ({ ...choice, isCorrect: choice.id === id })
        ));
    };

    // Resim yolunu değiştir
    const handleImagePathChange = (path: string | null) => {
        setImagePath(path);
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
            setCategoryId(newCategory.id);
            setCategoryExists(true);
            setError(null);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            setError('Kategori oluşturulurken bir hata oluştu.');
        } finally {
            setCreatingCategory(false);
        }
    };

    // Soru tipine göre cevapları düzenle
    const getAnswersBasedOnType = () => {
        switch (questionType) {
            case 'multiple_choice':
                return choices.map(choice => ({
                    answer_text: choice.text,
                    is_correct: choice.isCorrect
                }));
            case 'true_false':
                return [
                    { answer_text: 'Doğru', is_correct: trueOrFalse === 'true' },
                    { answer_text: 'Yanlış', is_correct: trueOrFalse === 'false' }
                ];
            case 'qa':
                return [{ answer_text: correctAnswer, is_correct: true }];
            default:
                return [];
        }
    };

    // Form submit - Publisher string olarak direkt kullan
    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);

            // Kategori ID kontrol et
            if (!categoryId) {
                setError('Lütfen geçerli bir kategori seçin');
                setLoading(false);
                return;
            }

            // Publisher string olarak direkt kullan
            const finalPublisherName = publisherName.trim();

            // Soru tipine göre cevapları hazırla
            const answers = getAnswersBasedOnType();

            // QuestionCreate için veri oluştur - Publisher string olarak dahil
            const questionData: questionService.QuestionCreate = {
                category_id: categoryId as number,
                question_text: questionText,
                question_type: questionType as 'multiple_choice' | 'true_false' | 'qa',
                difficulty: difficulty as 'easy' | 'medium' | 'hard',
                answers,
                image_path: imagePath,
                publisher: finalPublisherName // String olarak publisher name
            };

            let savedQuestion;

            // Yeni soru mu, düzenleme mi?
            if (isEdit && questionId) {
                savedQuestion = await questionService.updateQuestion(questionId, questionData);
            } else {
                savedQuestion = await questionService.createQuestion(questionData);
            }

            // Soru başarıyla oluşturuldu/güncellendi, şimdi tüm oyunlara ekleyelim
            if (savedQuestion && !isEdit) { // Sadece yeni soru ekleme durumunda oyunlara ekle
                try {
                    // Tüm oyunları getir
                    const gamesResponse = await gameService.getGames(1);
                    const games = gamesResponse.data;

                    // Her oyuna soruyu ekle
                    for (const game of games) {
                        try {
                            await gameService.addQuestionToGame(game.id, {
                                question_id: savedQuestion.id,
                                points: 100 // Varsayılan puan
                            });
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        } catch (_error) {
                            // Oyuna ekleme hatası genel akışı etkilemesin
                        }
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (_error) {
                    // Oyunlara ekleme hatası genel akışı etkilemesin
                }
            }

            // Kullanıcıya herhangi bir bildirim göstermeden doğrudan soru listesine yönlendir
            navigate('/questions');

        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<ApiErrorResponse>;
                setError(axiosError.response?.data?.message || (isEdit ? 'Soru güncellenirken bir hata oluştu' : 'Soru eklenirken bir hata oluştu'));
            } else {
                setError(isEdit ? 'Soru güncellenirken beklenmeyen bir hata oluştu' : 'Soru eklenirken beklenmeyen bir hata oluştu');
            }
        } finally {
            setLoading(false);
        }
    };

    // İlk adım geçerli mi
    const isFirstStepValid = () => {
        return questionType !== '';
    };

    // İkinci adım geçerli mi
    const isSecondStepValid = () => {
        if (!questionText || (!isEdit && !categoryExists) || !publisherName.trim()) return false;

        switch (questionType) {
            case 'multiple_choice':
                return choices.every(choice => choice.text.trim() !== '') &&
                    choices.some(choice => choice.isCorrect);
            case 'true_false':
                return true;
            case 'qa':
                return correctAnswer.trim() !== '';
            default:
                return false;
        }
    };

    // Adım içeriği
    const getStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Box sx={{
                        width: '100%',
                        px: 3,
                        boxSizing: 'border-box'
                    }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Eklemek istediğiniz soru tipini seçin
                        </Typography>

                        <FormControl component="fieldset">
                            <RadioGroup value={questionType} onChange={handleQuestionTypeChange}>
                                {questionTypes.map((type) => (
                                    <FormControlLabel
                                        key={type.value}
                                        value={type.value}
                                        control={<Radio />}
                                        label={type.label}
                                        sx={{ mb: 1 }}
                                    />
                                ))}
                            </RadioGroup>
                        </FormControl>
                    </Box>
                );

            case 1:
                return (
                    <Box sx={{
                        width: '100%',
                        px: 2,
                        boxSizing: 'border-box'
                    }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Soru Detaylarını Girin
                        </Typography>

                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Soru Metni"
                                    fullWidth
                                    multiline
                                    rows={4}
                                    value={questionText}
                                    onChange={(e) => setQuestionText(e.target.value)}
                                    required
                                />
                            </Grid>

                            {/* ImageUploader bileşeni */}
                            <Grid item xs={12}>
                                <ImageUploader
                                    imagePath={imagePath}
                                    onImagePathChange={handleImagePathChange}
                                    onError={setImageError}
                                />

                                {imageError && (
                                    <Alert severity="error" sx={{ mt: 1 }}>
                                        {imageError}
                                    </Alert>
                                )}
                            </Grid>

                            {/* Kategori Seçimi */}
                            <Grid item xs={12}>
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
                                            disabled={isEdit}
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
                                            disabled={isEdit}
                                        >
                                            <MenuItem value="" disabled>Ders Seçin</MenuItem>
                                            {subjects.map((subject) => (
                                                <MenuItem key={subject.id} value={subject.id}>
                                                    {subject.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth sx={{ mb: 2, maxWidth: 200 }}>
                                        <InputLabel>Ünite</InputLabel>
                                        <Select
                                            value={unitId}
                                            label="Ünite"
                                            onChange={handleUnitChange}
                                            disabled={isEdit || !gradeId || !subjectId || filteredUnits.length === 0}
                                        >
                                            <MenuItem value="">Ünite Seçin</MenuItem>
                                            {filteredUnits.map((unit) => (
                                                <MenuItem key={unit.id} value={unit.id}>
                                                    {unit.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth sx={{ mb: 2, maxWidth: 200 }}>
                                        <InputLabel>Konu</InputLabel>
                                        <Select
                                            value={topicId}
                                            label="Konu"
                                            onChange={handleTopicChange}
                                            disabled={isEdit || !unitId || filteredTopics.length === 0}
                                        >
                                            <MenuItem value="">Konu Seçin</MenuItem>
                                            {filteredTopics.map((topic) => (
                                                <MenuItem key={topic.id} value={topic.id}>
                                                    {topic.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    {gradeId && subjectId && unitId && topicId && !categoryExists && !isEdit && (
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

                                {gradeId && subjectId && unitId && topicId && !isEdit && (
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

                                {/* Edit modunda kategori bilgilerini göster */}
                                {isEdit && gradeId && subjectId && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        Kategori: {generateCategoryName()}
                                    </Alert>
                                )}
                            </Grid>

                            {/* Yayınevi Alanı - Dropdown */}
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel>Yayınevi</InputLabel>
                                    <Select
                                        value={publisherName}
                                        label="Yayınevi"
                                        onChange={(e) => setPublisherName(e.target.value)}
                                        error={!publisherName.trim() && activeStep === 1}
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
                                    {!publisherName.trim() && activeStep === 1 && (
                                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                                            Yayınevi seçimi zorunludur
                                        </Typography>
                                    )}
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Zorluk Seviyesi</InputLabel>
                                    <Select
                                        value={difficulty}
                                        label="Zorluk Seviyesi"
                                        onChange={handleDifficultyChange}
                                    >
                                        {difficultyLevels.map((level) => (
                                            <MenuItem key={level.value} value={level.value}>
                                                {level.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Cevap Bilgisi
                                </Typography>

                                {questionType === 'multiple_choice' && (
                                    <Grid container spacing={2}>
                                        {choices.map((choice) => (
                                            <Grid item xs={12} key={choice.id}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Radio
                                                        checked={choice.isCorrect}
                                                        onChange={() => handleCorrectChoiceChange(choice.id)}
                                                    />
                                                    <TextField
                                                        label={`${choice.id} Şıkkı`}
                                                        fullWidth
                                                        value={choice.text}
                                                        onChange={(e) => handleChoiceTextChange(choice.id, e.target.value)}
                                                        required
                                                    />
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}

                                {questionType === 'true_false' && (
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">Doğru Cevap</FormLabel>
                                        <RadioGroup value={trueOrFalse} onChange={handleTrueFalseChange}>
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
                                        value={correctAnswer}
                                        onChange={(e) => setCorrectAnswer(e.target.value)}
                                        required
                                    />
                                )}
                            </Grid>
                        </Grid>
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
            isSecondStepValid()
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
                            disabled={loading}
                            sx={{
                                py: 1,
                                px: 3,
                                bgcolor: '#1a1a27',
                                '&:hover': { bgcolor: '#2a2a37' }
                            }}
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                            {loading ? 'İşleniyor...' : (isEdit ? 'Güncelle' : 'Tamamla')}
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
        <Box sx={{
            width: '100%',
            px: 3,
            boxSizing: 'border-box'
        }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                {isEdit ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}
            </Typography>

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                {loading && activeStep === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
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
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default AddQuestion;