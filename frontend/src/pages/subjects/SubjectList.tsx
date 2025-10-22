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
import { Add, Delete, Edit } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getSubjects, deleteSubject } from '../../services/education.service';
import { Subject } from '../../types/education';
import { useAuth } from '../../hooks/useAuth';

const SubjectList = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const navigate = useNavigate();
    const { userRole } = useAuth();

    const fetchSubjects = async () => {
        try {
            const res = await getSubjects();
            setSubjects(res.data);
        } catch (err) {
            console.error('Dersler alınamadı:', err);
        }
    };

    const handleDelete = async (id: number) => {
        const confirm = window.confirm('Bu dersi silmek istediğinize emin misiniz?');
        if (confirm) {
            await deleteSubject(id);
            fetchSubjects();
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, []);

    return (
        <Box sx={{
            width: '100%',
            px: 3,            // Responsive boşluk (varsayılan container gibi)
            boxSizing: 'border-box'
        }}>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h5" fontWeight="bold">Branş Yönetimi</Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/subjects/add')}
                    sx={{ display: userRole === 'admin' ? 'none' : 'flex' }}
                >
                    Yeni Ders Ekle
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>Ders Adı</TableCell>
                            <TableCell align="right" sx={{ display: userRole === 'admin' ? 'none' : 'table-cell' }}>İşlemler</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {subjects.map((subject, index) => (
                            <TableRow key={subject.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{subject.name}</TableCell>
                                <TableCell align="right" sx={{ display: userRole === 'admin' ? 'none' : 'table-cell' }}>
                                    <IconButton
                                        color="primary"
                                        onClick={() => navigate(`/subjects/edit/${subject.id}`)}
                                    >
                                        <Edit />
                                    </IconButton>
                                    <IconButton color="error" onClick={() => handleDelete(subject.id)}>
                                        <Delete />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {subjects.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={userRole === 'admin' ? 2 : 3} align="center">
                                    Hiç ders bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default SubjectList;
