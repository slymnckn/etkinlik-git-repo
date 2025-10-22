// src/pages/questions/ExcelSoruImport.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Button, FormControl, InputLabel,
    Select, MenuItem, Alert, CircularProgress, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Tooltip, LinearProgress, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle, IconButton, RadioGroup,
    FormControlLabel, Radio, SelectChangeEvent, Card, CardHeader, CardContent,
    Accordion, AccordionSummary, AccordionDetails, Collapse
} from '@mui/material';
import {
    FileUpload as FileUploadIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Download as DownloadIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Close as CloseIcon,
    Help as HelpIcon,
    Add as AddIcon,
    ExpandMore as ExpandMoreIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Image as ImageIcon
} from '@mui/icons-material';
import { useEducationStructure } from '../../hooks/useEducationStructure';
import { useCategories } from '../../hooks/useCategories';
import { usePublishers } from '../../hooks/usePublishers';
import * as questionService from '../../services/question.service';
import * as gameService from '../../services/game.service';
import * as categoryService from '../../services/category.service';
import * as XLSX from 'xlsx';
import ImageSearchPanel from '../../components/ImageSearchPanel';

interface ExcelQuestion {
    id: number;
    fileId: string;
    fileName: string;
    question_text: string;
    is_correct?: boolean;
    answer_text?: string;
    // Çoktan seçmeli için seçenekler
    option_a?: string;
    option_b?: string;
    option_c?: string;
    option_d?: string;
    correct_option?: string;
    valid: boolean;
    error?: string;
    // Görsel alanları
    image_path?: string;
    hasImage?: boolean;
    image_keyword?: string;  // YENİ: Excel'den gelen görsel arama kelimesi
}

interface ImportStats {
    total: number;
    valid: number;
    invalid: number;
    saved: number;
    failed: number;
}

interface FileUpload {
    id: string;
    file: File;
    questionType: 'true_false' | 'text' | 'multiple_choice';
    questions: ExcelQuestion[];
    stats: ImportStats;
    processed: boolean;
    error?: string;
}

const ExcelSoruImport = () => {
    const navigate = useNavigate();

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

    // Yayınevi seçimi
    const [publisherName, setPublisherName] = useState<string>('');

    // Çoklu dosya yönetimi
    const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
    const [allQuestions, setAllQuestions] = useState<ExcelQuestion[]>([]);
    const [combinedStats, setCombinedStats] = useState<ImportStats>({
        total: 0,
        valid: 0,
        invalid: 0,
        saved: 0,
        failed: 0
    });

    // Yeni dosya yükleme için geçici state
    const [currentQuestionType, setCurrentQuestionType] = useState<'true_false' | 'text' | 'multiple_choice'>('true_false');
    const [isAddingNewFile, setIsAddingNewFile] = useState<boolean>(false);

    // UI durumları
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Yardım diyaloğu
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);

    // Önizleme tablosu görünürlüğü
    const [showPreviewTable, setShowPreviewTable] = useState(false);

    // Görsel düzenleme modal state
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [questionsWithImages, setQuestionsWithImages] = useState<ExcelQuestion[]>([]);
    const [currentSearchingQuestionId, setCurrentSearchingQuestionId] = useState<number | null>(null);
    const [imageFilter, setImageFilter] = useState<'all' | 'with-image' | 'without-image'>('all');

    // Eğitim yapısı verilerini yükle
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

    // Tüm dosyaların sorularını birleştir ve istatistikleri hesapla
    useEffect(() => {
        const allQuestionsFromFiles = uploadedFiles.flatMap(file => file.questions);
        setAllQuestions(allQuestionsFromFiles);

        const stats = uploadedFiles.reduce((acc, file) => ({
            total: acc.total + file.stats.total,
            valid: acc.valid + file.stats.valid,
            invalid: acc.invalid + file.stats.invalid,
            saved: acc.saved + file.stats.saved,
            failed: acc.failed + file.stats.failed
        }), {
            total: 0,
            valid: 0,
            invalid: 0,
            saved: 0,
            failed: 0
        });

        setCombinedStats(stats);
    }, [uploadedFiles]);

    // Excel dosyası işleme fonksiyonu
    const processExcelFile = (file: File, questionType: 'true_false' | 'text' | 'multiple_choice'): Promise<FileUpload> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    if (!data) {
                        throw new Error('Dosya okunamadı');
                    }

                    // Excel dosyasını oku
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];

                    // Excel verilerini JSON'a dönüştür
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                    if (jsonData.length <= 1) {
                        throw new Error('Excel dosyası boş veya sadece başlık satırı içeriyor.');
                    }

                    // İlk satır başlık satırı olduğunu varsayıyoruz
                    const headers = jsonData[0];

                    // Gerekli sütunları kontrol et
                    const questionColIndex = headers.findIndex((h: string) =>
                        h?.toString().toLowerCase().includes('soru') ||
                        h?.toString().toLowerCase().includes('question'));

                    // image_keyword kolonunu tespit et (opsiyonel)
                    const imageKeywordIndex = headers.findIndex((h: string) =>
                        h?.toString().toLowerCase().includes('image_keyword') ||
                        h?.toString().toLowerCase().includes('görsel kelime') ||
                        h?.toString().toLowerCase().includes('gorsel kelime') ||
                        h?.toString().toLowerCase().includes('anahtar kelime'));

                    let requiredColumns: string[] = [];
                    let columnIndices: { [key: string]: number } = {};

                    if (questionType === 'true_false') {
                        // Doğru/Yanlış tipi için gerekli sütunlar
                        const answerColIndex = headers.findIndex((h: string) =>
                            h?.toString().toLowerCase().includes('doğru') ||
                            h?.toString().toLowerCase().includes('yanlış') ||
                            h?.toString().toLowerCase().includes('dogru') ||
                            h?.toString().toLowerCase().includes('yanlis') ||
                            h?.toString().toLowerCase().includes('true') ||
                            h?.toString().toLowerCase().includes('false'));

                        columnIndices = { question: questionColIndex, answer: answerColIndex };
                        requiredColumns = ['Soru Metni', 'Doğru/Yanlış'];

                    } else if (questionType === 'text') {
                        // Klasik tipi için gerekli sütunlar
                        const answerColIndex = headers.findIndex((h: string) =>
                            h?.toString().toLowerCase().includes('cevap') ||
                            h?.toString().toLowerCase().includes('answer'));

                        columnIndices = { question: questionColIndex, answer: answerColIndex };
                        requiredColumns = ['Soru Metni', 'Cevap'];

                    } else if (questionType === 'multiple_choice') {
                        // Çoktan seçmeli tipi için gerekli sütunlar
                        const optionAIndex = headers.findIndex((h: string) =>
                            h?.toString().toLowerCase().includes('seçenek a') ||
                            h?.toString().toLowerCase().includes('secenek a') ||
                            h?.toString().toLowerCase().includes('option a') ||
                            h?.toString().toLowerCase().includes('a)') ||
                            h?.toString().toLowerCase().includes('a şıkkı') ||
                            h?.toString().toLowerCase().includes('a sikki'));

                        const optionBIndex = headers.findIndex((h: string) =>
                            h?.toString().toLowerCase().includes('seçenek b') ||
                            h?.toString().toLowerCase().includes('secenek b') ||
                            h?.toString().toLowerCase().includes('option b') ||
                            h?.toString().toLowerCase().includes('b)') ||
                            h?.toString().toLowerCase().includes('b şıkkı') ||
                            h?.toString().toLowerCase().includes('b sikki'));

                        const optionCIndex = headers.findIndex((h: string) =>
                            h?.toString().toLowerCase().includes('seçenek c') ||
                            h?.toString().toLowerCase().includes('secenek c') ||
                            h?.toString().toLowerCase().includes('option c') ||
                            h?.toString().toLowerCase().includes('c)') ||
                            h?.toString().toLowerCase().includes('c şıkkı') ||
                            h?.toString().toLowerCase().includes('c sikki'));

                        const optionDIndex = headers.findIndex((h: string) =>
                            h?.toString().toLowerCase().includes('seçenek d') ||
                            h?.toString().toLowerCase().includes('secenek d') ||
                            h?.toString().toLowerCase().includes('option d') ||
                            h?.toString().toLowerCase().includes('d)') ||
                            h?.toString().toLowerCase().includes('d şıkkı') ||
                            h?.toString().toLowerCase().includes('d sikki'));

                        const correctOptionIndex = headers.findIndex((h: string) =>
                            h?.toString().toLowerCase().includes('doğru seçenek') ||
                            h?.toString().toLowerCase().includes('dogru secenek') ||
                            h?.toString().toLowerCase().includes('correct option') ||
                            h?.toString().toLowerCase().includes('doğru şık') ||
                            h?.toString().toLowerCase().includes('dogru sik') ||
                            h?.toString().toLowerCase().includes('cevap'));

                        columnIndices = {
                            question: questionColIndex,
                            optionA: optionAIndex,
                            optionB: optionBIndex,
                            optionC: optionCIndex,
                            optionD: optionDIndex,
                            correctOption: correctOptionIndex
                        };
                        requiredColumns = ['Soru Metni', 'Seçenek A', 'Seçenek B', 'Seçenek C', 'Seçenek D', 'Doğru Seçenek'];
                    }

                    // Eksik sütunları kontrol et
                    const missingColumns = Object.values(columnIndices).filter(index => index === -1);
                    if (missingColumns.length > 0) {
                        throw new Error(`Excel dosyasında gerekli sütunlar bulunamadı. Lütfen şu sütunların bulunduğundan emin olun: ${requiredColumns.join(', ')}`);
                    }

                    // Verileri doğrula ve işle
                    const parsedQuestions: ExcelQuestion[] = [];
                    let counter = 0;
                    const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];

                        // Boş satırları atla
                        if (!row || row.length === 0 || !row[columnIndices.question]) continue;

                        const questionText = row[columnIndices.question]?.toString().trim();
                        let valid = true;
                        let error = undefined;
                        let isCorrect: boolean | undefined = undefined;
                        let answerText: string | undefined = undefined;
                        let optionA: string | undefined = undefined;
                        let optionB: string | undefined = undefined;
                        let optionC: string | undefined = undefined;
                        let optionD: string | undefined = undefined;
                        let correctOption: string | undefined = undefined;

                        // Soru tipine göre farklı işlem yap
                        if (questionType === 'true_false') {
                            // Doğru/Yanlış değerini işle
                            if (row[columnIndices.answer]) {
                                const answerValue = row[columnIndices.answer]?.toString().toLowerCase().trim();

                                if (['doğru', 'dogru', 'true', 'd', 't', 'evet', 'yes', '1'].includes(answerValue)) {
                                    isCorrect = true;
                                } else if (['yanlış', 'yanlis', 'false', 'y', 'f', 'hayır', 'hayir', 'no', '0'].includes(answerValue)) {
                                    isCorrect = false;
                                } else {
                                    valid = false;
                                    error = 'Geçersiz doğru/yanlış değeri';
                                }
                            } else {
                                valid = false;
                                error = 'Doğru/Yanlış değeri eksik';
                            }

                        } else if (questionType === 'text') {
                            // Klasik soru için cevap metnini kontrol et
                            answerText = row[columnIndices.answer]?.toString().trim();
                            if (!answerText || answerText.length < 1) {
                                valid = false;
                                error = 'Cevap metni eksik';
                            }

                        } else if (questionType === 'multiple_choice') {
                            // Çoktan seçmeli için seçenekleri ve doğru cevabı kontrol et
                            optionA = row[columnIndices.optionA]?.toString().trim();
                            optionB = row[columnIndices.optionB]?.toString().trim();
                            optionC = row[columnIndices.optionC]?.toString().trim();
                            optionD = row[columnIndices.optionD]?.toString().trim();
                            correctOption = row[columnIndices.correctOption]?.toString().toLowerCase().trim();

                            // Seçeneklerin dolu olup olmadığını kontrol et
                            if (!optionA || !optionB || !optionC || !optionD) {
                                valid = false;
                                error = 'Tüm seçenekler (A, B, C, D) doldurulmalıdır';
                            }
                            // Doğru seçeneği kontrol et
                            else if (!correctOption || !['a', 'b', 'c', 'd'].includes(correctOption)) {
                                valid = false;
                                error = 'Doğru seçenek A, B, C veya D olmalıdır';
                            }
                        }

                        // Soru metni kontrolü (her iki tip için ortak)
                        if (!questionText || questionText.length < 3) {
                            valid = false;
                            error = 'Geçersiz soru metni';
                        }

                        // image_keyword'ü oku (varsa)
                        const imageKeyword = imageKeywordIndex !== -1 
                            ? row[imageKeywordIndex]?.toString().trim() 
                            : undefined;

                        parsedQuestions.push({
                            id: ++counter,
                            fileId,
                            fileName: file.name,
                            question_text: questionText || '',
                            is_correct: isCorrect,
                            answer_text: answerText,
                            option_a: optionA,
                            option_b: optionB,
                            option_c: optionC,
                            option_d: optionD,
                            correct_option: correctOption,
                            valid,
                            error,
                            image_keyword: imageKeyword  // YENİ: Excel'den gelen keyword
                        });
                    }

                    // İstatistikler
                    const validCount = parsedQuestions.filter(q => q.valid).length;
                    const stats: ImportStats = {
                        total: parsedQuestions.length,
                        valid: validCount,
                        invalid: parsedQuestions.length - validCount,
                        saved: 0,
                        failed: 0
                    };

                    // Hiç soru bulunamadıysa hata göster
                    if (parsedQuestions.length === 0) {
                        throw new Error('Excel dosyasında işlenebilecek soru bulunamadı.');
                    }

                    const fileUpload: FileUpload = {
                        id: fileId,
                        file,
                        questionType,
                        questions: parsedQuestions,
                        stats,
                        processed: true
                    };

                    resolve(fileUpload);

                } catch (error) {
                    console.error('Excel okuma hatası:', error);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Dosya okunurken bir hata oluştu.'));
            };

            reader.readAsBinaryString(file);
        });
    };

    // Excel dosyası yükle ve işle
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Input'u temizle
        event.target.value = '';

        // Dosya tipi kontrolü
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            setGlobalError('Lütfen geçerli bir Excel (.xlsx, .xls) veya CSV dosyası yükleyin.');
            return;
        }

        // Aynı dosya adı kontrolü
        if (uploadedFiles.some(f => f.file.name === file.name)) {
            setGlobalError('Aynı isimde bir dosya zaten yüklü.');
            return;
        }

        setLoading(true);
        setGlobalError(null);

        try {
            const fileUpload = await processExcelFile(file, currentQuestionType);
            setUploadedFiles(prev => [...prev, fileUpload]);
            setIsAddingNewFile(false);
        } catch (error) {
            setGlobalError(error instanceof Error ? error.message : 'Dosya işlenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Dosya kaldırma
    const removeFile = (fileId: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        setGlobalError(null);
    };

    // Tüm dosyaları temizle
    const clearAllFiles = () => {
        setUploadedFiles([]);
        setGlobalError(null);
        setSuccess(false);
    };

    // Görsel düzenleme modal'ı aç
    const handleOpenImageModal = () => {
        // Tüm soruları görsel düzenleme için hazırla
        const questionsForEdit = allQuestions.map(q => ({
            ...q,
            hasImage: !!q.image_path
        }));
        setQuestionsWithImages(questionsForEdit);
        setImageModalOpen(true);
    };

    // Görsel düzenleme modal'ı kapat
    const handleCloseImageModal = () => {
        // Modal kapatılırken questionsWithImages'daki değişiklikleri uploadedFiles'a aktar
        setUploadedFiles(prev =>
            prev.map(fileUpload => ({
                ...fileUpload,
                questions: fileUpload.questions.map(q => {
                    const updatedQuestion = questionsWithImages.find(uq => uq.id === q.id);
                    return updatedQuestion || q;
                })
            }))
        );
        
        // allQuestions state'ini de güncelle
        setAllQuestions(prev =>
            (prev || []).map(q => {
                const updatedQuestion = questionsWithImages.find(uq => uq.id === q.id);
                return updatedQuestion || q;
            })
        );
        
        setImageModalOpen(false);
        setCurrentSearchingQuestionId(null);
    };

    // Bir soru için görsel arama panelini aç
    const handleOpenImageSearch = (questionId: number) => {
        setCurrentSearchingQuestionId(questionId);
    };

    // Bir soru için görsel arama panelini kapat
    const handleCloseImageSearch = () => {
        setCurrentSearchingQuestionId(null);
    };

    // Seçilen görseli soruya ekle
    const handleImageSelected = (questionId: number, imagePath: string) => {
        // questionsWithImages state'ini güncelle
        setQuestionsWithImages(prev =>
            prev.map(q =>
                q.id === questionId
                    ? { ...q, image_path: imagePath, hasImage: true }
                    : q
            )
        );

        // allQuestions state'ini de güncelle
        setAllQuestions(prev =>
            prev.map(q =>
                q.id === questionId
                    ? { ...q, image_path: imagePath, hasImage: true }
                    : q
            )
        );

        // Arama panelini kapat
        setCurrentSearchingQuestionId(null);
    };

    // Bir sorudan görseli kaldır
    const handleRemoveImage = (questionId: number) => {
        setQuestionsWithImages(prev =>
            prev.map(q =>
                q.id === questionId
                    ? { ...q, image_path: undefined, hasImage: false }
                    : q
            )
        );

        setAllQuestions(prev =>
            prev.map(q =>
                q.id === questionId
                    ? { ...q, image_path: undefined, hasImage: false }
                    : q
            )
        );
    };

    // Filtrelenmiş soruları hesapla
    const getFilteredQuestions = () => {
        switch (imageFilter) {
            case 'with-image':
                return questionsWithImages.filter(q => q.hasImage);
            case 'without-image':
                return questionsWithImages.filter(q => !q.hasImage);
            default:
                return questionsWithImages;
        }
    };

    // Görselli soru sayısını hesapla
    const getImageStats = (): { withImage: number; total: number; percentage: number } => {
        const withImage = allQuestions.filter(q => q.hasImage).length;
        const total = allQuestions.length;
        const percentage = total > 0 ? Math.round((withImage / total) * 100) : 0;
        return { withImage, total, percentage };
    };

    // Soruları kaydet ve tüm oyunlara ekle
    const handleSaveAllQuestions = async () => {
        if (!categoryId) {
            setGlobalError('Lütfen bir kategori seçin.');
            return;
        }

        if (!publisherName.trim()) {
            setGlobalError('Lütfen bir yayınevi seçin.');
            return;
        }

        if (combinedStats.valid === 0) {
            setGlobalError('Kaydedilecek geçerli soru bulunamadı.');
            return;
        }

        setSaving(true);
        setGlobalError(null);

        let totalSaved = 0;
        let totalFailed = 0;

        // Kaydedilen soruların ID'lerini tutacak dizi
        const savedQuestionIds: number[] = [];

        // Her dosyadan geçerli soruları al ve kaydet
        for (const fileUpload of uploadedFiles) {
            const validQuestions = fileUpload.questions.filter(q => q.valid);

            for (const question of validQuestions) {
                try {
                    // QuestionCreate için veri oluştur
                    let questionData: questionService.QuestionCreate;

                    if (fileUpload.questionType === 'true_false') {
                        // Doğru-Yanlış tipi soru
                        questionData = {
                            category_id: categoryId as number,
                            question_text: question.question_text,
                            question_type: 'true_false',
                            difficulty: 'medium',
                            publisher: publisherName.trim(),
                            image_path: question.image_path, // Görseli ekle
                            answers: [
                                { answer_text: 'Doğru', is_correct: question.is_correct === true },
                                { answer_text: 'Yanlış', is_correct: question.is_correct === false }
                            ]
                        };
                    } else if (fileUpload.questionType === 'text') {
                        // Klasik tipi soru
                        questionData = {
                            category_id: categoryId as number,
                            question_text: question.question_text,
                            question_type: 'qa',
                            difficulty: 'medium',
                            publisher: publisherName.trim(),
                            image_path: question.image_path, // Görseli ekle
                            answers: [
                                { answer_text: question.answer_text || '', is_correct: true }
                            ]
                        };
                    } else if (fileUpload.questionType === 'multiple_choice') {
                        // Çoktan seçmeli tipi soru
                        questionData = {
                            category_id: categoryId as number,
                            question_text: question.question_text,
                            question_type: 'multiple_choice',
                            difficulty: 'medium',
                            publisher: publisherName.trim(),
                            image_path: question.image_path, // Görseli ekle
                            answers: [
                                { answer_text: question.option_a || '', is_correct: question.correct_option === 'a' },
                                { answer_text: question.option_b || '', is_correct: question.correct_option === 'b' },
                                { answer_text: question.option_c || '', is_correct: question.correct_option === 'c' },
                                { answer_text: question.option_d || '', is_correct: question.correct_option === 'd' }
                            ]
                        };
                    } else {
                        throw new Error('Geçersiz soru tipi');
                    }

                    // Soruyu kaydet
                    const savedQuestion = await questionService.createQuestion(questionData);

                    // Kaydedilen sorunun ID'sini diziye ekle
                    if (savedQuestion && savedQuestion.id) {
                        savedQuestionIds.push(savedQuestion.id);
                    }

                    totalSaved++;

                } catch (error) {
                    console.error(`Soru kaydedilirken hata (ID: ${question.id}):`, error);
                    totalFailed++;
                }
            }
        }

        // Tüm oyunları al ve kaydedilen soruları tüm oyunlara ekle
        try {
            // Eğer başarıyla kaydedilen sorular varsa
            if (savedQuestionIds.length > 0) {
                // Tüm oyunları getir
                const gamesResponse = await gameService.getGames(1);
                const games = gamesResponse.data;

                // Her oyun için
                for (const game of games) {
                    // Her soruyu oyuna ekle
                    for (const questionId of savedQuestionIds) {
                        try {
                            await gameService.addQuestionToGame(game.id, {
                                question_id: questionId,
                                points: 100 // Varsayılan puan
                            });
                        } catch (error) {
                            console.error(`Soru (ID: ${questionId}) oyuna (ID: ${game.id}) eklenirken hata:`, error);
                            // Oyuna ekleme hatası genel istatistikleri etkilemesin
                        }
                    }
                }

                console.log(`${savedQuestionIds.length} soru ${games.length} oyuna başarıyla eklendi`);
            }
        } catch (error) {
            console.error('Oyunlar alınırken veya sorular oyunlara eklenirken hata:', error);
            // Oyunlara ekleme hatası genel istatistikleri etkilemesin
        }

        // İstatistikleri güncelle
        const updatedStats = {
            ...combinedStats,
            saved: totalSaved,
            failed: totalFailed
        };
        setCombinedStats(updatedStats);

        setSaving(false);
        setSuccess(true);

        // Başarı mesajı göster, ardından sayfayı temizle
        setTimeout(() => {
            if (totalFailed === 0) {
                // Tüm sorular başarıyla kaydedildiyse
                navigate('/questions');
            } else {
                setSuccess(false);
            }
        }, 3000);
    };

    // Örnek Excel dosyası indir
    const handleDownloadTemplate = (questionType: 'true_false' | 'text' | 'multiple_choice') => {
        // Örnek veri oluştur
        type TemplateData = string[][];
        let data: TemplateData = [];

        if (questionType === 'true_false') {
            data = [
                ['Soru Metni', 'Doğru/Yanlış', 'image_keyword'],
                ['Türkiye\'nin başkenti Ankara\'dır.', 'Doğru', 'ankara harita'],
                ['Dünya düzdür.', 'Yanlış', 'dünya gezegen'],
                ['Su 100 derecede kaynar.', 'Doğru', 'su kaynama'],
                ['İnsan kalbi sağ taraftadır.', 'Yanlış', 'kalp organ']
            ];
        } else if (questionType === 'text') {
            data = [
                ['Soru Metni', 'Cevap', 'image_keyword'],
                ['Türkiye\'nin başkenti neresidir?', 'Ankara', 'ankara şehir'],
                ['2+2 kaçtır?', '4', 'matematik sayı'],
                ['Dünyanın en büyük okyanusu hangisidir?', 'Pasifik Okyanusu', 'okyanus harita'],
                ['Cumhuriyet hangi yılda ilan edilmiştir?', '1923', 'atatürk cumhuriyet']
            ];
        } else if (questionType === 'multiple_choice') {
            data = [
                ['Soru Metni', 'Seçenek A', 'Seçenek B', 'Seçenek C', 'Seçenek D', 'Doğru Seçenek', 'image_keyword'],
                ['Türkiye\'nin başkenti neresidir?', 'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'B', 'ankara harita türkiye'],
                ['2+2 kaçtır?', '3', '4', '5', '6', 'B', 'matematik toplama'],
                ['Dünyanın en büyük okyanusu hangisidir?', 'Atlas Okyanusu', 'Hint Okyanusu', 'Pasifik Okyanusu', 'Arktik Okyanusu', 'C', 'okyanus dünya harita'],
                ['Cumhuriyet hangi yılda ilan edilmiştir?', '1922', '1923', '1924', '1925', 'B', 'atatürk cumhuriyet']
            ];
        }

        // Excel çalışma kitabı oluştur
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Çalışma sayfasını çalışma kitabına ekle
        let fileName = '';
        let sheetName = '';

        if (questionType === 'true_false') {
            fileName = 'dogru-yanlis-sorular-sablonu.xlsx';
            sheetName = 'Doğru-Yanlış Sorular';
        } else if (questionType === 'text') {
            fileName = 'klasik-sorular-sablonu.xlsx';
            sheetName = 'Klasik Sorular';
        } else if (questionType === 'multiple_choice') {
            fileName = 'coktan-secmeli-sorular-sablonu.xlsx';
            sheetName = 'Çoktan Seçmeli Sorular';
        }

        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Dosyayı indir
        XLSX.writeFile(wb, fileName);
    };
    // Kategorinin seçili olup olmadığını kontrol et
    const isCategorySelected = categoryExists && publisherName.trim() !== '';

    // Yardım diyaloğunu aç
    const handleOpenHelpDialog = () => {
        setHelpDialogOpen(true);
    };

    // Yardım diyaloğunu kapat
    const handleCloseHelpDialog = () => {
        setHelpDialogOpen(false);
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
            setGlobalError('Sınıf, ders, ünite ve konu seçimi zorunludur.');
            return;
        }

        setCreatingCategory(true);
        setGlobalError(null);

        try {
            const categoryData: categoryService.CategoryCreate = {
                name: generateCategoryName(),
                grade_id: gradeId as number,
                subject_id: subjectId as number,
                unit_id: unitId as number,
                topic_id: topicId as number
            };

            const newCategory = await categoryService.createCategory(categoryData);

            // Kategorileri yenile
            await refreshCategories();

            // Yeni kategoriyi seç
            setCategoryId(newCategory.id);
            setCategoryExists(true);

            setGlobalError(null);
        } catch (err) {
            console.error('Error creating category:', err);
            setGlobalError('Kategori oluşturulurken bir hata oluştu.');
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleCurrentQuestionTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentQuestionType(event.target.value as 'true_false' | 'text' | 'multiple_choice');
    };

    // Çoktan seçmeli soruları görüntülemek için yardımcı fonksiyon
    const renderMultipleChoiceOptions = (question: ExcelQuestion) => {
        return (
            <Box>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                    A) {question.option_a}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                    B) {question.option_b}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                    C) {question.option_c}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
                    D) {question.option_d}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'primary.main' }}>
                    Doğru: {question.correct_option?.toUpperCase()}
                </Typography>
            </Box>
        );
    };

    // Soru tipine göre renk seçimi
    const getQuestionTypeColor = (questionType: 'true_false' | 'text' | 'multiple_choice') => {
        switch (questionType) {
            case 'true_false':
                return 'success';
            case 'text':
                return 'info';
            case 'multiple_choice':
                return 'warning';
            default:
                return 'default';
        }
    };

    // Soru tipine göre etiket metni
    const getQuestionTypeLabel = (questionType: 'true_false' | 'text' | 'multiple_choice') => {
        switch (questionType) {
            case 'true_false':
                return 'Doğru/Yanlış';
            case 'text':
                return 'Klasik';
            case 'multiple_choice':
                return 'Çoktan Seçmeli';
            default:
                return 'Bilinmiyor';
        }
    };

    return (
        <Box sx={{
            width: '100%',
            px: 3,
            boxSizing: 'border-box'
        }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Excel ile Çoklu Soru Ekleme
                <IconButton color="primary" onClick={handleOpenHelpDialog} sx={{ ml: 1, mb: 1 }}>
                    <HelpIcon />
                </IconButton>
            </Typography>

            {/* Kategori ve Yayınevi Seçimi */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                    Kategori ve Yayınevi Seçimi
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                    Kategori Seçimi
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'end', mb: 3 }}>
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

                    <FormControl fullWidth sx={{ mb: 2, maxWidth: 200 }}>
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

                    <FormControl fullWidth sx={{ mb: 2, maxWidth: 200 }}>
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
                        sx={{ mb: 3 }}
                    >
                        {categoryExists
                            ? `Kategori mevcut: ${generateCategoryName()}`
                            : `Bu kombinasyon için kategori bulunamadı: ${generateCategoryName()}`
                        }
                    </Alert>
                )}

                {/* Yayınevi Seçimi */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Yayınevi Seçimi
                    </Typography>
                    <FormControl fullWidth required sx={{ maxWidth: 300 }}>
                        <InputLabel>Yayınevi</InputLabel>
                        <Select
                            value={publisherName}
                            label="Yayınevi"
                            onChange={(e) => setPublisherName(e.target.value)}
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
                        {!publisherName.trim() && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                                Yayınevi seçimi zorunludur
                            </Typography>
                        )}
                    </FormControl>
                </Box>

                {!isCategorySelected && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Lütfen önce bir kategori ve yayınevi seçin.
                    </Alert>
                )}
            </Paper>

            {/* Dosya Yükleme Bölümü */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                    Excel Dosyaları
                </Typography>

                {/* Yeni Dosya Ekleme */}
                <Collapse in={!isAddingNewFile && uploadedFiles.length === 0}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Excel dosyalarınızı yüklemek için önce soru tipini seçin ve ardından dosyayı yükleyin.
                    </Typography>
                </Collapse>

                {(isAddingNewFile || uploadedFiles.length === 0) && (
                    <Box sx={{ mb: 3, p: 2, border: '1px dashed #ddd', borderRadius: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            {uploadedFiles.length === 0 ? 'İlk Excel Dosyasını Yükleyin' : 'Yeni Excel Dosyası Ekleyin'}
                        </Typography>

                        <FormControl component="fieldset" sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Soru Tipi Seçin
                            </Typography>
                            <RadioGroup
                                row
                                value={currentQuestionType}
                                onChange={handleCurrentQuestionTypeChange}
                            >
                                <FormControlLabel
                                    value="true_false"
                                    control={<Radio />}
                                    label="Doğru/Yanlış"
                                />
                                <FormControlLabel
                                    value="text"
                                    control={<Radio />}
                                    label="Klasik"
                                />
                                <FormControlLabel
                                    value="multiple_choice"
                                    control={<Radio />}
                                    label="Çoktan Seçmeli"
                                />
                            </RadioGroup>
                        </FormControl>

                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleDownloadTemplate(currentQuestionType)}
                            >
                                {getQuestionTypeLabel(currentQuestionType)} Şablonu İndir
                            </Button>

                            <Button
                                variant="contained"
                                component="label"
                                startIcon={<FileUploadIcon />}
                                disabled={!isCategorySelected || loading}
                            >
                                {loading ? 'Yükleniyor...' : 'Excel Dosyası Seç'}
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    hidden
                                    onChange={handleFileUpload}
                                />
                            </Button>

                            {uploadedFiles.length > 0 && (
                                <Button
                                    variant="outlined"
                                    onClick={() => setIsAddingNewFile(false)}
                                >
                                    İptal
                                </Button>
                            )}
                        </Box>

                        {loading && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    Excel dosyası işleniyor...
                                </Typography>
                                <LinearProgress />
                            </Box>
                        )}

                        <Typography variant="body2" color="text.secondary">
                            {currentQuestionType === 'true_false' ? (
                                'Excel dosyasında her soru için doğru cevap "Doğru" veya "Yanlış" olarak belirtilmelidir.'
                            ) : currentQuestionType === 'text' ? (
                                'Excel dosyasında her soru için cevap metni "Cevap" sütununda belirtilmelidir.'
                            ) : (
                                'Excel dosyasında her soru için 4 seçenek (A, B, C, D) ve doğru seçenek (A, B, C veya D) belirtilmelidir.'
                            )}
                        </Typography>
                    </Box>
                )}

                {/* Yüklenen Dosyalar Listesi */}
                {uploadedFiles.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1">
                                Yüklenen Dosyalar ({uploadedFiles.length})
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {!isAddingNewFile && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => setIsAddingNewFile(true)}
                                        disabled={!isCategorySelected}
                                    >
                                        Başka Dosya Ekle
                                    </Button>
                                )}
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={clearAllFiles}
                                >
                                    Tümünü Temizle
                                </Button>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {uploadedFiles.map((fileUpload) => (
                                <Card key={fileUpload.id} variant="outlined">
                                    <CardHeader
                                        title={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle1">
                                                    {fileUpload.file.name}
                                                </Typography>
                                                <Chip
                                                    label={getQuestionTypeLabel(fileUpload.questionType)}
                                                    color={getQuestionTypeColor(fileUpload.questionType)}
                                                    size="small"
                                                />
                                            </Box>
                                        }
                                        action={
                                            <IconButton
                                                onClick={() => removeFile(fileUpload.id)}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                    />
                                    <CardContent>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Chip
                                                label={`Toplam: ${fileUpload.stats.total}`}
                                                color="default"
                                                size="small"
                                            />
                                            <Chip
                                                label={`Geçerli: ${fileUpload.stats.valid}`}
                                                color="success"
                                                size="small"
                                                icon={<CheckCircleIcon />}
                                            />
                                            <Chip
                                                label={`Hatalı: ${fileUpload.stats.invalid}`}
                                                color="error"
                                                size="small"
                                                icon={<ErrorIcon />}
                                            />
                                        </Box>

                                        {fileUpload.error && (
                                            <Alert severity="error" sx={{ mt: 2 }}>
                                                {fileUpload.error}
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Toplam İstatistikler */}
                {uploadedFiles.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Toplam İstatistikler
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Chip
                                label={`Toplam Dosya: ${uploadedFiles.length}`}
                                color="primary"
                            />
                            <Chip
                                label={`Toplam Soru: ${combinedStats.total}`}
                                color="default"
                            />
                            <Chip
                                label={`Geçerli: ${combinedStats.valid}`}
                                color="success"
                                icon={<CheckCircleIcon />}
                            />
                            <Chip
                                label={`Hatalı: ${combinedStats.invalid}`}
                                color="error"
                                icon={<ErrorIcon />}
                            />
                        </Box>
                    </Box>
                )}
            </Paper>
            {/* Birleşik Önizleme Tablosu */}
            {allQuestions.length > 0 && (
                <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            Tüm Sorular Önizleme
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={showPreviewTable ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            onClick={() => setShowPreviewTable(!showPreviewTable)}
                        >
                            {showPreviewTable ? 'Gizle' : 'Göster'}
                        </Button>
                    </Box>

                    <Collapse in={showPreviewTable}>
                        <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell width="5%">#</TableCell>
                                        <TableCell width="15%">Dosya</TableCell>
                                        <TableCell width="10%">Tip</TableCell>
                                        <TableCell width="35%">Soru Metni</TableCell>
                                        <TableCell width="25%">Cevap/Seçenekler</TableCell>
                                        <TableCell width="10%">Durum</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {allQuestions.map((question, index) => {
                                        const fileUpload = uploadedFiles.find(f => f.id === question.fileId);
                                        return (
                                            <TableRow
                                                key={`${question.fileId}-${question.id}`}
                                                sx={{
                                                    backgroundColor: question.valid ? 'inherit' : '#fff8f8',
                                                    '&:hover': {
                                                        backgroundColor: question.valid ? '#f5f5f5' : '#fff0f0',
                                                    }
                                                }}
                                            >
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                                        {question.fileName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={getQuestionTypeLabel(fileUpload?.questionType || 'true_false')}
                                                        color={getQuestionTypeColor(fileUpload?.questionType || 'true_false')}
                                                        size="small"
                                                        sx={{ fontSize: '0.7rem' }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title={question.error || ''} placement="top">
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                textDecoration: question.valid ? 'none' : 'line-through',
                                                                color: question.valid ? 'inherit' : 'text.disabled',
                                                                fontSize: '0.8rem'
                                                            }}
                                                        >
                                                            {question.question_text}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    {fileUpload?.questionType === 'true_false' ? (
                                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                            {question.is_correct === true ? 'Doğru' : 'Yanlış'}
                                                        </Typography>
                                                    ) : fileUpload?.questionType === 'text' ? (
                                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                            {question.answer_text}
                                                        </Typography>
                                                    ) : (
                                                        renderMultipleChoiceOptions(question)
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {question.valid ? (
                                                        <Chip
                                                            label="Geçerli"
                                                            color="success"
                                                            size="small"
                                                        />
                                                    ) : (
                                                        <Tooltip title={question.error || 'Geçersiz'}>
                                                            <Chip
                                                                label="Hata"
                                                                color="error"
                                                                size="small"
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Collapse>
                </Paper>
            )}
            {/* Hata ve Başarı Mesajları */}
            {globalError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {globalError}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    {combinedStats.saved} soru başarıyla kaydedildi!
                    {combinedStats.failed > 0 && ` (${combinedStats.failed} soru kaydedilemedi)`}
                </Alert>
            )}

            {/* Aksiyon Butonları */}
            {uploadedFiles.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/questions')}
                        disabled={saving}
                    >
                        İptal
                    </Button>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<ImageIcon />}
                            onClick={handleOpenImageModal}
                            disabled={saving || allQuestions.length === 0}
                        >
                            📸 Görselleri Düzenle ({getImageStats().withImage}/{getImageStats().total})
                        </Button>

                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                            onClick={handleSaveAllQuestions}
                            disabled={saving || combinedStats.valid === 0 || success}
                        >
                            {saving ? 'Kaydediliyor...' : `Tüm Soruları Kaydet (${combinedStats.valid})`}
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Görsel Düzenleme Modal */}
            <Dialog
                open={imageModalOpen}
                onClose={handleCloseImageModal}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { height: '85vh' }
                }}
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">
                            🖼️ Sorulara Görsel Ekleme
                        </Typography>
                        <IconButton onClick={handleCloseImageModal}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                
                <DialogContent dividers>
                    {/* İlerleme Çubuğu */}
                    <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                İlerleme: {getImageStats().withImage}/{getImageStats().total} soru ({getImageStats().percentage}%)
                            </Typography>
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                <InputLabel>Filtre</InputLabel>
                                <Select
                                    value={imageFilter}
                                    label="Filtre"
                                    onChange={(e) => setImageFilter(e.target.value as 'all' | 'with-image' | 'without-image')}
                                >
                                    <MenuItem value="all">Tüm Sorular ({questionsWithImages.length})</MenuItem>
                                    <MenuItem value="with-image">
                                        Görselli ({questionsWithImages.filter(q => q.hasImage).length})
                                    </MenuItem>
                                    <MenuItem value="without-image">
                                        Görselsiz ({questionsWithImages.filter(q => !q.hasImage).length})
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <LinearProgress 
                            variant="determinate" 
                            value={getImageStats().percentage}
                            sx={{ height: 8, borderRadius: 1 }}
                        />
                    </Box>

                    {/* Sorular Listesi */}
                    <Box sx={{ maxHeight: 'calc(90vh - 280px)', overflow: 'auto' }}>
                        {getFilteredQuestions().length === 0 ? (
                            <Alert severity="info">
                                {imageFilter === 'with-image' 
                                    ? 'Henüz görselli soru yok.' 
                                    : imageFilter === 'without-image'
                                    ? 'Tüm sorulara görsel eklenmiş!'
                                    : 'Soru bulunamadı.'}
                            </Alert>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {getFilteredQuestions().map((question) => (
                                    <Card key={question.id} variant="outlined" sx={{ bgcolor: '#fafafa' }}>
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            {/* Soru Başlığı */}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="caption" color="text.secondary" gutterBottom>
                                                        #{question.id} • {question.fileName}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                                                        {question.question_text.length > 120 
                                                            ? question.question_text.substring(0, 120) + '...' 
                                                            : question.question_text}
                                                    </Typography>
                                                </Box>
                                                {question.hasImage && (
                                                    <Chip 
                                                        label="✓" 
                                                        color="success" 
                                                        size="small"
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                            </Box>

                                            {/* Görsel Önizleme veya Ekleme Butonu */}
                                            {question.hasImage ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box
                                                        component="img"
                                                        src={question.image_path}
                                                        alt="Soru görseli"
                                                        sx={{
                                                            width: 80,
                                                            height: 60,
                                                            objectFit: 'cover',
                                                            borderRadius: 1,
                                                            border: '1px solid #ddd'
                                                        }}
                                                    />
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => handleOpenImageSearch(question.id)}
                                                        >
                                                            🔄 Değiştir
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="error"
                                                            onClick={() => handleRemoveImage(question.id)}
                                                        >
                                                            ❌
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Button
                                                    variant="outlined"
                                                    color="primary"
                                                    size="small"
                                                    startIcon={<ImageIcon />}
                                                    onClick={() => handleOpenImageSearch(question.id)}
                                                >
                                                    🔍 Görsel Ekle
                                                </Button>
                                            )}

                                            {/* Inline Görsel Arama Paneli */}
                                            <Collapse in={currentSearchingQuestionId === question.id}>
                                                <ImageSearchPanel
                                                    onImageSelected={(imagePath) => handleImageSelected(question.id, imagePath)}
                                                    onCancel={handleCloseImageSearch}
                                                    initialQuery={
                                                        question.image_keyword || 
                                                        question.question_text.split(' ').slice(0, 3).join(' ')
                                                    }
                                                />
                                            </Collapse>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                        💡 İpucu: Görsel eklemek isteğe bağlıdır. İsterseniz bazı sorulara ekleyebilir, bazılarına eklemeyebilirsiniz.
                    </Typography>
                    <Button onClick={handleCloseImageModal} variant="contained">
                        ✅ Tamamla
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Yardım Diyaloğu */}
            <Dialog
                open={helpDialogOpen}
                onClose={handleCloseHelpDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Excel ile Çoklu Soru Yükleme Hakkında
                    <IconButton
                        onClick={handleCloseHelpDialog}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText component="div">
                        <Typography variant="h6" gutterBottom>
                            Çoklu Dosya Yükleme Nasıl Çalışır?
                        </Typography>

                        <Typography paragraph>
                            Bu özellik ile birden fazla Excel dosyasını farklı soru tipleriyle yükleyebilirsiniz:
                        </Typography>

                        <ul>
                            <li>
                                <Typography>
                                    <strong>Kategori ve Yayınevi:</strong> Tüm dosyalar aynı kategori ve yayınevi altında kaydedilir.
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    <strong>Farklı Soru Tipleri:</strong> Her dosya için farklı soru tipi seçebilirsiniz.
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    <strong>Önizleme:</strong> Tüm dosyalardan gelen soruları birleşik tabloda görebilirsiniz.
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    <strong>Toplu Kayıt:</strong> Tüm geçerli sorular tek seferde kaydedilir.
                                </Typography>
                            </li>
                        </ul>

                        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                            Soru Tipleri ve Excel Formatları
                        </Typography>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography><strong>Doğru/Yanlış Soruları</strong></Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography paragraph>
                                    Gerekli sütunlar: <strong>"Soru Metni"</strong> ve <strong>"Doğru/Yanlış"</strong>
                                </Typography>
                                <Typography paragraph>
                                    Doğru/Yanlış sütununda kabul edilen değerler:
                                </Typography>
                                <ul>
                                    <li>Doğru için: Doğru, Dogru, True, D, T, Evet, Yes, 1</li>
                                    <li>Yanlış için: Yanlış, Yanlis, False, Y, F, Hayır, Hayir, No, 0</li>
                                </ul>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography><strong>Klasik Sorular</strong></Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography paragraph>
                                    Gerekli sütunlar: <strong>"Soru Metni"</strong> ve <strong>"Cevap"</strong>
                                </Typography>
                                <Typography paragraph>
                                    Cevap sütununda sorunun doğru cevabını yazın. Bu metin öğrencilere doğru cevap olarak gösterilecektir.
                                </Typography>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography><strong>Çoktan Seçmeli Sorular</strong></Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography paragraph>
                                    Gerekli sütunlar: <strong>"Soru Metni"</strong>, <strong>"Seçenek A"</strong>, <strong>"Seçenek B"</strong>, <strong>"Seçenek C"</strong>, <strong>"Seçenek D"</strong> ve <strong>"Doğru Seçenek"</strong>
                                </Typography>
                                <Typography paragraph>
                                    Doğru Seçenek sütununda sadece harfi yazın: A, B, C veya D
                                </Typography>
                                <Typography paragraph>
                                    Örnek: Eğer doğru cevap "Seçenek B" ise, "Doğru Seçenek" sütununa sadece "B" yazın.
                                </Typography>
                            </AccordionDetails>
                        </Accordion>

                        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                            Kullanım Adımları
                        </Typography>

                        <ol>
                            <li>
                                <Typography>
                                    <strong>Kategori ve Yayınevi Seçimi:</strong> Önce tüm sorular için kullanılacak kategori ve yayınevini seçin.
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    <strong>İlk Dosya:</strong> Soru tipini seçin ve ilk Excel dosyanızı yükleyin.
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    <strong>Ek Dosyalar:</strong> "Başka Dosya Ekle" butonu ile yeni dosyalar ekleyin.
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    <strong>Kontrol:</strong> Tüm soruları "Önizleme" bölümünde kontrol edin.
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    <strong>Kaydet:</strong> "Tüm Soruları Kaydet" butonu ile tüm geçerli soruları kaydedin.
                                </Typography>
                            </li>
                        </ol>

                        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                            Önemli Notlar
                        </Typography>

                        <ul>
                            <li>
                                <Typography>
                                    Her dosya farklı soru tipi içerebilir (Doğru/Yanlış, Klasik, Çoktan Seçmeli).
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    Tüm dosyalar aynı kategori altında kaydedilir.
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    Hatalı sorular kaydedilmez, sadece geçerli sorular sisteme eklenir.
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    Aynı isimde dosya yükleyemezsiniz.
                                </Typography>
                            </li>
                            <li>
                                <Typography>
                                    Dosyaları ayrı ayrı kaldırabilir veya tümünü temizleyebilirsiniz.
                                </Typography>
                            </li>
                        </ul>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseHelpDialog}>Kapat</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ExcelSoruImport;