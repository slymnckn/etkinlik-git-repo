import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { Delete, Edit, Add } from '@mui/icons-material';
import { getGrades, deleteGrade } from '../../services/education.service';
import { useNavigate } from 'react-router-dom';
import { Grade } from '../../types/education';
import { useAuth } from '../../hooks/useAuth';

const GradeList = () => {
    const [grades, setGrades] = useState<Grade[]>([]);
    const navigate = useNavigate();
    const { userRole } = useAuth();

    const fetchGrades = async () => {
        try {
            const res = await getGrades();
            setGrades(res.data);
        } catch (error) {
            console.error('Sınıflar yüklenirken hata:', error);
        }
    };

    const handleDelete = async (id: number) => {
        const confirm = window.confirm('Bu sınıfı silmek istediğinize emin misiniz?');
        if (confirm) {
            await deleteGrade(id);
            fetchGrades();
        }
    };

    useEffect(() => {
        fetchGrades();
    }, []);

    return (
        <Box sx={{
            width: '100%',
            px: 3,            // Responsive boşluk (varsayılan container gibi)
            boxSizing: 'border-box'
        }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight="bold">
                    Sınıf Yönetimi
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/grades/add')}
                    sx={{ display: userRole === 'admin' ? 'none' : 'flex' }}
                >
                    Yeni Sınıf Ekle
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>Sınıf Adı</TableCell>
                            <TableCell align="right" sx={{ display: userRole === 'admin' ? 'none' : 'table-cell' }}>İşlemler</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {grades.map((grade,index) => (
                            <TableRow key={grade.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{grade.name}</TableCell>
                                <TableCell align="right" sx={{ display: userRole === 'admin' ? 'none' : 'table-cell' }}>
                                    <IconButton
                                        color="primary"
                                        onClick={() => navigate(`/grades/edit/${grade.id}`)}
                                    >
                                        <Edit />
                                    </IconButton>
                                    <IconButton color="error" onClick={() => handleDelete(grade.id)}>
                                        <Delete />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}

                        {grades.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={userRole === 'admin' ? 2 : 3} align="center">
                                    Hiç sınıf bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default GradeList;
