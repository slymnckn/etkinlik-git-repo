<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class QuestionGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'question_type',
        'game_id',
        'category_id',
        'created_by',
        'publisher', // YENİ: Publisher alanı eklendi
        'image_path', 
        'iframe_url',
        'iframe_code',
        'iframe_status',
        'zip_url',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'image_url',
        'logo_url',
    ];

    /**
     * Model oluşturulurken benzersiz kod üret
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($group) {
            // Eğer kod belirtilmemişse, otomatik üret
            if (!$group->code) {
                $group->code = self::generateUniqueCode();
            }
        });
    }

    /**
     * Benzersiz kod üretme
     */
    public static function generateUniqueCode()
    {
        $code = Str::random(8); // 8 karakterlik rastgele bir kod

        // Kod benzersiz olana kadar yeni kodlar üretmeye devam et
        while (self::where('code', $code)->exists()) {
            $code = Str::random(8);
        }

        return $code;
    }

    /**
     * Görsel URL'sini döndüren erişimci
     *
     * @return string|null
     */
    public function getImageUrlAttribute()
    {
        if (!$this->image_path) {
            return null;
        }

        // Eğer image_path zaten tam bir URL ise
        if (filter_var($this->image_path, FILTER_VALIDATE_URL)) {
            return $this->image_path;
        }

        // Eğer image_path 'public/' ile başlıyorsa
        if (strpos($this->image_path, 'public/') === 0) {
            return Storage::url(str_replace('public/', '', $this->image_path));
        }

        // Değilse normal yolla URL oluştur
        return Storage::url($this->image_path);
    }

    /**
     * Publisher logo URL'sini döndüren erişimci
     *
     * @return string|null
     */
    public function getLogoUrlAttribute()
    {
        if (!$this->publisher) {
            return null;
        }

        // Publisher modelinden logo_url'i al
        $publisher = \App\Models\Publisher::where('name', $this->publisher)->first();
        
        return $publisher ? $publisher->logo_url : null;
    }

    /**
     * Oyun ilişkisi
     */
    public function game()
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * Kategori ilişkisi
     */
    public function category()
    {
        return $this->belongsTo(QuestionCategory::class, 'category_id');
    }

    /**
     * Oluşturan kullanıcı ilişkisi
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Sorular ilişkisi
     */
    public function questions()
    {
        return $this->belongsToMany(Question::class, 'question_group_questions')
            ->withPivot('order')
            ->withTimestamps()
            ->orderBy('order');
    }

    /**
     * İframe durumunu kontrol et
     */
    public function isIframeReady()
    {
        return $this->iframe_status === 'completed';
    }

    /**
     * İframe durumu için insan tarafından okunabilir metin
     */
    public function getIframeStatusTextAttribute()
    {
        return [
            'pending' => 'Henüz Oluşturulmadı',
            'processing' => 'Oluşturuluyor...',
            'completed' => 'Hazır',
            'failed' => 'Hata Oluştu'
        ][$this->iframe_status] ?? 'Bilinmiyor';
    }

    /**
     * YENİ: Publisher filtresi için scope
     */
    public function scopeByPublisher($query, $publisher)
    {
        if (!empty($publisher)) {
            return $query->where('publisher', $publisher);
        }
        
        return $query;
    }

    /**
     * YENİ: Çoklu kategori filtresi için scope
     */
    public function scopeByCategories($query, $categoryIds)
    {
        if (is_array($categoryIds) && !empty($categoryIds)) {
            return $query->whereIn('category_id', $categoryIds);
        }
        
        return $query;
    }

    /**
     * YENİ: Eğitim yapısı filtresi için scope
     */
    public function scopeByEducationStructure($query, $gradeId = null, $subjectId = null, $unitId = null, $topicId = null)
    {
        if ($gradeId || $subjectId || $unitId || $topicId) {
            $query->whereHas('category', function($q) use ($gradeId, $subjectId, $unitId, $topicId) {
                if ($gradeId) {
                    $q->where('grade_id', $gradeId);
                }
                if ($subjectId) {
                    $q->where('subject_id', $subjectId);
                }
                if ($unitId) {
                    $q->where('unit_id', $unitId);
                }
                if ($topicId) {
                    $q->where('topic_id', $topicId);
                }
            });
        }
        
        return $query;
    }

    /**
     * YENİ: Gelişmiş filtreleme scope'u - tüm filtreleri birleştirir
     */
    public function scopeAdvancedFilter($query, array $filters)
    {
        // Arama
        if (isset($filters['search']) && !empty($filters['search'])) {
            $query->where('name', 'LIKE', '%' . $filters['search'] . '%');
        }

        // Soru tipi
        if (isset($filters['question_type']) && !empty($filters['question_type'])) {
            $query->where('question_type', $filters['question_type']);
        }

        // Oyun filtresi
        if (isset($filters['game_id']) && !empty($filters['game_id'])) {
            $query->where('game_id', $filters['game_id']);
        }

        // YENİ: Publisher filtresi - artık doğrudan question_groups tablosundan
        if (isset($filters['publisher']) && !empty($filters['publisher'])) {
            $query->where('publisher', $filters['publisher']);
        }

        // Çoklu kategori desteği
        if (isset($filters['category_ids']) && is_array($filters['category_ids']) && !empty($filters['category_ids'])) {
            $query->whereIn('category_id', $filters['category_ids']);
        } elseif (isset($filters['category_id']) && !empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        // Eğitim yapısı filtreleri
        $educationFilters = [
            'grade_id' => $filters['grade_id'] ?? null,
            'subject_id' => $filters['subject_id'] ?? null,
            'unit_id' => $filters['unit_id'] ?? null,
            'topic_id' => $filters['topic_id'] ?? null,
        ];

        $hasEducationFilter = array_filter($educationFilters);
        
        if (!empty($hasEducationFilter)) {
            $query->whereHas('category', function($q) use ($educationFilters) {
                foreach ($educationFilters as $key => $value) {
                    if ($value) {
                        $q->where($key, $value);
                    }
                }
            });
        }

        return $query;
    }

    /**
     * YENİ: Oyun ve soru tipine göre uygun soruları getiren scope
     */
    public function scopeEligibleQuestions($query, $gameId, $questionType, array $filters = [])
    {
        $query->with(['category'])
            ->where('question_type', $questionType)
            ->whereHas('games', function ($q) use ($gameId) {
                $q->where('games.id', $gameId);
            });

        // Kategori filtreleri
        if (!empty($filters['category_ids'])) {
            $query->whereIn('category_id', $filters['category_ids']);
        } elseif (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        // Eğitim yapısı filtreleri
        if (!empty($filters['grade_id'])) {
            $query->whereHas('category', function($q) use ($filters) {
                $q->where('grade_id', $filters['grade_id']);
            });
        }

        if (!empty($filters['subject_id'])) {
            $query->whereHas('category', function($q) use ($filters) {
                $q->where('subject_id', $filters['subject_id']);
            });
        }

        if (!empty($filters['unit_id'])) {
            $query->whereHas('category', function($q) use ($filters) {
                $q->where('unit_id', $filters['unit_id']);
            });
        }

        if (!empty($filters['topic_id'])) {
            $query->whereHas('category', function($q) use ($filters) {
                $q->where('topic_id', $filters['topic_id']);
            });
        }

        return $query;
    }

    /**
     * YENİ: Publisher'ları getir
     */
    public static function getDistinctPublishers()
    {
        return self::select('publisher')
            ->whereNotNull('publisher')
            ->where('publisher', '!=', '')
            ->groupBy('publisher')
            ->selectRaw('publisher, COUNT(*) as count')
            ->orderBy('publisher')
            ->get();
    }
}