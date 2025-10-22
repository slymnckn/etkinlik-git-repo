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
import { getUnits, deleteUnit, getGrades, getSubjects } from '../../services/education.service';
import { Unit, Grade, Subject } from '../../types/education';

const UnitList = () => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const navigate = useNavigate();

    // Filtre state'leri
    const [filters, setFilters] = useState({
        unitName: '',
        gradeId: '',
        subjectId: ''
    });

    const fetchData = async () => {
        try {
            const [unitRes, gradeRes, subjectRes] = await Promise.all([
                getUnits(),
                getGrades(),
                getSubjects(),
            ]);
            setUnits(unitRes.data);
            setFilteredUnits(unitRes.data); // Başlangıçta tüm üniteler
            setGrades(gradeRes.data);
            setSubjects(subjectRes.data);
        } catch (err) {
            console.error('Veriler alınamadı:', err);
        }
    };

    const handleDelete = async (id: number) => {
        const confirm = window.confirm('Bu ünite silinsin mi?');
        if (confirm) {
            await deleteUnit(id);
            fetchData();
        }
    };

    // Filtreleme fonksiyonu
    const applyFilters = () => {
        let filtered = units;

        // Ünite adına göre filtrele
        if (filters.unitName.trim()) {
            filtered = filtered.filter(unit =>
                unit.name.toLowerCase().includes(filters.unitName.toLowerCase().trim())
            );
        }

        // Sınıfa göre filtrele
        if (filters.gradeId) {
            filtered = filtered.filter(unit => unit.grade_id === parseInt(filters.gradeId));
        }

        // Derse göre filtrele
        if (filters.subjectId) {
            filtered = filtered.filter(unit => unit.subject_id === parseInt(filters.subjectId));
        }

        setFilteredUnits(filtered);
    };

    // Filtreleri temizle
    const clearFilters = () => {
        setFilters({
            unitName: '',
            gradeId: '',
            subjectId: ''
        });
        setFilteredUnits(units);
    };

    // Filtre değişikliklerini dinle
    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filtreler değiştiğinde otomatik uygula
    useEffect(() => {
        applyFilters();
    }, [filters, units]);

    const getGradeName = (id: number) => grades.find((g) => g.id === id)?.name || '-';
    const getSubjectName = (id: number) => subjects.find((s) => s.id === id)?.name || '-';

    // Aktif filtre sayısını hesapla
    const activeFilterCount = Object.values(filters).filter(value => value.trim() !== '').length;

    return (
        <Box p={3} sx={{
            width: '100%',
            px: 3,
            boxSizing: 'border-box'
        }}>
            <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h5" fontWeight="bold">Ünite Yönetimi</Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/units/add')}
                >
                    Yeni Ünite Ekle
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
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            label="Ünite Adı"
                            value={filters.unitName}
                            onChange={(e) => handleFilterChange('unitName', e.target.value)}
                            fullWidth
                            size="small"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            placeholder="Ünite adı ara..."
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
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

                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            select
                            label="Ders"
                            value={filters.subjectId}
                            onChange={(e) => handleFilterChange('subjectId', e.target.value)}
                            fullWidth
                            size="small"
                        >
                            <MenuItem value="">Tüm Dersler</MenuItem>
                            {subjects.map((subject) => (
                                <MenuItem key={subject.id} value={subject.id.toString()}>
                                    {subject.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
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
                    Toplam {filteredUnits.length} ünite bulundu
                    {units.length !== filteredUnits.length && ` (${units.length} üniteden filtrelendi)`}
                </Typography>
            </Box>

            {/* Tablo */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Ünite Adı</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Sınıf</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Ders</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>İşlemler</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredUnits.map((unit, index) => (
                            <TableRow key={unit.id} hover>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{unit.name}</TableCell>
                                <TableCell>{getGradeName(unit.grade_id)}</TableCell>
                                <TableCell>{getSubjectName(unit.subject_id)}</TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        color="primary"
                                        onClick={() => navigate(`/units/edit/${unit.id}`)}
                                        size="small"
                                    >
                                        <Edit />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDelete(unit.id)}
                                        size="small"
                                    >
                                        <Delete />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredUnits.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                    <Typography variant="body1" color="text.secondary">
                                        {units.length === 0
                                            ? 'Henüz ünite bulunmamaktadır.'
                                            : 'Filtrelere uygun ünite bulunamadı.'}
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

export default UnitList;