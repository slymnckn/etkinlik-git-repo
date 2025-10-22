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
    TextField,
    Grid,
    MenuItem,
    InputAdornment,
} from '@mui/material';
import { Add, Delete, Edit, Search, Clear } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {getTopics, deleteTopic, getUnits, getSubjects, getGrades} from '../../services/education.service';
import {Grade, Subject, Topic, Unit} from '../../types/education';

const TopicList = () => {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const navigate = useNavigate();

    // Filtre state'leri
    const [filters, setFilters] = useState({
        topicName: '',
        gradeId: '',
        subjectId: '',
        unitId: ''
    });

    const fetchData = async () => {
        try {
            const [topicRes, unitRes, gradeRes, subjectRes] = await Promise.all([
                getTopics(),
                getUnits(),
                getGrades(),
                getSubjects(),
            ]);

            setTopics(topicRes.data);
            setFilteredTopics(topicRes.data); // Başlangıçta tüm konular
            setUnits(unitRes.data);
            setGrades(gradeRes.data);
            setSubjects(subjectRes.data);
        } catch (err) {
            console.error('Veri çekme hatası:', err);
        }
    };

    const handleDelete = async (id: number) => {
        const confirm = window.confirm('Bu konuyu silmek istediğinizden emin misiniz?');
        if (confirm) {
            await deleteTopic(id);
            fetchData();
        }
    };

    // Filtreleme fonksiyonu
    const applyFilters = () => {
        let filtered = topics;

        // Konu adına göre filtrele
        if (filters.topicName.trim()) {
            filtered = filtered.filter(topic =>
                topic.name.toLowerCase().includes(filters.topicName.toLowerCase().trim())
            );
        }

        // Sınıfa göre filtrele
        if (filters.gradeId) {
            filtered = filtered.filter(topic => {
                const unit = units.find(u => u.id === topic.unit_id);
                return unit?.grade_id === parseInt(filters.gradeId);
            });
        }

        // Derse göre filtrele
        if (filters.subjectId) {
            filtered = filtered.filter(topic => {
                const unit = units.find(u => u.id === topic.unit_id);
                return unit?.subject_id === parseInt(filters.subjectId);
            });
        }

        // Üniteye göre filtrele
        if (filters.unitId) {
            filtered = filtered.filter(topic => topic.unit_id === parseInt(filters.unitId));
        }

        setFilteredTopics(filtered);
    };

    // Filtreleri temizle
    const clearFilters = () => {
        setFilters({
            topicName: '',
            gradeId: '',
            subjectId: '',
            unitId: ''
        });
        setFilteredTopics(topics);
    };

    // Filtre değişikliklerini dinle
    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Sınıf seçildiğinde o sınıfa ait dersleri filtrele
    const getFilteredSubjects = () => {
        if (!filters.gradeId) return subjects;

        const gradeUnits = units.filter(unit => unit.grade_id === parseInt(filters.gradeId));
        const subjectIds = [...new Set(gradeUnits.map(unit => unit.subject_id))];
        return subjects.filter(subject => subjectIds.includes(subject.id));
    };

    // Sınıf ve ders seçildiğinde o kriterlere uygun üniteleri filtrele
    const getFilteredUnits = () => {
        let filteredUnits = units;

        if (filters.gradeId) {
            filteredUnits = filteredUnits.filter(unit => unit.grade_id === parseInt(filters.gradeId));
        }

        if (filters.subjectId) {
            filteredUnits = filteredUnits.filter(unit => unit.subject_id === parseInt(filters.subjectId));
        }

        return filteredUnits;
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filtreler değiştiğinde otomatik uygula
    useEffect(() => {
        applyFilters();
    }, [filters, topics, units]);

    // Sınıf değiştiğinde ders ve ünite filtrelerini temizle
    useEffect(() => {
        if (filters.gradeId) {
            setFilters(prev => ({
                ...prev,
                subjectId: '',
                unitId: ''
            }));
        }
    }, [filters.gradeId]);

    // Ders değiştiğinde ünite filtresini temizle
    useEffect(() => {
        if (filters.subjectId) {
            setFilters(prev => ({
                ...prev,
                unitId: ''
            }));
        }
    }, [filters.subjectId]);

    // Aktif filtre sayısını hesapla
    const activeFilterCount = Object.values(filters).filter(value => value.trim() !== '').length;

    return (
        <Box sx={{
            width: '100%',
            px: 3,
            boxSizing: 'border-box'
        }}>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h5" fontWeight="bold">Konu Yönetimi</Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/topics/add')}
                >
                    Yeni Konu Ekle
                </Button>
            </Box>

            {/* Filtreleme Alanı */}
            <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #eee', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
                    Filtreler
                    {activeFilterCount > 0 && (
                        <Typography component="span" sx={{ ml: 1, fontSize: '0.875rem', color: 'primary.main' }}>
                            ({activeFilterCount} aktif filtre)
                        </Typography>
                    )}
                </Typography>

                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={2.4}>
                        <TextField
                            label="Konu Adı"
                            value={filters.topicName}
                            onChange={(e) => handleFilterChange('topicName', e.target.value)}
                            fullWidth
                            size="small"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            placeholder="Konu adı ara..."
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <TextField
                            select
                            label="Sınıf"
                            value={filters.gradeId}
                            onChange={(e) => handleFilterChange('gradeId', e.target.value)}
                            fullWidth
                            size="small"
                        >
                            <MenuItem value="">Tüm Sınıflar</MenuItem>
                            {grades.map((grade) => (
                                <MenuItem key={grade.id} value={grade.id.toString()}>
                                    {grade.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <TextField
                            select
                            label="Ders"
                            value={filters.subjectId}
                            onChange={(e) => handleFilterChange('subjectId', e.target.value)}
                            fullWidth
                            size="small"
                            disabled={!filters.gradeId}
                        >
                            <MenuItem value="">Tüm Dersler</MenuItem>
                            {getFilteredSubjects().map((subject) => (
                                <MenuItem key={subject.id} value={subject.id.toString()}>
                                    {subject.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <TextField
                            select
                            label="Ünite"
                            value={filters.unitId}
                            onChange={(e) => handleFilterChange('unitId', e.target.value)}
                            fullWidth
                            size="small"
                            disabled={!filters.gradeId}
                        >
                            <MenuItem value="">Tüm Üniteler</MenuItem>
                            {getFilteredUnits().map((unit) => (
                                <MenuItem key={unit.id} value={unit.id.toString()}>
                                    {unit.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.4}>
                        <Button
                            variant="outlined"
                            startIcon={<Clear />}
                            onClick={clearFilters}
                            disabled={activeFilterCount === 0}
                            fullWidth
                            sx={{ height: '40px' }}
                        >
                            Filtreleri Temizle
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Sonuç Bilgisi */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Toplam {filteredTopics.length} konu bulundu
                    {topics.length !== filteredTopics.length && ` (${topics.length} konudan filtrelendi)`}
                </Typography>
            </Box>

            {/* Tablo */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Konu Adı</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Ünite</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Sınıf</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Ders</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>İşlemler</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredTopics.map((topic) => {
                            const unit = units.find((u) => u.id === topic.unit_id);
                            const grade = grades.find((g) => g.id === unit?.grade_id);
                            const subject = subjects.find((s) => s.id === unit?.subject_id);

                            return (
                                <TableRow key={topic.id} hover>
                                    <TableCell>{topic.name}</TableCell>
                                    <TableCell>{unit?.name || '-'}</TableCell>
                                    <TableCell>{grade?.name || '-'}</TableCell>
                                    <TableCell>{subject?.name || '-'}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            color="primary"
                                            onClick={() => navigate(`/topics/edit/${topic.id}`)}
                                            size="small"
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDelete(topic.id)}
                                            size="small"
                                        >
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filteredTopics.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                    <Typography variant="body1" color="text.secondary">
                                        {topics.length === 0
                                            ? 'Henüz konu bulunmamaktadır.'
                                            : 'Filtrelere uygun konu bulunamadı.'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default TopicList;