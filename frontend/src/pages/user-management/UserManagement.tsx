// src/pages/user-management/UserManagement.tsx
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    CircularProgress,
    Alert,
    Chip,
    Tooltip
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    Add as AddIcon,
    Person as PersonIcon,
    AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useUsers } from '../../hooks/useUsers';
import { Link } from 'react-router-dom';

const UserManagement: React.FC = () => {
    const { users, loading, error, removeUser } = useUsers();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<number | null>(null);

    const handleDeleteClick = (userId: number) => {
        setUserToDelete(userId);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (userToDelete !== null) {
            await removeUser(userToDelete);
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setUserToDelete(null);
    };

    const getRoleChip = (role: string) => {
        if (role === 'admin') {
            return (
                <Chip
                    icon={<AdminIcon />}
                    label="Admin"
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 'medium' }}
                />
            );
        } else if (role === 'editor') {
            return (
                <Chip
                    icon={<EditIcon />}
                    label="Editör"
                    color="secondary"
                    size="small"
                    sx={{ fontWeight: 'medium' }}
                />
            );
        } else {
            return (
                <Chip
                    icon={<PersonIcon />}
                    label="Kullanıcı"
                    color="default"
                    size="small"
                    sx={{ fontWeight: 'medium' }}
                />
            );
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

    return (
        <Box sx={{
            width: '100%',
            px: 3,            // Responsive boşluk (varsayılan container gibi)
            boxSizing: 'border-box'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 0 }}>
                    Kullanıcı Yönetimi
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    component={Link}
                    to="/user-management/add"
                    sx={{ py: 1.2, px: 3, borderRadius: 1 }}
                >
                    Yeni Kullanıcı Ekle
                </Button>
            </Box>

            <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #eee', overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Ad Soyad</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Rol</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Yayınevi</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Kayıt Tarihi</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        <Typography variant="body1" color="text.secondary">
                                            Henüz kullanıcı bulunmamaktadır.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} hover>
                                        <TableCell>{user.id}</TableCell>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{getRoleChip(user.role)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.publisher || 'Arı Yayıncılık'}
                                                variant="outlined"
                                                size="small"
                                                sx={{
                                                    fontWeight: 'medium',
                                                    backgroundColor: '#f0f8ff',
                                                    borderColor: '#2196f3',
                                                    color: '#1976d2'
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {user.created_at
                                                ? new Date(user.created_at).toLocaleDateString('tr-TR')
                                                : '—'}

                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Tooltip title="Düzenle">
                                                    <IconButton
                                                        component={Link}
                                                        to={`/user-management/edit/${user.id}`}
                                                        size="small"
                                                        color="primary"
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Sil">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteClick(user.id)}
                                                    >
                                                        <DeleteIcon />
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

            {/* Silme Onay Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteCancel}
            >
                <DialogTitle>Kullanıcıyı Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={handleDeleteCancel} color="primary" variant="outlined">
                        İptal
                    </Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
                        Sil
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserManagement;