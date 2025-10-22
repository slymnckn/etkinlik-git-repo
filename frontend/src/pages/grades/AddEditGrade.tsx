import {
    Box,
    Button,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    createGrade,
    getGrades,
    updateGrade,
} from '../../services/education.service';
import { Grade } from '../../types/education';

const AddEditGrade = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [form, setForm] = useState({
        name: '',
    });

    useEffect(() => {
        if (isEditMode) {
            getGrades().then((res) => {
                const grade: Grade | undefined = res.data.find((g: Grade) => g.id === Number(id));
                if (grade) {
                    setForm({ name: grade.name });
                }
            });
        }
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (isEditMode) {
                await updateGrade(Number(id), form);
            } else {
                await createGrade(form);
            }

            navigate('/grades');
        } catch (error) {
            console.error('İşlem sırasında hata:', error);
        }
    };

    return (
        <Box sx={{
            width: '100%',
            px: 3,            // Responsive boşluk (varsayılan container gibi)
            boxSizing: 'border-box'
        }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
                {isEditMode ? 'Sınıf Düzenle' : 'Yeni Sınıf Ekle'}
            </Typography>

            <Paper sx={{ p: 3, maxWidth: 500 }}>
                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Sınıf Adı"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        fullWidth
                        required
                        margin="normal"
                    />

                    <Box mt={2}>
                        <Button type="submit" variant="contained">
                            Kaydet
                        </Button>
                        <Button
                            variant="outlined"
                            sx={{ ml: 2 }}
                            onClick={() => navigate('/grades')}
                        >
                            Vazgeç
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default AddEditGrade;
