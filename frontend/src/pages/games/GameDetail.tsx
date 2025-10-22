// src/pages/games/GameDetail.tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Box, Typography, Paper, Button, Grid, Chip,
    List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction,
    IconButton, Tabs, Tab, Alert, CircularProgress, Dialog,
    DialogTitle, DialogContent, DialogContentText, DialogActions,
    Checkbox, ListItemButton
} from '@mui/material';
import {
    QuestionAnswer as QuestionIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    ArrowBack as BackIcon
} from '@mui/icons-material';
import { useGame } from '../../hooks/useGame';
import axios, { AxiosError } from 'axios';

// Sekme değerleri için interface
interface TabPanelProps {
    children?: React.ReactNode;
    value: number;
    index: number;
}

// Sekme paneli bileşeni
const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`game-tabpanel-${index}`}
            aria-labelledby={`game-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

const GameDetail = () => {
    const { id } = useParams<{ id: string }>();
    const gameId = parseInt(id || '0');

    const [bulkAddDialogOpen, setBulkAddDialogOpen] = useState(false);
    const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

    const {
        game, loading, error, removeQuestion,
        availableQuestions, loadingAvailableQuestions,
        getAvailableQuestions, addMultipleQuestions
    } = useGame(gameId);

    const [tabValue, setTabValue] = useState(0);



    // Soru silme
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    // Soru silme işlemleri
    const handleDeleteClick = (questionId: number) => {
        setQuestionToDelete(questionId);
        setDeleteDialogOpen(true);
        setDeleteError(null);
    };

    const handleDeleteConfirm = async () => {
        if (questionToDelete === null || !game) return;

        setIsDeleting(true);
        try {
            const success = await removeQuestion(questionToDelete);
            if (success) {
                setDeleteDialogOpen(false);
                setQuestionToDelete(null);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<ApiErrorResponse>;
                setDeleteError(axiosError.response?.data?.message || 'Soru oyundan çıkarılırken bir hata oluştu');
                console.error('Error removing question:', axiosError.response?.data);
            } else {
                setDeleteError('Soru oyundan çıkarılırken beklenmeyen bir hata oluştu');
                console.error('Unexpected error:', error);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setQuestionToDelete(null);
    };

    // Toplu ekleme metodlarını
    const handleBulkAddClick = async () => {
        setBulkAddDialogOpen(true);
        setSelectedQuestions([]);
        await getAvailableQuestions();
    };

    const handleQuestionSelect = (questionId: number) => {
        setSelectedQuestions(prev => {
            if (prev.includes(questionId)) {
                return prev.filter(id => id !== questionId);
            } else {
                return [...prev, questionId];
            }
        });
    };

    const handleBulkAddConfirm = async () => {
        if (selectedQuestions.length === 0) return;

        const success = await addMultipleQuestions(selectedQuestions, 100);
        if (success) {
            setBulkAddDialogOpen(false);
            setSelectedQuestions([]);
        }
    };

    // iframe kodunu al
// Oyun tipini Türkçe olarak gösterme
    const getGameTypeLabel = (type: string) => {
        switch (type) {
            case 'jeopardy':
                return 'Jeopardy';
            case 'wheel':
                return 'Bilgi Çarkı';
            default:
                return type;
        }
    };

    // Soru tipini Türkçe olarak gösterme
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
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {error}
            </Alert>
        );
    }

    if (!game) {
        return (
            <Box>
                <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                    Oyun Detayı
                </Typography>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography>Oyun bulunamadı.</Typography>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{
            width: '100%',
            px: 2,            // Responsive boşluk (varsayılan container gibi)
            boxSizing: 'border-box'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Button
                    component={Link}
                    to="/games"
                    startIcon={<BackIcon />}
                    sx={{ mr: 2 }}
                >
                    Geri
                </Button>
                <Typography variant="h4" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                    {game.name}
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleBulkAddClick}
                    sx={{
                        mr: 1,
                        bgcolor: '#1a1a27',
                        '&:hover': { bgcolor: '#2a2a37' }
                    }}
                >
                    Soru Seç
                </Button>
            </Box>

            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>
                            Oyun Bilgileri
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Açıklama
                            </Typography>
                            <Typography variant="body1">
                                {game.description || 'Bu oyun için açıklama bulunmuyor.'}
                            </Typography>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Oyun Tipi
                                </Typography>
                                <Typography variant="body1">
                                    {getGameTypeLabel(game.type)}
                                </Typography>
                            </Grid>

                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Durum
                                </Typography>
                                <Chip
                                    label={game.is_active ? 'Aktif' : 'Pasif'}
                                    color={game.is_active ? 'success' : 'default'}
                                    size="small"
                                />
                            </Grid>

                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Soru Sayısı
                                </Typography>
                                <Typography variant="body1">
                                    {game.questions?.length || 0}
                                </Typography>
                            </Grid>

                            {game.creator && (
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Oluşturan
                                    </Typography>
                                    <Typography variant="body1">
                                        {game.creator.name}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Grid>
                </Grid>
            </Paper>

            <Paper sx={{ borderRadius: 2 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label="game tabs">
                        <Tab label="Sorular" id="game-tab-0" aria-controls="game-tabpanel-0" />
                    </Tabs>
                </Box>

                <Box sx={{ p: 3 }}>
                    <TabPanel value={tabValue} index={0}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6">
                                Oyundaki Sorular
                            </Typography>

                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                component={Link}
                                to={`/questions/add?gameId=${game.id}`}
                                size="small"
                            >
                                Yeni Soru Ekle
                            </Button>
                        </Box>

                        <List>
                            {!game.questions || game.questions.length === 0 ? (
                                <Alert severity="warning">
                                    Bu oyuna henüz soru eklenmemiş.
                                </Alert>
                            ) : (
                                game.questions.map((question) => (
                                    <ListItem
                                        key={question.id}
                                        sx={{
                                            mb: 1,
                                            border: '1px solid #eee',
                                            borderRadius: 1,
                                            '&:hover': { bgcolor: '#f9f9f9' }
                                        }}
                                    >
                                        <ListItemIcon>
                                            <QuestionIcon />
                                        </ListItemIcon>

                                        <ListItemText
                                            primary={question.question_text}
                                            secondary={
                                                <Box sx={{ display: 'flex', mt: 0.5 }}>
                                                    <Chip
                                                        label={getQuestionTypeLabel(question.question_type)}
                                                        size="small"
                                                        sx={{ mr: 1 }}
                                                    />
                                                    <Chip
                                                        label="100 Puan"
                                                        size="small"
                                                        color="primary"
                                                    />
                                                </Box>
                                            }
                                        />

                                        <ListItemSecondaryAction>
                                            <IconButton
                                                edge="end"
                                                aria-label="edit"
                                                component={Link}
                                                to={`/questions/${question.id}/edit`}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                edge="end"
                                                aria-label="delete"
                                                color="error"
                                                onClick={() => handleDeleteClick(question.id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </TabPanel>
                </Box>
            </Paper>

            {/* Silme Onay Dialogu */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
            >
                <DialogTitle>Soruyu Oyundan Çıkar</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bu soruyu oyundan çıkarmak istediğinize emin misiniz?
                    </DialogContentText>

                    {deleteError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {deleteError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel} disabled={isDeleting}>
                        İptal
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        disabled={isDeleting}
                        startIcon={isDeleting ? <CircularProgress size={20} /> : null}
                    >
                        {isDeleting ? 'İşleniyor...' : 'Çıkar'}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Toplu Soru Ekleme Dialogu */}
            <Dialog
                open={bulkAddDialogOpen}
                onClose={() => setBulkAddDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Toplu Soru Ekle</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Eklemek istediğiniz soruları seçin:
                    </DialogContentText>

                    {loadingAvailableQuestions ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : availableQuestions.length === 0 ? (
                        <Alert severity="info">
                            Eklenebilecek yeni soru bulunmuyor.
                        </Alert>
                    ) : (
                        <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
                            {availableQuestions.map((question) => (
                                <ListItem
                                    key={question.id}
                                    disablePadding
                                >
                                    <ListItemButton onClick={() => handleQuestionSelect(question.id)}>
                                        <ListItemIcon>
                                            <Checkbox
                                                edge="start"
                                                checked={selectedQuestions.includes(question.id)}
                                                tabIndex={-1}
                                                disableRipple
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={question.question_text}
                                            secondary={`ID: ${question.id} - ${question.question_type}`}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}

                    {selectedQuestions.length > 0 && (
                        <Typography sx={{ mt: 2 }}>
                            Seçilen soru sayısı: {selectedQuestions.length}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkAddDialogOpen(false)}>
                        İptal
                    </Button>
                    <Button
                        onClick={handleBulkAddConfirm}
                        variant="contained"
                        disabled={selectedQuestions.length === 0}
                        startIcon={<AddIcon />}
                    >
                        Seçilenleri Ekle
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GameDetail;