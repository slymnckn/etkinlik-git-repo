// src/components/layout/Layout.tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme, Container } from '@mui/material';
import Header from './Header.tsx';
import Sidebar from './Sidebar.tsx';

const Layout = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <Box sx={{
            display: 'flex',
            minHeight: '100vh',
            width: '100%',
            backgroundColor: 'white'
        }}>
            <Header onMenuToggle={handleDrawerToggle} />

            <Sidebar
                variant={isMobile ? 'temporary' : 'permanent'}
                open={isMobile ? mobileOpen : true}
                onClose={handleDrawerToggle}
            />

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    marginLeft: 0,
                    marginTop: '64px',
                    minHeight: 'calc(100vh - 64px)',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',

                    alignItems: 'stretch',        

                    transition: theme.transitions.create(['margin', 'width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),

                    p: 0,                         
                }}
            >
                <Container maxWidth={false} disableGutters sx={{ width: '100%', height: '100%' }}>
                    <Box sx={{ 
                        width: '100%',
                        height: '100%',
                        p: { xs: 2, sm: 3 },
                        backgroundColor: 'white',
                        borderRadius: 2,
                        boxShadow: '0 0 10px rgba(0,0,0,0.05)'
                    }}>
                        <Outlet />
                    </Box>
                </Container>
            </Box>
        </Box>
    );
};

export default Layout;
