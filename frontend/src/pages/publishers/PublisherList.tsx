// src/pages/publishers/PublisherList.tsx
import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    Alert, CircularProgress, Chip, Grid, InputAdornment,
    Tooltip, Fab, Avatar
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Business as BusinessIcon,
    CloudUpload as CloudUploadIcon,
    Image as ImageIcon,
    DeleteOutline as DeleteOutlineIcon
} from '@mui/icons-material';
import { usePublishers } from '../../hooks/usePublishers';

interface Publisher {
    id: number;
    name: string;
    logo_url?: string;
    created_at?: string;
    questions_count?: number;
    has_logo?: boolean;
}

// Drag & Drop dosya yükleme için stiller
const dropzoneStyles = {
    border: '2px dashed #cccccc',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    backgroundColor: '#f9f9f9',
    transition: 'all .3s ease-in-out',
    '&:hover': {
        backgroundColor: '#f0f0f0',
        borderColor: '#999999'
    },
    '&.active': {
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)'
    }
};

const PublisherList = () => {
    const {
        publishers,
        loading: publishersLoading,
        createPublisherFlexible: createPublisher,
        deletePublisher,
        updatePublisherFlexible: updatePublisher
    } = usePublishers();
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Dialog states
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Form states
    const [publisherName, setPublisherName] = useState('');
    const [selectedPublisher, setSelectedPublisher] = useState<Publisher | null>(null);

    // Logo yükleme states
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Filtreleme
    const filteredPublishers = publishers.filter(publisher =>
        publisher.name.toLowerCase().includes(search.toLowerCase())
    );

    // Success ve error mesajlarını otomatik temizle
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Logo yükleme işlemleri
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
            setUploadError('Lütfen geçerli bir görsel dosyası yükleyin (JPEG, PNG, GIF, SVG, WebP)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadError('Logo dosyası 5MB\'tan küçük olmalıdır');
            return;
        }

        setUploadError(null);
        setLogoFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        setUploadError(null);
    };

    // Publisher ekleme
    const handleAddPublisher = async () => {
        if (!publisherName.trim()) {
            setError('Yayınevi adı boş olamaz!');
            return;
        }

        // Aynı isimde publisher var mı kontrol et
        if (publishers.some(p => p.name.toLowerCase() === publisherName.toLowerCase())) {
            setError('Bu isimde bir yayınevi zaten mevcut!');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Logo ile birlikte FormData oluştur
            const formData = new FormData();
            formData.append('name', publisherName.trim());

            if (logoFile) {
                formData.append('logo', logoFile);
            }

            // createPublisher metodunu FormData ile çağır
            await createPublisher(formData);

            setSuccess('Yayınevi başarıyla eklendi!');
            setAddDialogOpen(false);
            resetForm();
        } catch (err) {
            console.error('Publisher ekleme hatası:', err);
            setError('Yayınevi eklenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    // Publisher düzenleme
    const handleEditPublisher = async () => {
        if (!selectedPublisher) return;

        if (!publisherName.trim()) {
            setError('Yayınevi adı boş olamaz!');
            return;
        }

        // Aynı isimde başka publisher var mı kontrol et
        if (publishers.some(p => p.id !== selectedPublisher.id && p.name.toLowerCase() === publisherName.toLowerCase())) {
            setError('Bu isimde bir yayınevi zaten mevcut!');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Logo ile birlikte FormData oluştur
            const formData = new FormData();
            formData.append('name', publisherName.trim());
            formData.append('_method', 'PUT'); // Laravel için

            if (logoFile) {
                formData.append('logo', logoFile);
            }

            await updatePublisher(selectedPublisher.id, formData);

            setSuccess('Yayınevi başarıyla güncellendi!');
            setEditDialogOpen(false);
            resetForm();
        } catch (err) {
            console.error('Publisher güncelleme hatası:', err);
            setError('Yayınevi güncellenirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    // Publisher silme
    const handleDeletePublisher = async () => {
        if (!selectedPublisher) return;

        try {
            setLoading(true);
            setError(null);

            await deletePublisher(selectedPublisher.id);

            setSuccess('Yayınevi başarıyla silindi!');
            setDeleteDialogOpen(false);
            resetForm();
        } catch (err) {
            console.error('Publisher silme hatası:', err);
            setError('Yayınevi silinirken bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    // Form temizleme
    const resetForm = () => {
        setPublisherName('');
        setSelectedPublisher(null);
        setLogoFile(null);
        setLogoPreview(null);
        setUploadError(null);
        setError(null);
    };

    // Dialog açma fonksiyonları
    const openAddDialog = () => {
        resetForm();
        setAddDialogOpen(true);
    };

    const openEditDialog = (publisher: Publisher) => {
        setSelectedPublisher(publisher);
        setPublisherName(publisher.name);
        setLogoPreview(publisher.logo_url || null);
        setLogoFile(null);
        setError(null);
        setUploadError(null);
        setEditDialogOpen(true);
    };

    const openDeleteDialog = (publisher: Publisher) => {
        setSelectedPublisher(publisher);
        setError(null);
        setDeleteDialogOpen(true);
    };

    // Dialog kapatma
    const closeDialogs = () => {
        setAddDialogOpen(false);
        setEditDialogOpen(false);
        setDeleteDialogOpen(false);
        resetForm();
    };

    // Enter tuşu ile kaydetme
    const handleKeyPress = (e: React.KeyboardEvent, action: 'add' | 'edit') => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (action === 'add') {
                handleAddPublisher();
            } else {
                handleEditPublisher();
            }
        }
    };

    // Logo render komponenti
    const renderLogoUpload = () => (
        <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Yayınevi Logosu (Opsiyonel)
            </Typography>

            {logoPreview ? (
                <Box sx={{
                    position: 'relative',
                    width: 'fit-content',
                    margin: '0 auto',
                    mb: 2
                }}>
                    <Box
                        component="img"
                        src={logoPreview}
                        alt="Logo önizleme"
                        sx={{
                            maxWidth: '200px',
                            maxHeight: '100px',
                            borderRadius: 1,
                            border: '1px solid #e0e0e0',
                            objectFit: 'contain'
                        }}
                    />
                    <IconButton
                        onClick={handleRemoveLogo}
                        sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            bgcolor: 'rgba(255, 255, 255, 0.8)',
                            '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                            }
                        }}
                        size="small"
                    >
                        <DeleteOutlineIcon fontSize="small" />
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
                    onClick={() => document.getElementById('logo-upload')?.click()}
                >
                    <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <CloudUploadIcon sx={{ fontSize: 32, color: '#666', mb: 1 }} />
                    <Typography variant="body2">
                        Logo yüklemek için tıklayın veya sürükleyin
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Maksimum 5MB (JPEG, PNG, GIF, SVG, WebP)
                    </Typography>
                </Box>
            )}

            {uploadError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                    {uploadError}
                </Alert>
            )}
        </Box>
    );

    return (
        <Box sx={{
            width: '100%',
            px: 2,
            boxSizing: 'border-box'
        }}>
            {/* Başlık */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon color="primary" sx={{ fontSize: 30 }} />
                    <Typography variant="h4" fontWeight="bold">
                        Yayınevi Yönetimi
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openAddDialog}
                    sx={{ py: 1.5, px: 3 }}
                >
                    Yeni Yayınevi
                </Button>
            </Box>

            {/* Arama ve İstatistikler */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Yayınevi Ara"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                            <Chip
                                label={`Toplam: ${publishers.length}`}
                                color="primary"
                                variant="outlined"
                            />
                            <Chip
                                label={`Gösterilen: ${filteredPublishers.length}`}
                                color="secondary"
                                variant="outlined"
                            />
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Mesajlar */}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Publishers Tablosu */}
            <Paper sx={{ borderRadius: 2 }}>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f5f8fa' }}>
                            <TableRow>
                                <TableCell width="10%">#</TableCell>
                                <TableCell width="15%">Logo</TableCell>
                                <TableCell width="55%">Yayınevi Adı</TableCell>
                                <TableCell width="20%" align="center">İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {publishersLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : filteredPublishers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                        {search ? 'Arama kriterinize uygun yayınevi bulunamadı.' : 'Henüz yayınevi eklenmemiş.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPublishers.map((publisher, index) => (
                                    <TableRow key={publisher.id} hover>
                                        <TableCell>
                                            <Chip
                                                label={index + 1}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Avatar
                                                src={publisher.logo_url}
                                                alt={publisher.name}
                                                sx={{
                                                    width: 50,
                                                    height: 50,
                                                    borderRadius: 1,
                                                    bgcolor: publisher.logo_url ? 'transparent' : 'grey.200'
                                                }}
                                                variant="rounded"
                                            >
                                                {!publisher.logo_url && <BusinessIcon />}
                                            </Avatar>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography fontWeight="medium">
                                                    {publisher.name}
                                                </Typography>
                                                {publisher.has_logo && (
                                                    <Chip
                                                        icon={<ImageIcon />}
                                                        label="Logo var"
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                                <Tooltip title="Düzenle">
                                                    <IconButton
                                                        color="primary"
                                                        size="small"
                                                        onClick={() => openEditDialog(publisher)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Sil">
                                                    <IconButton
                                                        color="error"
                                                        size="small"
                                                        onClick={() => openDeleteDialog(publisher)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Floating Action Button - Mobile için */}
            <Fab
                color="primary"
                aria-label="Yeni Yayınevi Ekle"
                onClick={openAddDialog}
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    display: { xs: 'flex', sm: 'none' }
                }}
            >
                <AddIcon />
            </Fab>

            {/* Yayınevi Ekleme Dialog */}
            <Dialog
                open={addDialogOpen}
                onClose={closeDialogs}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon color="primary" />
                        Yeni Yayınevi Ekle
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Yayınevi Adı"
                        fullWidth
                        variant="outlined"
                        value={publisherName}
                        onChange={(e) => setPublisherName(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'add')}
                        error={!!error}
                        helperText={error || "Yayınevi adını girin"}
                        sx={{ mt: 2 }}
                    />
                    {renderLogoUpload()}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={closeDialogs}
                        disabled={loading}
                    >
                        İptal
                    </Button>
                    <Button
                        onClick={handleAddPublisher}
                        variant="contained"
                        disabled={loading || !publisherName.trim()}
                        startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
                    >
                        {loading ? 'Ekleniyor...' : 'Ekle'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Yayınevi Düzenleme Dialog */}
            <Dialog
                open={editDialogOpen}
                onClose={closeDialogs}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EditIcon color="primary" />
                        Yayınevi Düzenle
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Yayınevi Adı"
                        fullWidth
                        variant="outlined"
                        value={publisherName}
                        onChange={(e) => setPublisherName(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'edit')}
                        error={!!error}
                        helperText={error || "Yayınevi adını düzenleyin"}
                        sx={{ mt: 2 }}
                    />
                    {renderLogoUpload()}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={closeDialogs}
                        disabled={loading}
                    >
                        İptal
                    </Button>
                    <Button
                        onClick={handleEditPublisher}
                        variant="contained"
                        disabled={loading || !publisherName.trim()}
                        startIcon={loading ? <CircularProgress size={16} /> : <EditIcon />}
                    >
                        {loading ? 'Güncelleniyor...' : 'Güncelle'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Yayınevi Silme Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={closeDialogs}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DeleteIcon color="error" />
                        Yayınevi Sil
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        {selectedPublisher?.logo_url && (
                            <Avatar
                                src={selectedPublisher.logo_url}
                                alt={selectedPublisher.name}
                                sx={{ width: 60, height: 60, borderRadius: 1 }}
                                variant="rounded"
                            />
                        )}
                        <Box>
                            <Typography>
                                <strong>"{selectedPublisher?.name}"</strong> yayınevini silmek istediğinize emin misiniz?
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Bu işlem geri alınamaz. Logo dosyası da silinecektir. Ancak bu yayınevine ait sorular silinmeyecektir.
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={closeDialogs}
                        disabled={loading}
                    >
                        İptal
                    </Button>
                    <Button
                        onClick={handleDeletePublisher}
                        color="error"
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={16} /> : <DeleteIcon />}
                    >
                        {loading ? 'Siliniyor...' : 'Sil'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PublisherList;