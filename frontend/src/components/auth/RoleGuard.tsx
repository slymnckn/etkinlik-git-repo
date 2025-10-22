// src/components/auth/RoleGuard.tsx
import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { Warning as WarningIcon, Home as HomeIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { getCurrentUserRole, isAuthenticated } from '../../services/auth.service';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: string[];
}

const UnauthorizedPage = () => (
    <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        px: 3
    }}>
        <Paper elevation={0} sx={{
            p: 6,
            textAlign: 'center',
            maxWidth: 500,
            border: '1px solid #e0e0e0',
            borderRadius: 2
        }}>
            <WarningIcon sx={{ fontSize: 64, color: '#ff9800', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
                Yetkisiz Erişim
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
                Bu sayfaya erişim yetkiniz bulunmamaktadır.
                Sadece editör yetkisine sahip kullanıcılar bu bölüme erişebilir.
            </Typography>
            <Button
                variant="contained"
                startIcon={<HomeIcon />}
                component={Link}
                to="/"
                sx={{ py: 1.2, px: 3 }}
            >
                Ana Sayfaya Dön
            </Button>
        </Paper>
    </Box>
);

const LoadingPage = () => (
    <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
    }}>
        <CircularProgress />
    </Box>
);

const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUserRole = async () => {
            try {
                // Kullanıcı giriş yapmamışsa
                if (!isAuthenticated()) {
                    setLoading(false);
                    return;
                }

                const role = await getCurrentUserRole();
                setUserRole(role);
            } catch (error) {
                console.error('Rol kontrolü hatası:', error);
                setUserRole(null);
            } finally {
                setLoading(false);
            }
        };

        checkUserRole();
    }, []);

    // Yükleniyor durumu
    if (loading) {
        return <LoadingPage />;
    }

    // Kullanıcı rolü yoksa login'e yönlendir
    if (!userRole) {
        return <Navigate to="/login" replace />;
    }

    // Kullanıcının rolü izin verilen roller arasında değilse yetkisiz sayfası göster
    if (!allowedRoles.includes(userRole)) {
        return <UnauthorizedPage />;
    }

    return <>{children}</>;
};

export default RoleGuard;