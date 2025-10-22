import { Link, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography,
    Collapse,
} from '@mui/material';
import {
    Home as HomeIcon,
    QuestionAnswer as QuestionIcon,
    Games as GameIcon,
    Settings as SettingsIcon,
    Campaign as CampaignIcon,
    LibraryBooks as LibraryBooksIcon,
    Category as CategoryIcon,
    People as PeopleIcon,
    Business as BusinessIcon, // Publisher iconu için eklendi
    ExpandLess,
    ExpandMore,
    School as GradeIcon,
    MenuBook as SubjectIcon,
    ViewModule as UnitIcon,
    Description as TopicIcon,
    List as ListIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../hooks/useSettings';
import { useEffect, useState } from 'react';

interface SidebarProps {
    open: boolean;
    onClose: () => void;
    variant: 'permanent' | 'persistent' | 'temporary';
}

const Sidebar = ({ open, onClose, variant }: SidebarProps) => {
    const location = useLocation();
    const drawerWidth = 240;
    const { isAuthenticated } = useAuth();
    const { settings } = useSettings();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [openCategoryMenu, setOpenCategoryMenu] = useState(false);

    // Tema rengini al
    const themeColor = settings?.general?.theme_color || '#1a1a27';

    // Tema renginden biraz daha koyu renk oluştur (başlık arkaplanı için)
    const getDarkerColor = (color: string): string => {
        // Hex rengi RGB değerlerine dönüştür
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        // Rengi %10 karartma işlemi
        const darkerR = Math.max(0, Math.floor(r * 0.9));
        const darkerG = Math.max(0, Math.floor(g * 0.9));
        const darkerB = Math.max(0, Math.floor(b * 0.9));

        // RGB değerlerini hex'e geri dönüştür
        return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
    };

    // Rengin koyuluğunu kontrol et ve yazı rengi için belirle (açık renk için koyu yazı, koyu renk için açık yazı)
    const isColorDark = (color: string): boolean => {
        // Hex rengi RGB değerlerine dönüştür
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        // Parlaklık formülü (YIQ denklemi): https://www.w3.org/TR/AERT/#color-contrast
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        // 128'den büyük ise açık renk, küçük ise koyu renk
        return brightness < 128;
    };

    const headerBgColor = getDarkerColor(themeColor);
    const isDark = isColorDark(themeColor);

    // Renk durumuna göre uygun yazı renkleri
    const textColor = isDark ? '#ffffff' : '#333333';
    const iconColor = isDark ? '#ffffff' : '#444444';
    const selectedBgColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
    const hoverBgColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)';
    const subMenuTextColor = isDark ? '#e0e0e0' : '#444444';

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        setUserRole(role);
    }, [isAuthenticated]);

    // Editor için menü öğeleri
    const editorMenuItems = [
        //{ text: 'Ana Sayfa', icon: <HomeIcon />, path: '/' },
        { text: 'Kullanıcı Yönetimi', icon: <PeopleIcon />, path: '/user-management' },
        { text: 'Yayınevi Yönetimi', icon: <BusinessIcon />, path: '/publishers' }, // Editor için Publisher
    ];

    // Normal kullanıcılar için menü öğeleri
    const normalUserMenuItems = [
        { text: 'Ana Sayfa', icon: <HomeIcon />, path: '/' },
        { text: 'Soru Yönetimi', icon: <QuestionIcon />, path: '/questions' },
        { text: 'Oyun Yönetimi', icon: <GameIcon />, path: '/games' },
        { text: 'Etkinlik Yönetimi', icon: <LibraryBooksIcon />, path: '/question-groups' },
        { text: 'Yayınevi Yönetimi', icon: <BusinessIcon />, path: '/publishers' }, // Normal kullanıcılar için Publisher
        { text: 'Reklam Yönetimi', icon: <CampaignIcon />, path: '/advertisements' },
        { text: 'Ayarlar', icon: <SettingsIcon />, path: '/settings' },
    ];

    const menuItemsToRender = userRole === 'editor' ? editorMenuItems : normalUserMenuItems;

    return (
        <Drawer
            variant={variant}
            open={open}
            onClose={onClose}
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    backgroundColor: themeColor, // Tema rengini burada kullan
                    color: textColor, // Dinamik yazı rengi
                },
            }}
        >
            <Box sx={{ p: 2, backgroundColor: headerBgColor }}>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    ARI YAYINCILIK
                </Typography>
            </Box>
            <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

            <List>
                {/* Menü öğelerini render et */}
                {menuItemsToRender.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={Link}
                            to={item.path}
                            selected={location.pathname === item.path}
                            sx={{
                                color: textColor,
                                '&.Mui-selected': {
                                    backgroundColor: selectedBgColor,
                                    color: textColor,
                                    fontWeight: 'bold',
                                    '&:hover': {
                                        backgroundColor: selectedBgColor,
                                    },
                                },
                                '&:hover': {
                                    backgroundColor: hoverBgColor,
                                },
                            }}
                        >
                            <ListItemIcon sx={{ color: iconColor }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}

                {/* Kategoriler Menüsü - Sadece normal kullanıcılar için */}
                {userRole !== 'editor' && (
                    <>
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={() => setOpenCategoryMenu(!openCategoryMenu)}
                                selected={location.pathname.startsWith('/categories')}
                                sx={{
                                    color: textColor,
                                    '&.Mui-selected': {
                                        backgroundColor: selectedBgColor,
                                        color: textColor,
                                        fontWeight: 'bold',
                                        '&:hover': {
                                            backgroundColor: selectedBgColor,
                                        },
                                    },
                                    '&:hover': {
                                        backgroundColor: hoverBgColor,
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ color: iconColor }}>
                                    <CategoryIcon />
                                </ListItemIcon>
                                <ListItemText primary="Kategoriler" />
                                {openCategoryMenu ? <ExpandLess sx={{ color: iconColor }} /> : <ExpandMore sx={{ color: iconColor }} />}
                            </ListItemButton>
                        </ListItem>

                        <Collapse in={openCategoryMenu} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding sx={{
                                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                                borderRadius: 1,
                                mx: 1
                            }}>
                                <ListItemButton
                                    component={Link}
                                    to="/categories"
                                    selected={location.pathname === '/categories'}
                                    sx={{
                                        pl: 4,
                                        color: subMenuTextColor,
                                        '&.Mui-selected': {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                            color: textColor,
                                            fontWeight: 'bold',
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ color: iconColor }}>
                                        <ListIcon />
                                    </ListItemIcon>
                                    <ListItemText primary="Kategori Listesi" />
                                </ListItemButton>

                                <ListItemButton
                                    component={Link}
                                    to="/subjects"
                                    selected={location.pathname === '/subjects'}
                                    sx={{
                                        pl: 4,
                                        color: subMenuTextColor,
                                        '&.Mui-selected': {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                            color: textColor,
                                            fontWeight: 'bold',
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ color: iconColor }}>
                                        <SubjectIcon />
                                    </ListItemIcon>
                                    <ListItemText primary="Branşlar" />
                                </ListItemButton>

                                <ListItemButton
                                    component={Link}
                                    to="/grades"
                                    selected={location.pathname === '/grades'}
                                    sx={{
                                        pl: 4,
                                        color: subMenuTextColor,
                                        '&.Mui-selected': {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                            color: textColor,
                                            fontWeight: 'bold',
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ color: iconColor }}>
                                        <GradeIcon />
                                    </ListItemIcon>
                                    <ListItemText primary="Sınıflar" />
                                </ListItemButton>

                                <ListItemButton
                                    component={Link}
                                    to="/units"
                                    selected={location.pathname === '/units'}
                                    sx={{
                                        pl: 4,
                                        color: subMenuTextColor,
                                        '&.Mui-selected': {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                            color: textColor,
                                            fontWeight: 'bold',
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ color: iconColor }}>
                                        <UnitIcon />
                                    </ListItemIcon>
                                    <ListItemText primary="Üniteler" />
                                </ListItemButton>

                                <ListItemButton
                                    component={Link}
                                    to="/topics"
                                    selected={location.pathname === '/topics'}
                                    sx={{
                                        pl: 4,
                                        color: subMenuTextColor,
                                        '&.Mui-selected': {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                            color: textColor,
                                            fontWeight: 'bold',
                                        },
                                    }}
                                >
                                    <ListItemIcon sx={{ color: iconColor }}>
                                        <TopicIcon />
                                    </ListItemIcon>
                                    <ListItemText primary="Konular" />
                                </ListItemButton>
                            </List>
                        </Collapse>
                    </>
                )}
            </List>
        </Drawer>
    );
};

export default Sidebar;