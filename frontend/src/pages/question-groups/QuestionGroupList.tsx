// src/pages/question-groups/QuestionGroupList.tsx
import { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, TextField, InputAdornment, Table, TableBody,
    TableCell, TableContainer, TableHead, TablePagination, TableRow, Grid,
    CircularProgress, Alert, Select, MenuItem, IconButton, FormControl, InputLabel,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    SelectChangeEvent, Tooltip
} from '@mui/material';
import {
    Add as AddIcon, Search as SearchIcon, Edit as EditIcon, Delete as DeleteIcon,
    Visibility as ViewIcon, ArrowUpward, ArrowDownward, Launch as LaunchIcon,
    Download as DownloadIcon, Build as BuildIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import * as questionGroupService from '../../services/question-group.service';
import * as iframeService from '../../services/iframe.service';
import { useGames } from '../../hooks/useGames';
import { useCategories } from '../../hooks/useCategories';
import { useEducationStructure } from '../../hooks/useEducationStructure';
import { usePublishers } from '../../hooks/usePublishers';

type Timeout = ReturnType<typeof setTimeout>;

const QuestionGroupList = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groups, setGroups] = useState<questionGroupService.QuestionGroup[]>([]);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const [search, setSearch] = useState('');
    const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'qa' | ''>('');
    const [gameId, setGameId] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Publisher filtresi
    const [publisherFilter, setPublisherFilter] = useState<string>('');

    // Eğitim yapısı filtreleri
    const [gradeIdFilter, setGradeIdFilter] = useState<number | ''>('');
    const [subjectIdFilter, setSubjectIdFilter] = useState<number | ''>('');
    const [unitIdFilter, setUnitIdFilter] = useState<number | ''>('');
    const [topicIdFilter, setTopicIdFilter] = useState<number | ''>('');

    // Silme işlemi için dialog state'leri
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [processingIframes, setProcessingIframes] = useState<Set<number>>(new Set());
    const [iframeCheckIntervals, setIframeCheckIntervals] = useState<Map<number, Timeout>>(new Map());

    const { games } = useGames();
    const { categories } = useCategories();
    const { grades, subjects, units, topics } = useEducationStructure();
    const { publishers } = usePublishers();

    // Filtrelenmiş listeler
    const [filteredUnits, setFilteredUnits] = useState<any[]>([]);
    const [filteredTopics, setFilteredTopics] = useState<any[]>([]);

    // İframe URL'ini çıkaran yardımcı fonksiyon
    const extractIframeUrl = (iframeCode: string): string | null => {
        if (!iframeCode) return null;
        const srcMatch = iframeCode.match(/src="([^"]+)"/);
        return srcMatch ? srcMatch[1] : null;
    };

    // İframe URL'ini yeni sekmede aç
    const handleOpenIframeUrl = (group: questionGroupService.QuestionGroup) => {
        if (group.iframe_code) {
            const url = extractIframeUrl(group.iframe_code);
            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        }
    };

    const handleCreateIframe = async (group: questionGroupService.QuestionGroup) => {
        try {
            // Eğer bu grup için zaten bir interval varsa, önce temizle
            const existingInterval = iframeCheckIntervals.get(group.id);
            if (existingInterval) {
                clearInterval(existingInterval);
                setIframeCheckIntervals(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(group.id);
                    return newMap;
                });
            }

            // Bu grup için iframe oluşturma başlatıldığını işaretle
            setProcessingIframes(prev => new Set([...prev, group.id]));

            // Mevcut iframe servisini kullan
            await iframeService.createIframe(group.id, group.game_id);

            // Başarıyla başlatıldığında periyodik kontrol başlat
            const interval = setInterval(async () => {
                try {
                    console.log(`Iframe durumu kontrol ediliyor: ${group.id}`);
                    const status = await iframeService.checkIframeStatus(group.id);

                    if (status.isReady || status.status === 'failed') {
                        console.log(`Iframe tamamlandı: ${group.id}, durum: ${status.status}`);

                        // Önce interval'i temizle
                        clearInterval(interval);
                        console.log(`Interval temizlendi: ${group.id}`);

                        // State'leri güncelle
                        setIframeCheckIntervals(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(group.id);
                            return newMap;
                        });

                        setProcessingIframes(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(group.id);
                            return newSet;
                        });

                        // Son olarak listeyi yenile
                        console.log(`Liste yenileniyor: ${group.id}`);
                        fetchGroups();
                    } else {
                        console.log(`Iframe henüz hazır değil: ${group.id}, durum: ${status.status}`);
                    }
                } catch (err) {
                    console.error('Iframe durumu kontrol hatası:', err);
                    clearInterval(interval);
                    setIframeCheckIntervals(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(group.id);
                        return newMap;
                    });
                    setProcessingIframes(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(group.id);
                        return newSet;
                    });
                }
            }, 10000) as Timeout;

            // Interval'i map'e kaydet
            setIframeCheckIntervals(prev => {
                const newMap = new Map(prev);
                newMap.set(group.id, interval);
                return newMap;
            });

            setError(null);
        } catch (e) {
            console.error('Iframe oluşturma hatası:', e);
            setError('Iframe oluşturulurken bir hata oluştu');

            // Hata durumunda processing state'ini temizle
            setProcessingIframes(prev => {
                const newSet = new Set(prev);
                newSet.delete(group.id);
                return newSet;
            });
        }
    };

    // Grade ve Subject değiştiğinde ilgili üniteleri filtrele
    useEffect(() => {
        if (gradeIdFilter && subjectIdFilter) {
            const filtered = units.filter(
                unit => unit.grade_id === gradeIdFilter && unit.subject_id === subjectIdFilter
            );
            setFilteredUnits(filtered);

            if (unitIdFilter && !filtered.some(unit => unit.id === unitIdFilter)) {
                setUnitIdFilter('');
                setTopicIdFilter('');
            }
        } else {
            setFilteredUnits([]);
            setUnitIdFilter('');
            setTopicIdFilter('');
        }
    }, [gradeIdFilter, subjectIdFilter, units, unitIdFilter]);

    // Unit değiştiğinde ilgili konuları filtrele
    useEffect(() => {
        if (unitIdFilter) {
            const filtered = topics.filter(topic => topic.unit_id === unitIdFilter);
            setFilteredTopics(filtered);

            if (topicIdFilter && !filtered.some(topic => topic.id === topicIdFilter)) {
                setTopicIdFilter('');
            }
        } else {
            setFilteredTopics([]);
            setTopicIdFilter('');
        }
    }, [unitIdFilter, topics, topicIdFilter]);

    // Seçilen filtrelere göre kategori ID'lerini bul
    const getMatchingCategoryIds = (): number[] | null => {
        if (!gradeIdFilter && !subjectIdFilter && !unitIdFilter && !topicIdFilter) {
            return null;
        }

        const matchingCategories = categories.filter(category => {
            const gradeMatch = !gradeIdFilter || category.grade_id === gradeIdFilter;
            const subjectMatch = !subjectIdFilter || category.subject_id === subjectIdFilter;
            const unitMatch = !unitIdFilter || category.unit_id === unitIdFilter;
            const topicMatch = !topicIdFilter || category.topic_id === topicIdFilter;

            return gradeMatch && subjectMatch && unitMatch && topicMatch;
        });

        const categoryIds = matchingCategories.map(category => category.id);
        return categoryIds;
    };

    const getQuestionTypeLabel = (type: string): string => {
        switch (type) {
            case 'multiple_choice':
                return 'Çoktan Seçmeli';
            case 'true_false':
                return 'Doğru-Yanlış';
            case 'qa':
                return 'Klasik';
            default:
                return type;
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [page, rowsPerPage, search, questionType, gameId, publisherFilter, sortField, sortDirection, gradeIdFilter, subjectIdFilter, unitIdFilter, topicIdFilter]);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const matchingCategoryIds = getMatchingCategoryIds();
            const filters: questionGroupService.QuestionGroupFilters = {
                search,
                question_type: questionType || undefined,
                game_id: gameId,
                publisher: publisherFilter || undefined,
                sort_field: sortField,
                sort_direction: sortDirection,
                ...(matchingCategoryIds !== null ? {
                    category_ids: matchingCategoryIds.length > 0 ? matchingCategoryIds : [-1]
                } : {})
            };

            const response = await questionGroupService.getQuestionGroups(page, filters);
            setGroups(response.data);
            setTotalItems(response.total);
        } catch (e) {
            console.error(e);
            setError('Veriler alınamadı');
        }
        setLoading(false);
    };

    const matchingCategoryIds = getMatchingCategoryIds();
    const hasEducationFilter = gradeIdFilter || subjectIdFilter || unitIdFilter || topicIdFilter;

    const handleGradeChange = (event: SelectChangeEvent<number | ''>) => {
        setGradeIdFilter(event.target.value as number | '');
        setPage(1);
    };

    const handleSubjectChange = (event: SelectChangeEvent<number | ''>) => {
        setSubjectIdFilter(event.target.value as number | '');
        setPage(1);
    };

    const handleUnitChange = (event: SelectChangeEvent<number | ''>) => {
        setUnitIdFilter(event.target.value as number | '');
        setPage(1);
    };

    const handleTopicChange = (event: SelectChangeEvent<number | ''>) => {
        setTopicIdFilter(event.target.value as number | '');
        setPage(1);
    };

    const handlePublisherChange = (event: SelectChangeEvent) => {
        setPublisherFilter(event.target.value);
        setPage(1);
    };

    const handleResetFilters = () => {
        setSearch('');
        setQuestionType('');
        setGameId('');
        setPublisherFilter('');
        setGradeIdFilter('');
        setSubjectIdFilter('');
        setUnitIdFilter('');
        setTopicIdFilter('');
        setPage(1);
    };

    const isAnyFilterActive = () => {
        return search ||
            questionType ||
            gameId ||
            publisherFilter ||
            gradeIdFilter ||
            subjectIdFilter ||
            unitIdFilter ||
            topicIdFilter;
    };

    const handleDeleteClick = (groupId: number, event: React.MouseEvent) => {
        event.stopPropagation();
        setGroupToDelete(groupId);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!groupToDelete) return;

        setDeleteLoading(true);
        try {
            await questionGroupService.deleteQuestionGroup(groupToDelete);
            fetchGroups();
            setError(null);
        } catch (e) {
            console.error('Silme hatası:', e);
            setError('Etkinlik silinirken bir hata oluştu');
        } finally {
            setDeleteLoading(false);
            setDeleteDialogOpen(false);
            setGroupToDelete(null);
        }
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field: string) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
    };

    return (
        <Box sx={{
            width: '100%',
            px: 2,
            boxSizing: 'border-box'
        }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>Etkinlikler</Typography>

            {/* Filtreler */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                    {/* Arama */}
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            label="Etkinlik Ara"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>

                    {/* Soru Tipi */}
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Soru Tipi</InputLabel>
                            <Select
                                value={questionType}
                                onChange={(e) => setQuestionType(e.target.value as 'multiple_choice' | 'true_false' | 'qa' | '')}>
                                <MenuItem value="">Tüm Soru Tipleri</MenuItem>
                                <MenuItem value="multiple_choice">Çoktan Seçmeli</MenuItem>
                                <MenuItem value="true_false">Doğru-Yanlış</MenuItem>
                                <MenuItem value="qa">Klasik</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Oyun */}
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Oyun</InputLabel>
                            <Select value={gameId} onChange={(e) => setGameId(e.target.value)}>
                                <MenuItem value="">Tüm Oyunlar</MenuItem>
                                {games.map((game) => (
                                    <MenuItem key={game.id} value={game.id}>{game.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Publisher Filtresi */}
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Yayınevi</InputLabel>
                            <Select
                                value={publisherFilter}
                                label="Yayınevi"
                                onChange={handlePublisherChange}
                                MenuProps={{
                                    PaperProps: {
                                        style: {
                                            maxHeight: 300,
                                            width: 300,
                                            zIndex: 1500
                                        },
                                    },
                                }}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                {publishers.map((publisher) => (
                                    <MenuItem key={publisher.id} value={publisher.name}>
                                        {publisher.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Sınıf */}
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Sınıf</InputLabel>
                            <Select
                                value={gradeIdFilter}
                                label="Sınıf"
                                onChange={handleGradeChange}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                {grades.map(grade => (
                                    <MenuItem key={grade.id} value={grade.id}>{grade.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Ders */}
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Ders</InputLabel>
                            <Select
                                value={subjectIdFilter}
                                label="Ders"
                                onChange={handleSubjectChange}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                {subjects.map(subject => (
                                    <MenuItem key={subject.id} value={subject.id}>{subject.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Ünite */}
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Ünite</InputLabel>
                            <Select
                                value={unitIdFilter}
                                label="Ünite"
                                onChange={handleUnitChange}
                                disabled={!gradeIdFilter || !subjectIdFilter || filteredUnits.length === 0}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                {filteredUnits.map(unit => (
                                    <MenuItem key={unit.id} value={unit.id}>{unit.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Konu */}
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Konu</InputLabel>
                            <Select
                                value={topicIdFilter}
                                label="Konu"
                                onChange={handleTopicChange}
                                disabled={!unitIdFilter || filteredTopics.length === 0}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                {filteredTopics.map(topic => (
                                    <MenuItem key={topic.id} value={topic.id}>{topic.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Butonlar */}
                    <Grid item xs={12} md={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                {isAnyFilterActive() && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleResetFilters}
                                        sx={{ mr: 2 }}
                                    >
                                        Filtreleri Temizle
                                    </Button>
                                )}
                            </Box>
                            <Button
                                component={Link}
                                to="/question-groups/add"
                                variant="contained"
                                startIcon={<AddIcon />}
                            >
                                Yeni Ekle
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Debug bilgileri */}
            {hasEducationFilter && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="caption" color="text.secondary">
                        {matchingCategoryIds && matchingCategoryIds.length > 0 ? (
                            <>
                                Filtrelenen Kategori Sayısı: {matchingCategoryIds.length}
                                {matchingCategoryIds.length <= 5 && ` (ID'ler: ${matchingCategoryIds.join(', ')})`}
                            </>
                        ) : (
                            <span style={{ color: '#f44336' }}>
                                ⚠️ Seçilen filtrelere uygun kategori bulunamadı. Sonuç listesi boş olacak.
                            </span>
                        )}
                    </Typography>
                </Paper>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell onClick={() => handleSort('name')} sx={{ cursor: 'pointer' }}>Etkinlik Adı {getSortIcon('name')}</TableCell>
                                <TableCell onClick={() => handleSort('question_type')} sx={{ cursor: 'pointer' }}>Soru Tipi {getSortIcon('question_type')}</TableCell>
                                <TableCell onClick={() => handleSort('game_id')} sx={{ cursor: 'pointer' }}>Oyun {getSortIcon('game_id')}</TableCell>
                                <TableCell>Soru Sayısı</TableCell>
                                <TableCell>Kategori</TableCell>
                                <TableCell>Yayınevi</TableCell>
                                <TableCell sx={{ minWidth: '180px' }}>İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} align="center"><CircularProgress /></TableCell></TableRow>
                            ) : groups.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center">Kayıt bulunamadı</TableCell></TableRow>
                            ) : (
                                groups.map((group) => (
                                    <TableRow key={group.id}>
                                        <TableCell>{group.name}</TableCell>
                                        <TableCell>{getQuestionTypeLabel(group.question_type)}</TableCell>
                                        <TableCell>{group.game?.name || '-'}</TableCell>
                                        <TableCell>{group.questions_count}</TableCell>
                                        <TableCell>{group.category?.name || '-'}</TableCell>
                                        <TableCell>{group.publisher || '-'}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                {/* Görüntüle */}
                                                <Tooltip title="Detayları Görüntüle">
                                                    <IconButton
                                                        component={Link}
                                                        to={`/question-groups/${group.id}`}
                                                        size="small"
                                                        color="primary"
                                                    >
                                                        <ViewIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>

                                                {/* Düzenle */}
                                                <Tooltip title="Düzenle">
                                                    <IconButton
                                                        component={Link}
                                                        to={`/question-groups/${group.id}/edit`}
                                                        size="small"
                                                        color="primary"
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>

                                                {/* Iframe Durumuna Göre Butonlar */}
                                                {group.iframe_status === 'completed' && group.iframe_code ? (
                                                    // Iframe hazırsa Launch butonu göster
                                                    <Tooltip title="İframe URL'ini Aç">
                                                        <IconButton
                                                            onClick={() => handleOpenIframeUrl(group)}
                                                            size="small"
                                                            color="success"
                                                        >
                                                            <LaunchIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : processingIframes.has(group.id) || group.iframe_status === 'processing' ? (
                                                    // Iframe oluşturuluyorsa loading göster
                                                    <Tooltip title="İframe Oluşturuluyor...">
                                                        <IconButton
                                                            size="small"
                                                            disabled
                                                            color="warning"
                                                        >
                                                            <CircularProgress size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    // Iframe yoksa veya başarısızsa Iframe Oluştur butonu göster
                                                    <Tooltip title="İframe Oluştur">
                                                        <IconButton
                                                            onClick={() => handleCreateIframe(group)}
                                                            size="small"
                                                            color="warning"
                                                            disabled={loading}
                                                        >
                                                            <BuildIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}

                                                {/* Zip İndir - Sadece zip mevcut ise göster */}
                                                {group.zip_url && (
                                                    <Tooltip title="Zip Dosyasını İndir">
                                                        <IconButton
                                                            href={group.zip_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            size="small"
                                                            color="secondary"
                                                            component="a"
                                                        >
                                                            <DownloadIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}

                                                {/* Sil */}
                                                <Tooltip title="Sil">
                                                    <IconButton
                                                        color="error"
                                                        onClick={(e) => handleDeleteClick(group.id, e)}
                                                        size="small"
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={totalItems}
                    page={page - 1}
                    onPageChange={(_, newPage) => setPage(newPage + 1)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(1);
                    }}
                    rowsPerPageOptions={[10]}
                />
            </Paper>

            {/* Silme Onay Dialogu */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Etkinliği Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bu etkinliği silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
                        İptal
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        disabled={deleteLoading}
                    >
                        {deleteLoading ? <CircularProgress size={24} /> : 'Sil'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default QuestionGroupList;