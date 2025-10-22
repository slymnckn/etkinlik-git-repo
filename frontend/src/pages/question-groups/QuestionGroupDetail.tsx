// src/pages/question-groups/QuestionGroupDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Button, Grid, CircularProgress, Alert, List, ListItem, ListItemText,
    Chip, IconButton, Tooltip, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle, TextField
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
    Image as ImageIcon,
    Code as CodeIcon,
    CheckCircle as CheckCircleIcon,
    Download as DownloadIcon
} from '@mui/icons-material';
import * as questionGroupService from '../../services/question-group.service';
import * as iframeService from '../../services/iframe.service';
import { usePublishers } from '../../hooks/usePublishers';

type Timeout = ReturnType<typeof setTimeout>;

const QuestionGroupDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { publishers } = usePublishers();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [questionGroup, setQuestionGroup] = useState<questionGroupService.QuestionGroup | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [codeDialogOpen, setCodeDialogOpen] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    // İframe ile ilgili durumlar
    const [iframeLoading, setIframeLoading] = useState(false);
    const [iframeDialogOpen, setIframeDialogOpen] = useState(false);
    const [iframeCode, setIframeCode] = useState<string | null>(null);
    const [iframeStatus, setIframeStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
    const [iframeCopied, setIframeCopied] = useState(false);
    const [statusCheckInterval, setStatusCheckInterval] = useState<Timeout | null>(null);

    useEffect(() => {
        fetchQuestionGroup();
        return () => {
            // Component unmount olduğunda interval'i temizle
            if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
            }
        };
    }, [id]);

    const fetchQuestionGroup = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const response = await questionGroupService.getQuestionGroup(parseInt(id));
            setQuestionGroup(response);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching question group:', err);
            setError('Etkinlik yüklenirken bir hata oluştu.');
            setLoading(false);
        }
    };

    // Silme işlemleri
    const handleDeleteClick = () => {
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!id) return;

        try {
            await questionGroupService.deleteQuestionGroup(parseInt(id));
            navigate('/question-groups');
        } catch (err) {
            console.error('Error deleting question group:', err);
            setError('Etkinlik silinirken bir hata oluştu.');
        } finally {
            setDeleteDialogOpen(false);
        }
    };

    // Kod kopyalama
    const handleCopyCodeClick = () => {
        if (!questionGroup) return;
        setCodeDialogOpen(true);
        setCodeCopied(false);
    };

    const handleCopyCode = () => {
        if (!questionGroup) return;
        navigator.clipboard.writeText(questionGroup.code);
        setCodeCopied(true);
    };

    // Oyun linki kopyalama
    const handleCopyGameLink = () => {
        if (!questionGroup) return;
        
        // Veritabanından direkt oyun linkini al
        const gameUrl = questionGroup.iframe_url || `${window.location.origin}/unity-project/index.html?code=${questionGroup.code}`;
        navigator.clipboard.writeText(gameUrl);
        setLinkCopied(true);
        
        // 3 saniye sonra durumu sıfırla
        setTimeout(() => setLinkCopied(false), 3000);
    };

    // İframe oluşturma işlemleri
    const handleCreateIframe = async () => {
        if (!questionGroup?.id) return;

        try {
            setIframeLoading(true);
            setIframeStatus('processing');
            setIframeDialogOpen(true);

            // iframe oluşturmayı başlat
            await iframeService.createIframe(questionGroup.id,questionGroup.game_id);

            // Durumu periyodik olarak kontrol et
            const interval = setInterval(checkIframeStatus, 60000) as Timeout; // 5 saniyede bir kontrol et
            setStatusCheckInterval(interval);
        } catch (err) {
            console.error('Error creating iframe:', err);
            setIframeStatus('failed');
            setIframeLoading(false);
        }
    };

    const checkIframeStatus = async () => {
        if (!questionGroup?.id) return;

        try {
            const status = await iframeService.checkIframeStatus(questionGroup.id);

            if (status.isReady) {
                setIframeStatus('completed');
                // null değerini kabul eden setIframeCode için doğru tip dönüşümü
                setIframeCode(status.iframe_code || null);
                setIframeLoading(false);

                // Başarıyla tamamlandığında intervali temizle
                if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                    setStatusCheckInterval(null);
                }

                // Etkinliknu güncel bilgilerle yeniden yükle
                fetchQuestionGroup();
            } else if (status.status === 'failed') {
                setIframeStatus('failed');
                setIframeLoading(false);

                if (statusCheckInterval) {
                    clearInterval(statusCheckInterval);
                    setStatusCheckInterval(null);
                }
            }
        } catch (err) {
            console.error('Error checking iframe status:', err);
            // Hata durumunda sürekli kontrol etmeye devam et
        }
    };

    const handleCopyIframe = () => {
        if (!iframeCode) return;
        navigator.clipboard.writeText(iframeCode);
        setIframeCopied(true);
        setTimeout(() => setIframeCopied(false), 3000);
    };

    const closeIframeDialog = () => {
        setIframeDialogOpen(false);
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
            setStatusCheckInterval(null);
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
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', width: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 3, width: '100%' }}>
                {error}
            </Alert>
        );
    }

    if (!questionGroup) {
        return (
            <Alert severity="warning" sx={{ mt: 3, width: '100%' }}>
                Etkinlik bulunamadı.
            </Alert>
        );
    }

    return (
        <Box sx={{ width: '100%', px: 0 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                        component={Link}
                        to="/question-groups"
                        color="primary"
                        sx={{ mr: 1 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h4" fontWeight="bold">
                        {questionGroup.name}
                    </Typography>
                </Box>

                <Box>
                    <Button
                        onClick={handleCreateIframe}
                        disabled={iframeLoading}
                        variant="contained"
                        color="primary"
                        startIcon={<CodeIcon />}
                        sx={{ mr: 1 }}
                    >
                        {iframeLoading ? "İşleniyor..." : "İframe Oluştur"}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<CopyIcon />}
                        onClick={handleCopyGameLink}
                        sx={{ mr: 1 }}
                    >
                        Oyun Linki
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        component={Link}
                        to={`/question-groups/${id}/edit`}
                        sx={{ mr: 1 }}
                    >
                        Düzenle
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleDeleteClick}
                    >
                        Sil
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                    Etkinlik Bilgileri
                </Typography>

                <Grid container spacing={3}>
                    {/* Etkinlik Görseli */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Etkinlik Görseli
                        </Typography>
                        <Box sx={{ mt: 1, mb: 2 }}>
                            {(() => {
                                // Önce manuel yüklenen görsel varsa onu göster
                                if (questionGroup.image_url) {
                                    return (
                                        <Box sx={{ position: 'relative' }}>
                                            <Box
                                                component="img"
                                                src={questionGroup.image_url}
                                                alt={questionGroup.name}
                                                sx={{
                                                    maxWidth: '100%',
                                                    maxHeight: '300px',
                                                    objectFit: 'contain',
                                                    borderRadius: 1,
                                                    border: '2px solid #2196f3'
                                                }}
                                            />
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: -20,
                                                    left: 0,
                                                    color: 'primary.main',
                                                    fontWeight: 'medium'
                                                }}
                                            >
                                                Yüklenen görsel
                                            </Typography>
                                        </Box>
                                    );
                                }

                                // Manuel görsel yoksa yayınevi logosuna bak
                                const publisherLogo = publishers.find(p => p.name === questionGroup.publisher)?.logo_url;
                                if (publisherLogo) {
                                    return (
                                        <Box sx={{ position: 'relative' }}>
                                            <Box
                                                component="img"
                                                src={publisherLogo}
                                                alt={`${questionGroup.publisher} logosu`}
                                                sx={{
                                                    maxWidth: '100%',
                                                    maxHeight: '300px',
                                                    objectFit: 'contain',
                                                    borderRadius: 1,
                                                    border: '1px solid #e0e0e0'
                                                }}
                                            />
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: -20,
                                                    left: 0,
                                                    color: 'primary.main',
                                                    fontWeight: 'medium'
                                                }}
                                            >
                                                {questionGroup.publisher} yayınevi logosu
                                            </Typography>
                                        </Box>
                                    );
                                }

                                // Hiçbir görsel yoksa placeholder göster
                                return (
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: '#f5f5f5',
                                        borderRadius: 1,
                                        p: 4,
                                        border: '1px dashed #cccccc'
                                    }}>
                                        <ImageIcon sx={{ fontSize: 40, color: '#aaaaaa', mr: 2 }} />
                                        <Typography color="text.secondary">
                                            Bu etkinlik için görsel bulunmuyor
                                        </Typography>
                                    </Box>
                                );
                            })()}
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Etkinlik
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {questionGroup.name}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Etkinlik Kodu
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body1" fontWeight="medium" fontFamily="monospace">
                                {questionGroup.code}
                            </Typography>
                            <IconButton
                                size="small"
                                color="primary"
                                sx={{ ml: 1 }}
                                onClick={handleCopyCodeClick}
                            >
                                <CopyIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Soru Tipi
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {getQuestionTypeLabel(questionGroup.question_type)}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Oyun
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {questionGroup.game?.name || '-'}
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Oluşturan
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {questionGroup.creator?.name || '-'}
                        </Typography>
                    </Grid>
                    {/* YENİ: Publisher Grid Item */}
                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Yayınevi
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {questionGroup.publisher || '-'}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Soru Sayısı
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {questionGroup.questions?.length || 0}
                        </Typography>
                    </Grid>

                    {/* İframe Durumu Gösterimi */}
                    {questionGroup.iframe_status === 'completed' && questionGroup.iframe_code && (
                        <Grid item xs={12}>
                            <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: '#f8fff8', borderRadius: 1, border: '1px solid #c6e6c6' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: "bold" }}>
                                        İframe Hazır
                                    </Typography>
                                </Box>

                                {/* 1. KISIM: İframe kodunu doğrudan göster */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                        İframe Kodu:
                                    </Typography>
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        bgcolor: '#f5f5f5',
                                        p: 2,
                                        borderRadius: 1,
                                        border: '1px solid #e0e0e0',
                                        position: 'relative'
                                    }}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            multiline
                                            rows={3}
                                            value={questionGroup.iframe_code || ''}
                                            InputProps={{
                                                readOnly: true,
                                                sx: { fontFamily: 'monospace', pr: 7 }
                                            }}
                                            size="small"
                                        />
                                        <Tooltip title="Kopyala">
                                            <IconButton
                                                sx={{
                                                    position: 'absolute',
                                                    right: 8,
                                                    color: iframeCopied ? 'success.main' : 'primary.main'
                                                }}
                                                onClick={() => {
                                                    if (questionGroup.iframe_code) {
                                                        navigator.clipboard.writeText(questionGroup.iframe_code);
                                                        setIframeCopied(true);
                                                        setTimeout(() => setIframeCopied(false), 3000);
                                                    }
                                                }}
                                            >
                                                {iframeCopied ? <CheckCircleIcon /> : <CopyIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                    {iframeCopied && (
                                        <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                                            İframe kodu panoya kopyalandı!
                                        </Typography>
                                    )}
                                </Box>

                                {/* 2. KISIM: Sadece URL göster */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                        İframe URL:
                                    </Typography>
                                    {(() => {
                                        // iframe kodundan URL'i çıkar
                                        const iframe = questionGroup.iframe_code || '';
                                        const srcMatch = iframe.match(/src="([^"]+)"/);
                                        const iframeUrl = srcMatch ? srcMatch[1] : '';

                                        return (
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                bgcolor: '#f5f5f5',
                                                p: 2,
                                                borderRadius: 1,
                                                border: '1px solid #e0e0e0',
                                                position: 'relative'
                                            }}>
                                                <TextField
                                                    fullWidth
                                                    variant="outlined"
                                                    value={iframeUrl}
                                                    InputProps={{
                                                        readOnly: true,
                                                        sx: { fontFamily: 'monospace', pr: 7 }
                                                    }}
                                                    size="small"
                                                />
                                                <Tooltip title="Kopyala">
                                                    <IconButton
                                                        sx={{
                                                            position: 'absolute',
                                                            right: 8,
                                                            color: 'primary.main'
                                                        }}
                                                        onClick={() => {
                                                            if (iframeUrl) {
                                                                navigator.clipboard.writeText(iframeUrl);
                                                                // URL kopyalandı bildirimi için alert kullanabiliriz
                                                                alert("URL panoya kopyalandı!");
                                                            }
                                                        }}
                                                    >
                                                        <CopyIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        );
                                    })()}
                                </Box>

                                {/* 3. KISIM: Zip indirme seçeneği */}
                                {questionGroup.zip_url && (
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                            Unity Kaynak Dosyası:
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            href={questionGroup.zip_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            startIcon={<DownloadIcon />}
                                            fullWidth
                                            sx={{ justifyContent: 'flex-start' }}
                                        >
                                            Zip Dosyasını İndir
                                        </Button>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            Bu zip dosyası, Unity için oluşturulmuş tüm verileri içerir. İndirdikten sonra yerel olarak inceleyebilirsiniz.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Grid>
                    )}

                    {questionGroup.iframe_status === 'processing' && (
                        <Grid item xs={12}>
                            <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
                                <CircularProgress size={20} sx={{ mr: 2 }} />
                                <Typography variant="subtitle2" color="primary.main">
                                    İframe oluşturma işlemi devam ediyor...
                                </Typography>
                            </Box>
                        </Grid>
                    )}

                    {questionGroup.iframe_status === 'failed' && (
                        <Grid item xs={12}>
                            <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: '#fef6f6', borderRadius: 1, border: '1px solid #f5c2c2' }}>
                                <Typography variant="subtitle2" color="error.main" sx={{ mb: 1, fontWeight: "bold" }}>
                                    İframe oluşturma başarısız oldu
                                </Typography>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={handleCreateIframe}
                                    size="small"
                                >
                                    Tekrar Dene
                                </Button>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 3 }}>
                    Sorular
                </Typography>

                {questionGroup.questions && questionGroup.questions.length > 0 ? (
                    <List
                        sx={{
                            width: '100%',
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: '1px solid #e0e0e0',
                            maxHeight: '500px',
                            overflow: 'auto'
                        }}
                    >
                        {questionGroup.questions.map((question, index) => (
                            <ListItem
                                key={question.id}
                                sx={{
                                    borderBottom: '1px solid #f0f0f0',
                                    '&:last-child': { borderBottom: 'none' }
                                }}
                            >
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography sx={{ mr: 1, minWidth: '30px' }}>
                                                {index + 1}.
                                            </Typography>
                                            {question.question_text}
                                        </Box>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', mt: 1 }}>
                                            {question.category && (
                                                <Chip
                                                    label={question.category.name}
                                                    size="small"
                                                    color="default"
                                                    sx={{ mr: 1 }}
                                                />
                                            )}
                                            <Chip
                                                label={question.difficulty === 'easy' ? 'Kolay' :
                                                    question.difficulty === 'medium' ? 'Orta' : 'Zor'}
                                                size="small"
                                                color={
                                                    question.difficulty === 'easy' ? 'success' :
                                                        question.difficulty === 'medium' ? 'warning' : 'error'
                                                }
                                            />
                                        </Box>
                                    }
                                />

                                <Tooltip title="Soruyu Düzenle">
                                    <IconButton
                                        size="small"
                                        component={Link}
                                        to={`/questions/${question.id}/edit`}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Alert severity="info">
                        Bu grupta henüz soru bulunmuyor.
                    </Alert>
                )}
            </Paper>

            {/* Oyun Linki Kopyalandı Bildirimi */}
            {linkCopied && (
                <Alert 
                    severity="success" 
                    sx={{ 
                        position: 'fixed', 
                        top: 20, 
                        right: 20, 
                        zIndex: 9999,
                        minWidth: '300px'
                    }}
                >
                    Oyun linki panoya kopyalandı!
                </Alert>
            )}

            {/* Silme Onay Dialogu */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Etkinlik Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        "{questionGroup.name}" etkinliğini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        İptal
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                    >
                        Sil
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Kod Gösterme Dialogu */}
            <Dialog
                open={codeDialogOpen}
                onClose={() => setCodeDialogOpen(false)}
            >
                <DialogTitle>Etkinlik Kodu</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bu gruptan soruları çekmek için aşağıdaki kodu kullanabilirsiniz:
                    </DialogContentText>
                    <Box sx={{
                        my: 2,
                        p: 2,
                        bgcolor: '#f5f5f5',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '16px'
                    }}>
                        {questionGroup.code}
                    </Box>
                    {codeCopied && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            Kod panoya kopyalandı!
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCodeDialogOpen(false)}>
                        Kapat
                    </Button>
                    <Button
                        onClick={handleCopyCode}
                        variant="contained"
                        startIcon={<CopyIcon />}
                    >
                        Kopyala
                    </Button>
                </DialogActions>
            </Dialog>

            {/* İframe Gösterme Dialogu */}
            <Dialog
                open={iframeDialogOpen}
                onClose={closeIframeDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {iframeStatus === 'processing' ? "İframe Oluşturuluyor..." :
                        iframeStatus === 'completed' ? "İframe Kodu Hazır" :
                            "İframe Oluşturma"}
                </DialogTitle>
                <DialogContent>
                    {iframeStatus === 'processing' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', py: 4 }}>
                            <CircularProgress sx={{ mb: 3 }} />
                            <Typography>
                                İframe kodu oluşturuluyor, lütfen bekleyin...
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                Bu işlem birkaç dakika sürebilir.
                            </Typography>
                        </Box>
                    )}

                    {iframeStatus === 'completed' && iframeCode && (
                        <>
                            <DialogContentText sx={{ mb: 2 }}>
                                Aşağıdaki iframe kodunu web sitenize ekleyerek bu etkinliği görüntüleyebilirsiniz:
                            </DialogContentText>

                            <TextField
                                fullWidth
                                variant="outlined"
                                multiline
                                rows={4}
                                value={iframeCode}
                                InputProps={{
                                    readOnly: true,
                                    sx: { fontFamily: 'monospace' }
                                }}
                                sx={{ mb: 3 }}
                            />

                            {iframeCopied && (
                                <Alert severity="success" sx={{ mb: 3 }}>
                                    İframe kodu panoya kopyalandı!
                                </Alert>
                            )}

                            <DialogContentText sx={{ mb: 2 }}>
                                Önizleme:
                            </DialogContentText>

                            <Box sx={{
                                border: '1px solid #e0e0e0',
                                borderRadius: 1,
                                p: 1,
                                mb: 2,
                                bgcolor: '#f9f9f9',
                                height: '400px',
                                overflow: 'hidden'
                            }}>
                                <div dangerouslySetInnerHTML={{ __html: iframeCode }} />
                            </Box>
                        </>
                    )}

                    {iframeStatus === 'failed' && (
                        <Alert severity="error" sx={{ my: 2 }}>
                            <Typography fontWeight="bold" sx={{ mb: 1 }}>
                                İframe oluşturma işlemi başarısız oldu.
                            </Typography>
                            <Typography variant="body2">
                                Lütfen daha sonra tekrar deneyin veya sistem yöneticisiyle iletişime geçin.
                            </Typography>
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeIframeDialog}>
                        {iframeStatus === 'processing' ? "Arka Planda Devam Et" : "Kapat"}
                    </Button>
                    {iframeStatus === 'completed' && iframeCode && (
                        <Button
                            onClick={handleCopyIframe}
                            variant="contained"
                            startIcon={<CopyIcon />}
                            color="primary"
                        >
                            Kopyala
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default QuestionGroupDetail;