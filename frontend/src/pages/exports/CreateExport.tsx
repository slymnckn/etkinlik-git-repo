// src/pages/exports/CreateExport.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Button, Grid, FormControl,
    FormLabel, Select, MenuItem, SelectChangeEvent,
    TextField, CircularProgress, Alert, Divider
} from '@mui/material';
import { ArrowBack as BackIcon, CloudUpload as UploadIcon } from '@mui/icons-material';

// Oyun tipi
interface Game {
    id: number;
    name: string;
    question_count: number;
    last_export?: string;
}

// Mock veri
const mockGames: Game[] = [
    { id: 1, name: 'Tarih Bilgi Yarışması', question_count: 25, last_export: 'v1.0' },
    { id: 2, name: 'Fen Soruları', question_count: 30, last_export: 'v1.2' },
    { id: 3, name: 'Matematik Çarkı', question_count: 40 },
    { id: 4, name: 'Genel Kültür', question_count: 50, last_export: 'v1.5' }
];

const CreateExport = () => {
    const navigate = useNavigate();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [gameId, setGameId] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Backend API bağlantısı yerine mock veri kullanıyoruz
        setLoading(true);

        setTimeout(() => {
            setGames(mockGames);
            setLoading(false);
        }, 500);
    }, []);

    const handleGameChange = (event: SelectChangeEvent) => {
        setGameId(event.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!gameId) {
            setError('Lütfen bir oyun seçin.');
            return;
        }

        setError('');
        setSubmitting(true);

        // Simüle edilmiş API çağrısı
        setTimeout(() => {
            setSubmitting(false);
            alert(`"${games.find(g => g.id === parseInt(gameId))?.name}" oyunu için export işlemi başlatıldı.`);
            navigate('/exports');
        }, 2000);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Button
                    component="a"
                    href="/exports"
                    startIcon={<BackIcon />}
                    sx={{ mr: 2 }}
                    onClick={(e) => {
                        e.preventDefault();
                        navigate('/exports');
                    }}
                >
                    Geri
                </Button>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Yeni Export Oluştur
                </Typography>
            </Box>

            <Paper sx={{ p: 3, borderRadius: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        )}

                        <Alert severity="info" sx={{ mb: 3 }}>
                            Export işlemi, seçilen oyunun WebGL formatında dışa aktarılmasını sağlar. Bu işlem birkaç dakika sürebilir.
                        </Alert>

                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <FormControl fullWidth required>
                                    <FormLabel>Oyun</FormLabel>
                                    <Select
                                        value={gameId}
                                        onChange={handleGameChange}
                                        displayEmpty
                                    >
                                        <MenuItem value="" disabled>
                                            Oyun Seçin
                                        </MenuItem>
                                        {games.map((game) => (
                                            <MenuItem key={game.id} value={game.id.toString()}>
                                                {game.name} ({game.question_count} soru)
                                                {game.last_export && ` - Son export: ${game.last_export}`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    label="Notlar (Opsiyonel)"
                                    fullWidth
                                    multiline
                                    rows={4}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Bu export hakkında notlar..."
                                />
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 3 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                type="button"
                                variant="outlined"
                                onClick={() => navigate('/exports')}
                                sx={{ mr: 2 }}
                            >
                                İptal
                            </Button>

                            <Button
                                type="submit"
                                variant="contained"
                                disabled={submitting || !gameId}
                                startIcon={submitting ? <CircularProgress size={20} /> : <UploadIcon />}
                                sx={{
                                    py: 1.5,
                                    px: 3,
                                    bgcolor: '#1a1a27',
                                    '&:hover': { bgcolor: '#2a2a37' }
                                }}
                            >
                                {submitting ? 'İşleniyor...' : 'Export Oluştur'}
                            </Button>
                        </Box>
                    </form>
                )}
            </Paper>
        </Box>
    );
};

export default CreateExport;