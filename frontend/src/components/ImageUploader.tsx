// src/components/ImageUploader.tsx
import React, { useState } from 'react';
import {
    Box, Typography, Button, Dialog, DialogTitle, DialogContent, IconButton
} from '@mui/material';
import {
    Upload as UploadIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import ImageSearchPanel from './ImageSearchPanel';

interface ImageUploaderProps {
    imagePath: string | null;
    onImagePathChange: (path: string | null) => void;
    onError: (error: string | null) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ imagePath, onImagePathChange, onError }) => {
    const [openDialog, setOpenDialog] = useState(false);

    // Dialog'u açma
    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    // Dialog'u kapatma
    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    // Görsel seçildiğinde
    const handleImageSelected = (selectedImagePath: string) => {
        onImagePathChange(selectedImagePath);
        onError(null);
        handleCloseDialog();
    };

    // Görsel silme
    const handleRemoveImage = () => {
        onImagePathChange(null);
        onError(null);
    };

    return (
        <Box>
            {/* Görsel Önizleme ve Butonlar */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Soru Resmi (Opsiyonel)
            </Typography>

            {imagePath ? (
                <Box sx={{ mb: 2, position: 'relative', width: 'fit-content' }}>
                    <img
                        src={imagePath}
                        alt="Soru resmi"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                    <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={handleRemoveImage}
                        sx={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            minWidth: '30px',
                            width: '30px',
                            height: '30px',
                            p: 0
                        }}
                    >
                        X
                    </Button>
                </Box>
            ) : (
                <Box sx={{ mb: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={handleOpenDialog}
                        startIcon={<UploadIcon />}
                    >
                        Görsel Ekle
                    </Button>
                </Box>
            )}

            {/* Görsel Arama Dialog'u */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Görsel Ara ve Seç
                    <IconButton
                        onClick={handleCloseDialog}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Aşağıdaki arama kutusunu kullanarak görselleri arayabilirsiniz. 
                        Görsele tıklayarak seçebilirsiniz.
                    </Typography>
                    
                    {/* ImageSearchPanel Component */}
                    <ImageSearchPanel
                        onImageSelected={handleImageSelected}
                        onCancel={handleCloseDialog}
                        initialQuery=""
                    />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default ImageUploader;
