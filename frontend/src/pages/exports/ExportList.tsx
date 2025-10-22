// src/pages/exports/ExportList.tsx
import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, Grid, Table, TableHead,
    TableRow, TableCell, TableBody, TableContainer, TablePagination,
    Chip, IconButton, TextField, InputAdornment, Alert
} from '@mui/material';
import {
    CloudDownload as DownloadIcon,
    Search as SearchIcon,
    Visibility as ViewIcon,
    Send as SendIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

// Export tipleri
interface Export {
    id: number;
    game_name: string;
    version: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    download_url?: string;
    uploaded_to_fernus: boolean;
    fernus_url?: string;
    created_at: string;
    created_by: string;
}

// Mock veri
const mockExports: Export[] = [
    {
        id: 1,
        game_name: 'Tarih Bilgi Yarışması',
        version: '1.0',
        status: 'completed',
        download_url: 'https://example.com/download/1',
        uploaded_to_fernus: true,
        fernus_url: 'https://fernus.example.com/games/1',
        created_at: '2023-06-15 14:30',
        created_by: 'Admin'
    },
    {
        id: 2,
        game_name: 'Fen Soruları',
        version: '1.2',
        status: 'completed',
        download_url: 'https://example.com/download/2',
        uploaded_to_fernus: true,
        created_at: '2023-07-20 10:15',
        created_by: 'Admin'
    },
    {
        id: 3,
        game_name: 'Matematik Çarkı',
        version: '2.0',
        status: 'processing',
        created_at: '2023-07-25 16:45',
        created_by: 'Editor',
        uploaded_to_fernus: true
    },
    {
        id: 4,
        game_name: 'Genel Kültür',
        version: '1.5',
        status: 'failed',
        created_at: '2023-07-26 09:30',
        created_by: 'Admin',
        uploaded_to_fernus: true
    }
];

const ExportList = () => {
    const [exports, setExports] = useState<Export[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState('');

    useEffect(() => {
        // Backend API bağlantısı yerine mock veri kullanıyoruz
        setLoading(true);

        setTimeout(() => {
            setExports(mockExports);
            setLoading(false);
        }, 500);
    }, []);

    // Filtreleme işlemi
    const filteredExports = exports.filter(exp => {
        return exp.game_name.toLowerCase().includes(search.toLowerCase());
    });

    // Sayfalama işlemleri
    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Duruma göre renk ve etiket belirleme
    const getStatusChip = (status: string) => {
        switch (status) {
            case 'completed':
                return <Chip label="Tamamlandı" color="success" size="small" />;
            case 'processing':
                return <Chip label="İşleniyor" color="warning" size="small" />;
            case 'pending':
                return <Chip label="Bekliyor" color="default" size="small" />;
            case 'failed':
                return <Chip label="Başarısız" color="error" size="small" />;
            default:
                return <Chip label={status} size="small" />;
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Export İşlemleri
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
                Export işlemleri, oyunları WebGL formatında dışa aktarmanızı ve Fernus platformuna yüklemenizi sağlar.
            </Alert>

            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                        <TextField
                            fullWidth
                            label="Oyun Adına Göre Ara"
                            variant="outlined"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            component={Link}
                            to="/exports/create"
                            sx={{
                                py: 1.5,
                                px: 3,
                                bgcolor: '#1a1a27',
                                '&:hover': { bgcolor: '#2a2a37' }
                            }}
                        >
                            Yeni Export
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            <Paper sx={{ borderRadius: 2 }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f8fa' }}>
                            <TableRow>
                                <TableCell width="5%">#</TableCell>
                                <TableCell width="25%">Oyun</TableCell>
                                <TableCell width="10%">Versiyon</TableCell>
                                <TableCell width="15%">Durum</TableCell>
                                <TableCell width="15%">Fernus</TableCell>
                                <TableCell width="15%">Tarih</TableCell>
                                <TableCell width="15%">İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        Yükleniyor...
                                    </TableCell>
                                </TableRow>
                            ) : filteredExports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        Export bulunamadı.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredExports
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((exp) => (
                                        <TableRow key={exp.id} hover>
                                            <TableCell>{exp.id}</TableCell>
                                            <TableCell>{exp.game_name}</TableCell>
                                            <TableCell>{exp.version}</TableCell>
                                            <TableCell>{getStatusChip(exp.status)}</TableCell>
                                            <TableCell>
                                                {exp.uploaded_to_fernus ? (
                                                    <Chip label="Yüklendi" color="success" size="small" />
                                                ) : (
                                                    <Chip label="Yüklenmedi" size="small" />
                                                )}
                                            </TableCell>
                                            <TableCell>{exp.created_at}</TableCell>
                                            <TableCell>
                                                {exp.status === 'completed' && (
                                                    <>
                                                        <IconButton
                                                            color="primary"
                                                            title="İndir"
                                                            component="a"
                                                            href={exp.download_url}
                                                            target="_blank"
                                                        >
                                                            <DownloadIcon />
                                                        </IconButton>

                                                        {!exp.uploaded_to_fernus && (
                                                            <IconButton
                                                                color="success"
                                                                title="Fernus'a Gönder"
                                                            >
                                                                <SendIcon />
                                                            </IconButton>
                                                        )}
                                                    </>
                                                )}

                                                <IconButton color="info" title="Detaylar">
                                                    <ViewIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[ 10]}
                    component="div"
                    count={filteredExports.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Sayfa başına satır:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                />
            </Paper>
        </Box>
    );
};

export default ExportList;