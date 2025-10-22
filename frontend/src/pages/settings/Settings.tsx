// src/pages/settings/Settings.tsx
import { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Paper, Button, TextField,
    Alert, Snackbar, CircularProgress,
    Popover, ClickAwayListener
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useSettings } from '../../hooks/useSettings';
import { Settings as SettingsType } from '../../services/settings.service';
import './settings.css'; // CSS dosyasını ekleyin

// Renk seçicinin çeşitli ön tanımlı renkleri
const predefinedColors = [
    '#1a1a27', '#2c3e50', '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
    '#9b59b6', '#1abc9c', '#34495e', '#16a085', '#27ae60', '#2980b9',
    '#8e44ad', '#f1c40f', '#e67e22', '#d35400', '#c0392b', '#7f8c8d'
];

const Settings = () => {
    const [showSuccess, setShowSuccess] = useState(false);
    const { settings, loading, error, updateSettings, isSubmitting } = useSettings();

    // Form state
    const [appName, setAppName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [themeColor, setThemeColor] = useState('');
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

    // Renk seçici için state ve ref
    const [colorAnchorEl, setColorAnchorEl] = useState<HTMLElement | null>(null);
    const [customColor, setCustomColor] = useState('');
    const logoDropRef = useRef<HTMLDivElement>(null);

    // Renk seçici popover için
    const handleColorClick = (event: React.MouseEvent<HTMLElement>) => {
        setColorAnchorEl(event.currentTarget);
        setCustomColor(themeColor || '#1a1a27');
    };

    const handleColorClose = () => {
        setColorAnchorEl(null);
    };

    const handleColorSelect = (color: string) => {
        setThemeColor(color);
        handleColorClose();
    };

    // Ayarlar yüklendiğinde form state'ini güncelle
    useEffect(() => {
        if (settings) {
            // Genel ayarlar
            setAppName(settings.general?.app_name || '');
            setLogoUrl(settings.general?.logo_url || '');
            setThemeColor(settings.general?.theme_color || '#1a1a27');

            // Eğer kaydedilmiş bir logo dosyası varsa önizleme göster
            if (settings.general?.logo_url) {
                setLogoPreviewUrl(settings.general.logo_url);
            }
        }
    }, [settings]);

    // Logo sürükle-bırak için useEffect
    useEffect(() => {
        const logoDropArea = logoDropRef.current;
        if (logoDropArea) {
            const preventDefault = (e: Event) => {
                e.preventDefault();
                e.stopPropagation();
            };

            const handleLogoDrop = (e: DragEvent) => {
                preventDefault(e);
                logoDropArea.classList.remove('drag-over');

                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];

                    // Dosya tipini kontrol et
                    if (!file.type.startsWith('image/')) {
                        alert(`Lütfen geçerli bir görsel dosyası seçin.`);
                        return;
                    }

                    setSelectedLogoFile(file);
                    const fileURL = URL.createObjectURL(file);
                    setLogoPreviewUrl(fileURL);
                }
            };

            const handleDragOver = (e: DragEvent) => {
                preventDefault(e);
                logoDropArea.classList.add('drag-over');
            };

            const handleDragLeave = (e: DragEvent) => {
                preventDefault(e);
                logoDropArea.classList.remove('drag-over');
            };

            logoDropArea.addEventListener('dragover', handleDragOver);
            logoDropArea.addEventListener('dragleave', handleDragLeave);
            logoDropArea.addEventListener('drop', handleLogoDrop);

            return () => {
                logoDropArea.removeEventListener('dragover', handleDragOver);
                logoDropArea.removeEventListener('dragleave', handleDragLeave);
                logoDropArea.removeEventListener('drop', handleLogoDrop);
            };
        }
    }, []);

    const handleSaveGeneralSettings = async () => {
        const newSettings: Partial<SettingsType> = {
            general: {
                app_name: appName,
                logo_url: logoUrl,
                theme_color: themeColor
            }
        };

        // Eğer yeni bir logo dosyası seçilmişse ekle
        if (selectedLogoFile) {
            newSettings.general!.logo_file = selectedLogoFile;
        }

        const success = await updateSettings(newSettings);
        if (success) {
            setShowSuccess(true);
            setSelectedLogoFile(null);

            // Eğer tema rengi değişti ise sayfayı yenile
            if (settings?.general?.theme_color !== themeColor) {
                setTimeout(() => {
                    window.location.reload();
                }, 1000); // 1 saniye içinde yenile (bildirim görülsün diye)
            }
        }
    };

    const handleUpdateTheme = async () => {
        const newSettings: Partial<SettingsType> = {
            general: {
                theme_color: themeColor,
                app_name: appName,
                logo_url: logoUrl
            }
        };

        const success = await updateSettings(newSettings);
        if (success) {
            setShowSuccess(true);

            // Tema rengi güncellendiğinde sayfayı yenile
            setTimeout(() => {
                window.location.reload();
            }, 1000); // 1 saniye içinde yenile (bildirim görülsün diye)
        }
    };

    const handleCloseSuccessMessage = () => {
        setShowSuccess(false);
    };

    const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];

            // Dosya tipini kontrol et
            if (!file.type.startsWith('image/')) {
                alert(`Lütfen geçerli bir görsel dosyası seçin.`);
                return;
            }

            setSelectedLogoFile(file);

            // Önizleme URL'i oluştur
            const fileURL = URL.createObjectURL(file);
            setLogoPreviewUrl(fileURL);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                Ayarlar yüklenirken bir hata oluştu: {error.message}
            </Alert>
        );
    }

    return (
        <Box sx={{
            width: '100%',
            px: 2,            // Responsive boşluk (varsayılan container gibi)
            boxSizing: 'border-box',
            mx : 'auto'
        }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Genel Ayarlar
            </Typography>

            {/* Logo Yönetimi */}
            <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                    Logo Yönetimi
                </Typography>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Logo Yükle
                    </Typography>
                    <Box
                        ref={logoDropRef}
                        className="drop-zone"
                        sx={{
                            border: '1px dashed #ccc',
                            borderRadius: 1,
                            p: 1,
                            width: '100%',
                            mb: 2,
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <Box sx={{ flexGrow: 1, p: 1 }}>
                            {selectedLogoFile
                                ? selectedLogoFile.name
                                : settings?.general?.logo_url
                                    ? 'Mevcut logo (değiştirmek için sürükleyin veya gözata tıklayın)'
                                    : 'Dosya seçin veya buraya sürükleyin.'}
                        </Box>
                        <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id="logo-file-upload"
                            type="file"
                            onChange={handleLogoFileChange}
                        />
                        <label htmlFor="logo-file-upload">
                            <Button
                                variant="outlined"
                                component="span"
                                size="medium"
                            >
                                Gözat...
                            </Button>
                        </label>
                    </Box>

                    <Typography variant="subtitle1" gutterBottom>
                        Logo Etiketi
                    </Typography>
                    <TextField
                        fullWidth
                        placeholder="Örn: Arı Yayıncılık"
                        variant="outlined"
                        size="small"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    {logoPreviewUrl && (
                        <Box sx={{ mt: 2, mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Önizleme:
                            </Typography>
                            <img
                                src={logoPreviewUrl}
                                alt="Logo önizleme"
                                style={{ maxWidth: '200px', maxHeight: '80px' }}
                            />
                        </Box>
                    )}

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveGeneralSettings}
                        disabled={isSubmitting}
                        size="medium"
                        sx={{ mt: 1, bgcolor: '#38a169', '&:hover': { bgcolor: '#2f855a' } }}
                    >
                        Kaydet
                    </Button>
                </Box>
            </Paper>

            {/* Panel Ayarları */}
            <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                    Panel Ayarları
                </Typography>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Tema Rengi
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box
                            onClick={handleColorClick}
                            sx={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '4px',
                                bgcolor: themeColor || '#1a1a27',
                                border: '1px solid #ccc',
                                cursor: 'pointer',
                                mr: 2
                            }}
                        />

                        <TextField
                            value={themeColor || '#1a1a27'}
                            onChange={(e) => setThemeColor(e.target.value)}
                            placeholder="#RRGGBB"
                            size="small"
                            sx={{ width: '120px', mr: 2 }}
                        />

                        <Popover
                            open={Boolean(colorAnchorEl)}
                            anchorEl={colorAnchorEl}
                            onClose={handleColorClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                            }}
                        >
                            <ClickAwayListener onClickAway={handleColorClose}>
                                <Box sx={{ p: 2, width: '280px' }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Öntanımlı Renkler
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                        {predefinedColors.map((color) => (
                                            <Box
                                                key={color}
                                                onClick={() => handleColorSelect(color)}
                                                sx={{
                                                    width: '30px',
                                                    height: '30px',
                                                    bgcolor: color,
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    border: themeColor === color ? '2px solid black' : '1px solid #ddd',
                                                }}
                                            />
                                        ))}
                                    </Box>

                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Özel Renk
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="color"
                                            value={customColor}
                                            onChange={(e) => setCustomColor(e.target.value)}
                                            style={{
                                                width: '40px',
                                                height: '30px',
                                                padding: 0,
                                                marginRight: '8px'
                                            }}
                                        />
                                        <TextField
                                            value={customColor}
                                            onChange={(e) => setCustomColor(e.target.value)}
                                            size="small"
                                            sx={{ flexGrow: 1 }}
                                        />
                                        <Button
                                            size="small"
                                            sx={{ ml: 1 }}
                                            onClick={() => handleColorSelect(customColor)}
                                        >
                                            Uygula
                                        </Button>
                                    </Box>
                                </Box>
                            </ClickAwayListener>
                        </Popover>
                    </Box>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpdateTheme}
                        disabled={isSubmitting}
                        size="medium"
                        startIcon={<RefreshIcon />}
                        sx={{ mt: 1, bgcolor: '#3182ce', '&:hover': { bgcolor: '#2b6cb0' } }}
                    >
                        Güncelle
                    </Button>
                </Box>
            </Paper>

            <Snackbar
                open={showSuccess}
                autoHideDuration={6000}
                onClose={handleCloseSuccessMessage}
                message="Ayarlar başarıyla kaydedildi"
            />
        </Box>
    );
};

export default Settings;