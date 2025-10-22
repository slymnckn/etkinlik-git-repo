import {
    Box, Button, MenuItem, Paper, TextField, Typography,
    FormControl, InputLabel, Select, SelectChangeEvent, Grid,
    IconButton, List, ListItem, ListItemText, ListItemSecondaryAction,
    Chip, Alert
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    createUnit,
    getUnits,
    getGrades,
    getSubjects,
    updateUnit,
} from '../../services/education.service';
import { Grade, Subject, Unit } from '../../types/education';

interface UnitItem {
    id: string; // Geçici ID (yeni eklenenler için)
    name: string;
    isNew: boolean; // Yeni eklenen mi?
}

const AddEditUnit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    // Tek ünite düzenleme için form
    const [form, setForm] = useState({
        name: '',
        grade_id: '',
        subject_id: '',
    });

    // Çoklu ünite ekleme için
    const [units, setUnits] = useState<UnitItem[]>([]);
    const [currentUnitName, setCurrentUnitName] = useState('');

    // Tüm veriler
    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // Hiyerarşik seçimler
    const [selectedGradeId, setSelectedGradeId] = useState<number | ''>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');

    // Loading ve error states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getGrades().then((res) => setGrades(res.data));
        getSubjects().then((res) => setSubjects(res.data));

        if (isEdit) {
            // Düzenleme modu - tek ünite
            getUnits().then((res) => {
                const unit = res.data.find((u: Unit) => u.id === Number(id));
                if (unit) {
                    setForm({
                        name: unit.name,
                        grade_id: unit.grade_id.toString(),
                        subject_id: unit.subject_id.toString(),
                    });

                    // Düzenleme modunda seçili grade ve subject'i ayarla
                    setSelectedGradeId(unit.grade_id);
                    setSelectedSubjectId(unit.subject_id);
                }
            });
        }
    }, [id, isEdit]);

    // Grade veya Subject değiştiğinde ünite listesini temizle
    useEffect(() => {
        if (!isEdit) {
            setUnits([]);
        }
    }, [selectedGradeId, selectedSubjectId, isEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleGradeChange = (event: SelectChangeEvent<number | ''>) => {
        if (isEdit) {
            setForm(prev => ({ ...prev, grade_id: event.target.value.toString() }));
        } else {
            setSelectedGradeId(event.target.value as number | '');
        }
    };

    const handleSubjectChange = (event: SelectChangeEvent<number | ''>) => {
        if (isEdit) {
            setForm(prev => ({ ...prev, subject_id: event.target.value.toString() }));
        } else {
            setSelectedSubjectId(event.target.value as number | '');
        }
    };

    // Yeni ünite ekleme
    const handleAddUnit = () => {
        if (!currentUnitName.trim()) return;

        // Aynı isimde ünite var mı kontrol et
        if (units.some(unit => unit.name.toLowerCase() === currentUnitName.toLowerCase())) {
            setError('Bu isimde bir ünite zaten eklenmiş!');
            return;
        }

        const newUnit: UnitItem = {
            id: Date.now().toString(), // Geçici ID
            name: currentUnitName.trim(),
            isNew: true
        };

        setUnits(prev => [...prev, newUnit]);
        setCurrentUnitName('');
        setError(null);
    };

    // Ünite silme
    const handleRemoveUnit = (unitId: string) => {
        setUnits(prev => prev.filter(unit => unit.id !== unitId));
    };

    // Enter tuşuyla ünite ekleme
    const handleUnitKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddUnit();
        }
    };

    // Form gönderme
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isEdit) {
                // Tek ünite düzenleme
                const payload = {
                    name: form.name,
                    grade_id: Number(form.grade_id),
                    subject_id: Number(form.subject_id),
                };
                await updateUnit(Number(id), payload);
            } else {
                // Çoklu ünite ekleme
                if (units.length === 0) {
                    setError('En az bir ünite eklemelisiniz!');
                    setLoading(false);
                    return;
                }

                if (!selectedGradeId || !selectedSubjectId) {
                    setError('Lütfen sınıf ve ders seçin!');
                    setLoading(false);
                    return;
                }

                // Her ünite için API çağrısı yap
                for (const unit of units) {
                    const payload = {
                        name: unit.name,
                        grade_id: Number(selectedGradeId),
                        subject_id: Number(selectedSubjectId),
                    };
                    await createUnit(payload);
                }
            }

            navigate('/units');
        } catch (err) {
            console.error('İşlem hatası:', err);
            setError('İşlem sırasında bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    // Seçilen sınıf ve ders bilgisini göster
    const getSelectedInfo = () => {
        if (!selectedGradeId || !selectedSubjectId) return null;

        const grade = grades.find(g => g.id === selectedGradeId);
        const subject = subjects.find(s => s.id === selectedSubjectId);

        if (!grade || !subject) return null;

        return `${grade.name} - ${subject.name}`;
    };

    return (
        <Box sx={{
            width: '100%',
            px: 3,
            boxSizing: 'border-box'
        }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
                {isEdit ? 'Ünite Düzenle' : 'Yeni Ünite Ekle'}
            </Typography>

            <Paper sx={{ p: 3, maxWidth: 800 }}>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        {/* Sınıf ve Ders Seçimi */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>
                                Kategori Seçimi
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Sınıf</InputLabel>
                                        <Select
                                            value={isEdit ? (Number(form.grade_id) || '') : selectedGradeId}
                                            label="Sınıf"
                                            onChange={handleGradeChange}
                                            required
                                        >
                                            <MenuItem value="" disabled>Sınıf Seçin</MenuItem>
                                            {grades.map((grade) => (
                                                <MenuItem key={grade.id} value={grade.id}>
                                                    {grade.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Ders</InputLabel>
                                        <Select
                                            value={isEdit ? (Number(form.subject_id) || '') : selectedSubjectId}
                                            label="Ders"
                                            onChange={handleSubjectChange}
                                            required
                                        >
                                            <MenuItem value="" disabled>Ders Seçin</MenuItem>
                                            {subjects.map((subject) => (
                                                <MenuItem key={subject.id} value={subject.id}>
                                                    {subject.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Düzenleme Modu - Tek Ünite */}
                        {isEdit && (
                            <Grid item xs={12}>
                                <TextField
                                    label="Ünite Adı"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                />
                            </Grid>
                        )}

                        {/* Ekleme Modu - Çoklu Ünite */}
                        {!isEdit && (
                            <>
                                {/* Seçilen Sınıf ve Ders Bilgisi */}
                                {selectedGradeId && selectedSubjectId && (
                                    <Grid item xs={12}>
                                        <Alert severity="info" sx={{ mb: 2 }}>
                                            <strong>Seçilen Kategori:</strong> {getSelectedInfo()}
                                        </Alert>
                                    </Grid>
                                )}

                                {/* Ünite Ekleme Alanı */}
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <TextField
                                            label="Ünite Adı"
                                            value={currentUnitName}
                                            onChange={(e) => setCurrentUnitName(e.target.value)}
                                            onKeyPress={handleUnitKeyPress}
                                            placeholder="Ünite adını girin ve Ekle'ye basın"
                                            fullWidth
                                            disabled={!selectedGradeId || !selectedSubjectId}
                                        />
                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            onClick={handleAddUnit}
                                            disabled={!currentUnitName.trim() || !selectedGradeId || !selectedSubjectId}
                                        >
                                            Ekle
                                        </Button>
                                    </Box>
                                </Grid>

                                {/* Eklenen Üniteler Listesi */}
                                {units.length > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Eklenecek Üniteler ({units.length})
                                        </Typography>
                                        <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                                            <List dense>
                                                {units.map((unit, index) => (
                                                    <ListItem key={unit.id}>
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Chip
                                                                        label={index + 1}
                                                                        size="small"
                                                                        color="primary"
                                                                    />
                                                                    {unit.name}
                                                                </Box>
                                                            }
                                                        />
                                                        <ListItemSecondaryAction>
                                                            <IconButton
                                                                edge="end"
                                                                onClick={() => handleRemoveUnit(unit.id)}
                                                                color="error"
                                                                size="small"
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </ListItemSecondaryAction>
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Paper>
                                    </Grid>
                                )}
                            </>
                        )}

                        {/* Hata Mesajı */}
                        {error && (
                            <Grid item xs={12}>
                                <Alert severity="error">
                                    {error}
                                </Alert>
                            </Grid>
                        )}
                    </Grid>

                    <Box mt={3}>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={
                                loading ||
                                (isEdit
                                    ? (!form.name || !form.grade_id || !form.subject_id)
                                    : (units.length === 0 || !selectedGradeId || !selectedSubjectId))
                            }
                            startIcon={loading ? undefined : <SaveIcon />}
                        >
                            {loading ? 'Kaydediliyor...' : (isEdit ? 'Güncelle' : `${units.length} Ünite Kaydet`)}
                        </Button>
                        <Button
                            variant="outlined"
                            sx={{ ml: 2 }}
                            onClick={() => navigate('/units')}
                            disabled={loading}
                        >
                            Vazgeç
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default AddEditUnit;