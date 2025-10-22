// src/pages/user-management/UserAddEdit.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUsers } from '../../hooks/useUsers';
import { useSignup } from '../../hooks/useSignup';


import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    Grid,
    CircularProgress,
    Alert,
    Breadcrumbs,
    Link as MuiLink
} from '@mui/material';
import {
    Save as SaveIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

interface UserFormData {
    name: string;
    email: string;
    password: string;
    role: string;
    publisher: string;
}

const UserAddEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);
    const { getUserById, updateUser } = useUsers();
    const { signup } = useSignup();
    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        publisher: 'Arı Yayıncılık'
    });

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (isEditMode) {
            fetchUserData();
        }
    }, [id]);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const userData = await getUserById(Number(id));
            if (userData) {
                setFormData({
                    name: userData.name,
                    email: userData.email,
                    password: '',
                    role: userData.role,
                    publisher: userData.publisher || 'Arı Yayıncılık'
                });
            } else {
                setError('Kullanıcı bulunamadı.');
            }
        } catch {
            setError('Kullanıcı bilgileri yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const submitData = {
                ...formData,
                // Edit modunda mevcut rolü koru, yeni kullanıcı eklerken admin yap
                role: isEditMode ? formData.role : 'admin'
            };

            if (isEditMode) {
                await updateUser(Number(id), submitData);
                setSuccess('Kullanıcı başarıyla güncellendi!');
            } else {
                await signup(submitData);
                setSuccess('Yeni kullanıcı başarıyla oluşturuldu!');
            }

            setTimeout(() => {
                navigate('/user-management');
            }, 1500);
        } catch {
            setError(isEditMode
                ? 'Kullanıcı güncellenirken bir hata oluştu.'
                : 'Kullanıcı oluşturulurken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Rol label'ını belirle
    const getRoleLabel = () => {
        if (isEditMode) {
            return formData.role === 'admin' ? 'Admin' :
                formData.role === 'editor' ? 'Editör' :
                    formData.role;
        }
        return 'Admin';
    };

    const getRoleHelperText = () => {
        if (isEditMode) {
            return `Mevcut rol: ${getRoleLabel()}`;
        }
        return 'Tüm yeni kullanıcılar admin rolünde oluşturulur';
    };

    return (
        <Box sx={{
            width: '100%',
            px: 3,            // Responsive boşluk (varsayılan container gibi)
            boxSizing: 'border-box'
        }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
                <MuiLink component={Link} to="/user-management" underline="hover" color="inherit">
                    Kullanıcı Yönetimi
                </MuiLink>
                <Typography color="text.primary">
                    {isEditMode ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
                </Typography>
            </Breadcrumbs>

            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
                {isEditMode ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
            </Typography>

            {loading && !isEditMode && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    {success}
                </Alert>
            )}

            {(!loading || isEditMode) && (
                <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid #eee' }}>
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Ad Soyad"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    fullWidth
                                    required
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="E-posta"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    fullWidth
                                    required
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label={isEditMode ? "Şifre (değiştirmek için doldurun)" : "Şifre"}
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    fullWidth
                                    required={!isEditMode}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Rol"
                                    value={getRoleLabel()}
                                    fullWidth
                                    variant="outlined"
                                    disabled
                                    helperText={getRoleHelperText()}
                                    sx={{
                                        '& .MuiInputBase-input.Mui-disabled': {
                                            WebkitTextFillColor: '#666',
                                            backgroundColor: '#f5f5f5'
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sx={{ mt: 2 }}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        startIcon={<SaveIcon />}
                                        disabled={loading}
                                    >
                                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<ArrowBackIcon />}
                                        component={Link}
                                        to="/user-management"
                                    >
                                        İptal
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </form>
                </Paper>
            )}
        </Box>
    );
};

export default UserAddEdit;