<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'category_id',
        'question_text',
        'question_type',
        'difficulty',
        'image_path',
        'metadata',
        'user_id',
        'publisher', // YENİ: Publisher alanı eklendi
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * Sorunun ait olduğu kategori
     */
    public function category()
    {
        return $this->belongsTo(QuestionCategory::class, 'category_id');
    }

    /**
     * Sorunun cevapları
     */
    public function answers()
    {
        return $this->hasMany(Answer::class);
    }

    /**
     * Sorunun bulunduğu oyunlar
     */
    public function games()
    {
        return $this->belongsToMany(Game::class, 'game_questions')
            ->withPivot('points', 'order', 'category_label', 'special_effects')
            ->withTimestamps();
    }
    
    /**
     * Sorunun bulunduğu soru grupları
     */
    public function questionGroups()
    {
        return $this->belongsToMany(QuestionGroup::class, 'question_group_questions')
            ->withPivot('order')
            ->withTimestamps();
    }

    /**
     * 
    /**
     * Doğru cevap
     */
    public function correctAnswer()
    {
        return $this->answers()->where('is_correct', true)->first();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Belirli kriterlere göre soruları filtreleme
     */
    public function scopeFilter($query, $type = null, $difficulty = null, $category = null)
    {
        if ($type) {
            $query->where('question_type', $type);
        }

        if ($difficulty) {
            $query->where('difficulty', $difficulty);
        }

        if ($category) {
            $query->where('category_id', $category);
        }

        return $query;
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
            $query->where('question_text', 'LIKE', '%' . $filters['search'] . '%');
        }

        // Soru tipi
        if (isset($filters['type']) && !empty($filters['type'])) {
            $query->where('question_type', $filters['type']);
        }

        // Zorluk seviyesi
        if (isset($filters['difficulty']) && !empty($filters['difficulty'])) {
            $query->where('difficulty', $filters['difficulty']);
        }

        // Kullanıcı filtresi
        if (isset($filters['user_id']) && !empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        // YENİ: Publisher filtresi - artık doğrudan questions tablosundan
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