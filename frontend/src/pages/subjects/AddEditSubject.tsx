import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createSubject, getSubjects, updateSubject } from '../../services/education.service';
import { Subject } from '../../types/education';

const AddEditSubject = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [form, setForm] = useState({ name: '' });

    useEffect(() => {
        if (isEdit) {
            getSubjects().then((res) => {
                const subject: Subject | undefined = res.data.find((s: Subject) => s.id === Number(id));
                if (subject) setForm({ name: subject.name });
            });
        }
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (isEdit) {
                await updateSubject(Number(id), form);
            } else {
                await createSubject(form);
            }

            navigate('/subjects');
        } catch (err) {
            console.error('Ders işlemi başarısız:', err);
        }
    };

    return (
        <Box sx={{
            width: '100%',
            px: 3,            // Responsive boşluk (varsayılan container gibi)
            boxSizing: 'border-box'
        }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
                {isEdit ? 'Ders Düzenle' : 'Yeni Ders Ekle'}
            </Typography>

            <Paper sx={{ p: 3, maxWidth: 500 }}>
                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Ders Adı"
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
                            onClick={() => navigate('/subjects')}
                        >
                            Vazgeç
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default AddEditSubject;
