// src/pages/advertisements/Advertisements.tsx
import { useState } from 'react';
import {
    Box, Typography, Paper, Button, TextField,
    FormControlLabel, Alert, Snackbar, CircularProgress,
    IconButton, RadioGroup, Radio, FormControl, FormLabel,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Chip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Tooltip, MenuItem, Select, InputLabel
} from '@mui/material';
import {
    Add as AddIcon,
    Upload as UploadIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    ZoomIn as ZoomInIcon
} from '@mui/icons-material';
import { useAdvertisements } from '../../hooks/useAdvertisement';
import { Advertisement } from '../../services/advertisement.service';
import { useEducationStructure } from '../../hooks/useEducationStructure';

// React DatePicker kullanımı
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import { tr } from 'date-fns/locale';
import './datepicker-custom.css'; // Özel CSS dosyası (oluşturmanız gerekecek)

// Türkçe dil desteği ekleme
registerLocale('tr', tr);
setDefaultLocale('tr');

// Önizleme modalı için tip tanımları
interface PreviewModalProps {
    open: boolean;
    onClose: () => void;
    src: string;
    type: 'image' | 'video' | string;
    title: string;
}

// Önizleme modalı için yeni bileşen
const PreviewModal = ({ open, onClose, src, type, title }: PreviewModalProps) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mt: 2
                }}>
                    {type === 'image' ? (
                        <img
                            src={src}
                            alt={title}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '70vh'
                            }}
                        />
                    ) : (
                        <video
                            src={src}
                            controls
                            style={{
                                maxWidth: '100%',
                                maxHeight: '70vh'
                            }}
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Kapat</Button>
            </DialogActions>
        </Dialog>
    );
};

// MediaPreview bileşeni için tip tanımları
interface MediaPreviewProps {
    advert: Advertisement;
    onClick: (src: string, type: string, title: string) => void;
}

// MediaPreview bileşeni - Küçük önizleme
const MediaPreview = ({ advert, onClick }: MediaPreviewProps) => {
    const isVideo = advert.type === 'video';
    const previewUrl = advert.file_url || (advert.file_path ? `/storage/${advert.file_path}` : null);

    if (!previewUrl) return <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>Görsel Yok</Box>;

    return (
        <Box
            sx={{
                width: '80px',
                height: '45px',
                overflow: 'hidden',
                borderRadius: '4px',
                border: '1px solid #eee',
                position: 'relative',
                cursor: 'pointer',
                '&:hover': {
                    borderColor: 'primary.main',
                    '& .zoom-icon': {
                        opacity: 1
                    }
                }
            }}
            onClick={() => onClick(previewUrl, advert.type, advert.name)}
        >
            {isVideo ? (
                <Box sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f0f0'
                }}>
                    <Typography variant="caption" color="text.secondary">
                        Video
                    </Typography>
                    <Box
                        className="zoom-icon"
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            opacity: 0,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        <ZoomInIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                    </Box>
                </Box>
            ) : (
                <>
                    <img
                        src={previewUrl}
                        alt={advert.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                    <Box
                        className="zoom-icon"
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            opacity: 0,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        <ZoomInIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                    </Box>
                </>
            )}
        </Box>
    );
};

const Advertisements = () => {
    const {
        advertisements,
        loading: adLoading,
        error,
        addAdvertisement,
        updateAdDetails,
        toggleAdvertisementStatus,
        removeAdvertisement,
        isSubmitting
    } = useAdvertisements();

    const {
        grades,
        subjects,
        loading: educationLoading
    } = useEducationStructure();

    const [openDialog, setOpenDialog] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);

    const [adName, setAdName] = useState('');
    const [adType, setAdType] = useState<'image' | 'video'>('image');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [updateFile, setUpdateFile] = useState<File | null>(null); // Yeni eklenen
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [grade, setGrade] = useState('');
    const [subject, setSubject] = useState('');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [duration, setDuration] = useState<number>(5);

    // Önizleme modalı için state
    const [previewModal, setPreviewModal] = useState({
        open: false,
        src: '',
        type: 'image' as 'image' | 'video',
        title: ''
    });

    const handleOpenPreview = (src: string, type: string, title: string) => {
        setPreviewModal({
            open: true,
            src,
            // 'image' ya da 'video' dışında bir tür gelirse varsayılan olarak 'image' kullan
            type: (type === 'video' ? 'video' : 'image') as 'image' | 'video',
            title
        });
    };

    const handleClosePreview = () => {
        setPreviewModal({
            ...previewModal,
            open: false
        });
    };

    const handleOpenDialog = (isEdit = false, ad?: Advertisement) => {
        if (isEdit && ad) {
            setIsEditMode(true);
            setCurrentAd(ad);
            setAdName(ad.name);
            setAdType(ad.type);
            setStartDate(ad.start_date ? new Date(ad.start_date) : null);
            setEndDate(ad.end_date ? new Date(ad.end_date) : null);
            setGrade(ad.grade || '');
            setSubject(ad.subject || '');
            setDuration(ad.duration ?? 5);
        } else {
            setIsEditMode(false);
            setCurrentAd(null);
            resetForm();
            // Yeni reklam ekleme modunda bugünün tarihini varsayılan olarak ayarla
            setStartDate(new Date());
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        resetForm();
    };

    const resetForm = () => {
        setAdName('');
        setAdType('image');
        setSelectedFile(null);
        setUpdateFile(null); // Yeni eklenen
        setStartDate(null);
        setEndDate(null);
        setGrade('');
        setSubject('');
        setIsEditMode(false);
        setCurrentAd(null);
        setDuration(5);
    };

    // Tarihi değiştirme işleyicileri
    const handleStartDateChange = (date: Date | null) => {
        setStartDate(date);

        // Eğer bitiş tarihi varsa ve yeni başlangıç tarihinden önceyse bitiş tarihini sıfırla
        if (date && endDate && date > endDate) {
            setEndDate(null);
        }
    };

    const handleEndDateChange = (date: Date | null) => {
        setEndDate(date);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const isValidFileType = adType === 'image'
                ? file.type.startsWith('image/')
                : file.type.startsWith('video/');
            if (!isValidFileType) {
                alert(`Lütfen geçerli bir ${adType === 'image' ? 'banner' : 'video'} dosyası seçin.`);
                return;
            }

            if (isEditMode) {
                setUpdateFile(file); // Düzenleme modunda updateFile kullan
            } else {
                setSelectedFile(file); // Yeni ekleme modunda selectedFile kullan
            }
        }
    };

    // Tarih formatını değiştiren yardımcı fonksiyon
    const formatDateForServer = (date: Date | null): string | null => {
        if (!date) return null;
        // MySQL uyumlu YYYY-MM-DD formatı
        return date.toISOString().split('T')[0];
    };

    const handleSubmit = async () => {
        if (!adName.trim()) {
            alert('Lütfen bir reklam adı girin.');
            return;
        }

        if (!startDate) {
            alert('Lütfen bir başlangıç tarihi seçin.');
            return;
        }

        // Eğer düzenleme modundaysak
        if (isEditMode && currentAd) {
            // Tip değişmişse dosya zorunlu
            const typeChanged = adType !== currentAd.type;
            if (typeChanged && !updateFile) {
                alert(`Reklam tipi değişti. Lütfen yeni bir ${adType === 'image' ? 'görsel' : 'video'} dosyası seçin.`);
                return;
            }

            const updateData: {
                name: string;
                start_date: string;
                end_date: string | null;
                grade: string | undefined;
                subject: string | undefined;
                duration: number | undefined;
                type?: 'image' | 'video';
                file?: File;
            } = {
                name: adName,
                start_date: formatDateForServer(startDate)!,
                end_date: formatDateForServer(endDate),
                grade: grade || undefined,
                subject: subject || undefined,
                duration: duration ?? undefined
            };

            // Eğer yeni dosya seçildiyse veya tip değişmişse ekle
            if (updateFile) {
                updateData.type = adType;
                updateData.file = updateFile;
            }

            const success = await updateAdDetails(currentAd.id, updateData);

            if (success) {
                setSuccessMessage('Reklam başarıyla güncellendi.');
                handleCloseDialog();
            }
        }
        // Yeni reklam ekleme
        else {
            if (!selectedFile) {
                alert('Lütfen bir dosya seçin.');
                return;
            }

            const success = await addAdvertisement(
                adName,
                adType,
                selectedFile,
                formatDateForServer(startDate)!,
                formatDateForServer(endDate),
                duration,
                grade || undefined,
                subject || undefined,
            );

            if (success) {
                setSuccessMessage('Reklam başarıyla eklendi.');
                handleCloseDialog();
            }
        }
    };

    const handleToggleStatus = async (id: number, currentStatus: boolean) => {
        const success = await toggleAdvertisementStatus(id, !currentStatus);
        if (success) {
            setSuccessMessage(`Reklam ${!currentStatus ? 'aktifleştirildi' : 'deaktif edildi'}.`);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Bu reklamı silmek istediğinizden emin misiniz?')) {
            const success = await removeAdvertisement(id);
            if (success) {
                setSuccessMessage('Reklam başarıyla silindi.');
            }
        }
    };

    const handleCloseSuccessMessage = () => {
        setSuccessMessage(null);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const loading = adLoading || educationLoading;

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{
            width: '100%',
            px: 2,            // Responsive boşluk (varsayılan container gibi)
            boxSizing: 'border-box'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Reklam Yönetimi
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{ py: 1.5, px: 3, bgcolor: '#1a1a27', '&:hover': { bgcolor: '#2a2a37' } }}
                >
                    YENİ REKLAM EKLE
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mt: 2, mb: 4 }}>
                    {error.message}
                </Alert>
            )}

            {advertisements.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <Typography variant="h6" color="text.secondary">
                        Henüz reklam eklenmemiş
                    </Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ mt: 2 }}>
                        İlk Reklamı Ekle
                    </Button>
                </Paper>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 2, overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell width="8%">Önizleme</TableCell>
                                <TableCell width="17%">Reklam Adı</TableCell>
                                <TableCell width="9%">Tür</TableCell>
                                <TableCell width="9%">Durum</TableCell>
                                <TableCell width="10%">Sınıf</TableCell>
                                <TableCell width="10%">Ders</TableCell>
                                <TableCell width="8%">Süre</TableCell>
                                <TableCell width="12%">Başlangıç Tarihi</TableCell>
                                <TableCell width="12%">Bitiş Tarihi</TableCell>
                                <TableCell width="13%" align="right">İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {advertisements.map((ad) => (
                                <TableRow key={ad.id} hover>
                                    <TableCell>
                                        <MediaPreview
                                            advert={ad}
                                            onClick={handleOpenPreview}
                                        />
                                    </TableCell>
                                    <TableCell><Typography>{ad.name}</Typography></TableCell>
                                    <TableCell>
                                        <Chip label={ad.type === 'image' ? 'Banner' : 'Video'} color={ad.type === 'image' ? 'primary' : 'secondary'} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={ad.is_active ? 'Aktif' : 'Pasif'} color={ad.is_active ? 'success' : 'default'} size="small" />
                                    </TableCell>
                                    <TableCell>{ad.grade || '-'}</TableCell>
                                    <TableCell>{ad.subject || '-'}</TableCell>
                                    <TableCell>{ad.duration ? `${ad.duration} sn` : '-'}</TableCell>
                                    <TableCell><Typography variant="body2">{formatDate(ad.start_date)}</Typography></TableCell>
                                    <TableCell><Typography variant="body2">{ad.end_date ? formatDate(ad.end_date) : '-'}</Typography></TableCell>
                                    <TableCell align="right">
                                        <Tooltip title={ad.is_active ? "Devre Dışı Bırak" : "Aktifleştir"}>
                                            <IconButton
                                                color={ad.is_active ? "success" : "default"}
                                                onClick={() => handleToggleStatus(ad.id, ad.is_active)}
                                                size="small"
                                            >
                                                {ad.is_active ? <VisibilityIcon /> : <VisibilityOffIcon />}
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Düzenle">
                                            <IconButton color="primary" onClick={() => handleOpenDialog(true, ad)} size="small">
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Sil">
                                            <IconButton color="error" onClick={() => handleDelete(ad.id)} size="small">
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Reklam Ekleme/Düzenleme Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{isEditMode ? 'Reklamı Düzenle' : 'Yeni Reklam Ekle'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <TextField
                            label="Reklam Adı"
                            fullWidth
                            value={adName}
                            onChange={(e) => setAdName(e.target.value)}
                            margin="normal"
                        />

                        <Box sx={{ mt: 2, mb: 1 }}>
                            <FormLabel component="legend" sx={{ mb: 1 }}>Başlangıç Tarihi</FormLabel>
                            <DatePicker
                                selected={startDate}
                                onChange={handleStartDateChange}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Başlangıç Tarihi"
                                className="custom-datepicker"
                                locale="tr"
                                wrapperClassName="datepicker-wrapper"
                                minDate={new Date()} // Bugünden önceki tarihleri engelle
                                maxDate={endDate || undefined} // Eğer endDate varsa, onu maksimum değer olarak ayarla
                            />
                        </Box>

                        <Box sx={{ mt: 2, mb: 1 }}>
                            <FormLabel component="legend" sx={{ mb: 1 }}>Bitiş Tarihi (Opsiyonel)</FormLabel>
                            <DatePicker
                                selected={endDate}
                                onChange={handleEndDateChange}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Bitiş Tarihi (Opsiyonel)"
                                className="custom-datepicker"
                                locale="tr"
                                wrapperClassName="datepicker-wrapper"
                                minDate={startDate || undefined} // Eğer startDate varsa, onu minimum değer olarak ayarla
                            />
                        </Box>

                        <TextField
                            label="Süre (saniye)"
                            type="number"
                            inputProps={{ min: 1, max: 10 }}
                            fullWidth
                            margin="normal"
                            value={duration} // Artık hiçbir zaman boş olmayacak
                            onChange={(e) => setDuration(Number(e.target.value) || 5)} // Boş değer girilirse 5 kullan
                            helperText="Reklamın gösterim süresi (1-10 saniye arası)"
                        />

                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel id="grade-select-label">Sınıf (Grade)</InputLabel>
                                <Select
                                    labelId="grade-select-label"
                                    id="grade-select"
                                    value={grade}
                                    label="Sınıf (Grade)"
                                    onChange={(e) => setGrade(e.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>Seçiniz</em>
                                    </MenuItem>
                                    {grades.map((g) => (
                                        <MenuItem key={g.id} value={g.name}>
                                            {g.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth>
                                <InputLabel id="subject-select-label">Ders (Subject)</InputLabel>
                                <Select
                                    labelId="subject-select-label"
                                    id="subject-select"
                                    value={subject}
                                    label="Ders (Subject)"
                                    onChange={(e) => setSubject(e.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>Seçiniz</em>
                                    </MenuItem>
                                    {subjects.map((s) => (
                                        <MenuItem key={s.id} value={s.name}>
                                            {s.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* Reklam tipi seçimi - hem yeni ekleme hem düzenleme modunda */}
                        <FormControl component="fieldset" sx={{ mt: 2, mb: 1 }}>
                            <FormLabel component="legend">Reklam Tipi</FormLabel>
                            <RadioGroup
                                row
                                value={adType}
                                onChange={(e) => {
                                    setAdType(e.target.value as 'image' | 'video');
                                    // Tip değiştiğinde mevcut seçili dosyaları temizle
                                    setSelectedFile(null);
                                    setUpdateFile(null);
                                }}
                            >
                                <FormControlLabel value="image" control={<Radio />} label="Banner Reklam" />
                                <FormControlLabel value="video" control={<Radio />} label="Video Reklam" />
                            </RadioGroup>
                        </FormControl>

                        {/* Dosya yükleme alanı - her iki modda da göster */}
                        <Box sx={{ border: '1px dashed #ccc', p: 3, borderRadius: 2, textAlign: 'center', mt: 2 }}>
                            <input
                                accept={adType === 'image' ? "image/*" : "video/*"}
                                style={{ display: 'none' }}
                                id="ad-file-upload"
                                type="file"
                                onChange={handleFileChange}
                            />
                            <label htmlFor="ad-file-upload">
                                <Button variant="outlined" component="span" startIcon={<UploadIcon />}>
                                    {isEditMode
                                        ? `${adType === 'image' ? 'Yeni Görsel' : 'Yeni Video'} Seç`
                                        : `${adType === 'image' ? 'Görsel' : 'Video'} Seç`
                                    }
                                </Button>
                            </label>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {isEditMode ? (
                                    updateFile ? (
                                        <span style={{ color: 'green' }}>Yeni dosya: {updateFile.name}</span>
                                    ) : (
                                        adType !== currentAd?.type ? (
                                            <span style={{ color: 'orange' }}>
                                                Tip değişti: {adType === 'image' ? 'Banner' : 'Video'} dosyası seçin
                                            </span>
                                        ) : (
                                            `Mevcut ${adType === 'image' ? 'görsel' : 'video'} korunacak. Değiştirmek için yeni dosya seçin.`
                                        )
                                    )
                                ) : (
                                    selectedFile ? selectedFile.name : `Lütfen bir ${adType === 'image' ? 'görsel' : 'video'} dosyası seçin.`
                                )}
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="inherit">İptal</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={isSubmitting || (!isEditMode && !selectedFile) || !adName.trim() || !startDate}
                        sx={{ bgcolor: '#1a1a27', '&:hover': { bgcolor: '#2a2a37' } }}
                    >
                        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Önizleme Modalı */}
            <PreviewModal
                open={previewModal.open}
                onClose={handleClosePreview}
                src={previewModal.src}
                type={previewModal.type}
                title={previewModal.title}
            />

            <Snackbar
                open={!!successMessage}
                autoHideDuration={6000}
                onClose={handleCloseSuccessMessage}
                message={successMessage}
            />
        </Box>
    );
};

export default Advertisements;