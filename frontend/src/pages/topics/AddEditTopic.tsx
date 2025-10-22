import {
    Box,
    Button,
    MenuItem,
    Paper,
    TextField,
    Typography,
    FormControl,
    InputLabel,
    Select,
    SelectChangeEvent,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Chip,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getTopics,
    createTopic,
    updateTopic,
    getUnits,
    getGrades,
    getSubjects,
} from '../../services/education.service';
import { Topic, Unit, Grade, Subject } from '../../types/education';

interface TopicItem {
    id: string; // Geçici ID (yeni eklenenler için)
    name: string;
    isNew: boolean; // Yeni eklenen mi?
}

const AddEditTopic = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    // Tek konu düzenleme için form
    const [form, setForm] = useState({
        name: '',
        unit_id: '',
    });

    // Çoklu konu ekleme için
    const [topics, setTopics] = useState<TopicItem[]>([]);
    const [currentTopicName, setCurrentTopicName] = useState('');

    // Tüm veriler
    const [units, setUnits] = useState<Unit[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // Hiyerarşik seçimler
    const [gradeId, setGradeId] = useState<number | ''>('');
    const [subjectId, setSubjectId] = useState<number | ''>('');
    const [selectedUnitId, setSelectedUnitId] = useState<number | ''>('');

    // Filtrelenmiş ünite listesi
    const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);

    // Loading ve error states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Tüm verileri yükle
        getUnits().then((res) => setUnits(res.data));
        getGrades().then((res) => setGrades(res.data));
        getSubjects().then((res) => setSubjects(res.data));

        if (isEdit) {
            // Düzenleme modu - tek konu
            getTopics().then((res) => {
                const topic = res.data.find((t: Topic) => t.id === Number(id));
                if (topic) {
                    setForm({
                        name: topic.name,
                        unit_id: topic.unit_id.toString(),
                    });

                    // Düzenleme modunda mevcut topic'in unit bilgilerini yükle
                    getUnits().then((unitRes) => {
                        const unit = unitRes.data.find((u) => u.id === topic.unit_id);
                        if (unit) {
                            setGradeId(unit.grade_id);
                            setSubjectId(unit.subject_id);
                            setSelectedUnitId(unit.id);
                        }
                    });
                }
            });
        }
    }, [id, isEdit]);

    // Grade ve Subject değiştiğinde ilgili üniteleri filtrele
    useEffect(() => {
        if (gradeId && subjectId) {
            const filtered = units.filter(
                unit => unit.grade_id === gradeId && unit.subject_id === subjectId
            );
            setFilteredUnits(filtered);

            // Eğer seçili ünite bu filtrelere uygun değilse, seçimi sıfırla
            if (isEdit) {
                if (form.unit_id && !filtered.some(unit => unit.id === Number(form.unit_id))) {
                    setForm(prev => ({ ...prev, unit_id: '' }));
                }
            } else {
                if (selectedUnitId && !filtered.some(unit => unit.id === selectedUnitId)) {
                    setSelectedUnitId('');
                    setTopics([]); // Ünite değiştiğinde konu listesini temizle
                }
            }
        } else {
            setFilteredUnits([]);
            if (isEdit) {
                setForm(prev => ({ ...prev, unit_id: '' }));
            } else {
                setSelectedUnitId('');
                setTopics([]);
            }
        }
    }, [gradeId, subjectId, units, form.unit_id, selectedUnitId, isEdit]);

    // Ünite değiştiğinde konu listesini temizle
    useEffect(() => {
        if (!isEdit) {
            setTopics([]);
        }
    }, [selectedUnitId, isEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleGradeChange = (event: SelectChangeEvent<number | ''>) => {
        setGradeId(event.target.value as number | '');
    };

    const handleSubjectChange = (event: SelectChangeEvent<number | ''>) => {
        setSubjectId(event.target.value as number | '');
    };

    const handleUnitChange = (event: SelectChangeEvent<number | ''>) => {
        if (isEdit) {
            setForm(prev => ({ ...prev, unit_id: event.target.value.toString() }));
        } else {
            setSelectedUnitId(event.target.value as number | '');
        }
    };

    // Yeni konu ekleme
    const handleAddTopic = () => {
        if (!currentTopicName.trim()) return;

        // Aynı isimde konu var mı kontrol et
        if (topics.some(topic => topic.name.toLowerCase() === currentTopicName.toLowerCase())) {
            setError('Bu isimde bir konu zaten eklenmiş!');
            return;
        }

        const newTopic: TopicItem = {
            id: Date.now().toString(), // Geçici ID
            name: currentTopicName.trim(),
            isNew: true
        };

        setTopics(prev => [...prev, newTopic]);
        setCurrentTopicName('');
        setError(null);
    };

    // Konu silme
    const handleRemoveTopic = (topicId: string) => {
        setTopics(prev => prev.filter(topic => topic.id !== topicId));
    };

    // Enter tuşuyla konu ekleme
    const handleTopicKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTopic();
        }
    };

    // Form gönderme
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isEdit) {
                // Tek konu düzenleme
                const payload = {
                    name: form.name,
                    unit_id: Number(form.unit_id),
                };
                await updateTopic(Number(id), payload);
            } else {
                // Çoklu konu ekleme
                if (topics.length === 0) {
                    setError('En az bir konu eklemelisiniz!');
                    setLoading(false);
                    return;
                }

                if (!selectedUnitId) {
                    setError('Lütfen ünite seçin!');
                    setLoading(false);
                    return;
                }

                // Her konu için API çağrısı yap
                for (const topic of topics) {
                    const payload = {
                        name: topic.name,
                        unit_id: Number(selectedUnitId),
                    };
                    await createTopic(payload);
                }
            }

            navigate('/topics');
        } catch (err) {
            console.error('İşlem hatası:', err);
            setError('İşlem sırasında bir hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    // Seçilen ünite bilgisini göster
    const getSelectedUnitInfo = () => {
        if (!selectedUnitId) return null;

        const unit = filteredUnits.find(u => u.id === selectedUnitId);
        const grade = grades.find(g => g.id === gradeId);
        const subject = subjects.find(s => s.id === subjectId);

        if (!unit || !grade || !subject) return null;

        return `${grade.name} - ${subject.name} - ${unit.name}`;
    };

    return (
        <Box sx={{
            width: '100%',
            px: 3,
            boxSizing: 'border-box'
        }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
                {isEdit ? 'Konu Düzenle' : 'Yeni Konu Ekle'}
            </Typography>

            <Paper sx={{ p: 3, maxWidth: 900 }}>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        {/* Hiyerarşik Seçim Alanları */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>
                                Kategori Seçimi
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Sınıf</InputLabel>
                                        <Select
                                            value={gradeId}
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

                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Ders</InputLabel>
                                        <Select
                                            value={subjectId}
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

                                <Grid item xs={12} sm={4}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Ünite</InputLabel>
                                        <Select
                                            value={isEdit ? (Number(form.unit_id) || '') : selectedUnitId}
                                            label="Ünite"
                                            onChange={handleUnitChange}
                                            disabled={!gradeId || !subjectId || filteredUnits.length === 0}
                                            required
                                        >
                                            <MenuItem value="" disabled>Ünite Seçin</MenuItem>
                                            {filteredUnits.map((unit) => (
                                                <MenuItem key={unit.id} value={unit.id}>
                                                    {unit.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Düzenleme Modu - Tek Konu */}
                        {isEdit && (
                            <Grid item xs={12}>
                                <TextField
                                    label="Konu Adı"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                />
                            </Grid>
                        )}

                        {/* Ekleme Modu - Çoklu Konu */}
                        {!isEdit && (
                            <>
                                {/* Seçilen Ünite Bilgisi */}
                                {selectedUnitId && (
                                    <Grid item xs={12}>
                                        <Alert severity="info" sx={{ mb: 2 }}>
                                            <strong>Seçilen Ünite:</strong> {getSelectedUnitInfo()}
                                        </Alert>
                                    </Grid>
                                )}

                                {/* Konu Ekleme Alanı */}
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <TextField
                                            label="Konu Adı"
                                            value={currentTopicName}
                                            onChange={(e) => setCurrentTopicName(e.target.value)}
                                            onKeyPress={handleTopicKeyPress}
                                            placeholder="Konu adını girin ve Ekle'ye basın"
                                            fullWidth
                                            disabled={!selectedUnitId}
                                        />
                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            onClick={handleAddTopic}
                                            disabled={!currentTopicName.trim() || !selectedUnitId}
                                        >
                                            Ekle
                                        </Button>
                                    </Box>
                                </Grid>

                                {/* Eklenen Konular Listesi */}
                                {topics.length > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Eklenecek Konular ({topics.length})
                                        </Typography>
                                        <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                                            <List dense>
                                                {topics.map((topic, index) => (
                                                    <ListItem key={topic.id}>
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Chip
                                                                        label={index + 1}
                                                                        size="small"
                                                                        color="primary"
                                                                    />
                                                                    {topic.name}
                                                                </Box>
                                                            }
                                                        />
                                                        <ListItemSecondaryAction>
                                                            <IconButton
                                                                edge="end"
                                                                onClick={() => handleRemoveTopic(topic.id)}
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
                                (isEdit ? (!form.name || !form.unit_id) : (topics.length === 0 || !selectedUnitId))
                            }
                            startIcon={loading ? undefined : <SaveIcon />}
                        >
                            {loading ? 'Kaydediliyor...' : (isEdit ? 'Güncelle' : `${topics.length} Konu Kaydet`)}
                        </Button>
                        <Button
                            variant="outlined"
                            sx={{ ml: 2 }}
                            onClick={() => navigate('/topics')}
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

export default AddEditTopic;