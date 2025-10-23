<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Answer;
use App\Models\User;
use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class QuestionController extends Controller
{
    /**
     * Display a listing of questions.
     */
    public function index(Request $request)
    {
        $query = Question::with(['category', 'answers', 'user:id,name,email']);

        // Arama
        if ($request->filled('search')) {
            $query->where('question_text', 'LIKE', '%' . $request->input('search') . '%');
        }

        // Soru tipi
        if ($request->filled('type')) {
            $query->where('question_type', $request->input('type'));
        }

        // Zorluk seviyesi
        if ($request->filled('difficulty')) {
            $query->where('difficulty', $request->input('difficulty'));
        }

        // Kullanıcı filtresi
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }
        
        // YENİ: Yayınevi filtresi - artık doğrudan questions tablosundan
        if ($request->filled('publisher')) {
            $query->where('publisher', $request->input('publisher'));
        }

        // Kategori filtreleri - YENİ: Çoklu kategori desteği
        if ($request->filled('category_ids')) {
            $categoryIds = $request->input('category_ids');
            if (is_array($categoryIds) && !empty($categoryIds)) {
                // Eğer [-1] gönderildiyse, hiçbir sonuç döndürme
                if (count($categoryIds) === 1 && $categoryIds[0] === -1) {
                    $query->whereRaw('1 = 0'); // Hiçbir sonuç döndürmeyen koşul
                } else {
                    $query->whereIn('category_id', $categoryIds);
                }
        } }elseif ($request->filled('category_id')) {
            // Geriye dönük uyumluluk için tek kategori desteği
            $query->where('category_id', $request->input('category_id'));
        }

        // Eğitim yapısı filtreleri - kategori ilişkisinden gelenler
        if ($request->filled('grade_id')) {
            $query->whereHas('category', function($q) use ($request) {
                $q->where('grade_id', $request->input('grade_id'));
            });
        }

        if ($request->filled('subject_id')) {
            $query->whereHas('category', function($q) use ($request) {
                $q->where('subject_id', $request->input('subject_id'));
            });
        }

        if ($request->filled('unit_id')) {
            $query->whereHas('category', function($q) use ($request) {
                $q->where('unit_id', $request->input('unit_id'));
            });
        }

        if ($request->filled('topic_id')) {
            $query->whereHas('category', function($q) use ($request) {
                $q->where('topic_id', $request->input('topic_id'));
            });
        }

        // Eski filtreler - geriye dönük uyumluluk için korundu
        if ($request->has('grade')) {
            $query->whereHas('category', fn($q) =>
            $q->where('grade', $request->input('grade'))
            );
        }

        if ($request->has('subject')) {
            $query->whereHas('category', fn($q) =>
            $q->where('subject', $request->input('subject'))
            );
        }

        if ($request->has('unit')) {
            $query->whereHas('category', fn($q) =>
            $q->where('unit', $request->input('unit'))
            );
        }

        if ($request->has('konu')) {
            $query->whereHas('category', fn($q) =>
            $q->where('description', 'LIKE', '%' . $request->input('konu') . '%')
            );
        }

        // Sayfa başına gösterilecek sonuç sayısı
        $perPage = $request->input('per_page', 10);

        // Sonuçları getir
        $questions = $query->latest()->paginate($perPage);

        return response()->json($questions);
    }

    /**
     * Store a newly created question.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:question_categories,id',
            'question_text' => 'required|string',
            'question_type' => 'required|in:multiple_choice,true_false,qa',
            'difficulty' => 'required|in:easy,medium,hard',
            'image_path' => 'nullable|string',
            'metadata' => 'nullable|array',
            'publisher' => 'nullable|string|max:255', // YENİ: Publisher validation
            'answers' => 'required|array|min:1',
            'answers.*.answer_text' => 'required|string',
            'answers.*.is_correct' => 'required|boolean',
            'answers.*.image_path' => 'nullable|string',
        ]);

        // Oturum açmış kullanıcının ID'sini al
        $userId = Auth::id();

        // Create the question with user_id and publisher
        $question = Question::create([
            'category_id' => $validated['category_id'],
            'question_text' => $validated['question_text'],
            'question_type' => $validated['question_type'],
            'difficulty' => $validated['difficulty'],
            'image_path' => $validated['image_path'] ?? null,
            'metadata' => $validated['metadata'] ?? null,
            'user_id' => $userId, // Kullanıcı ID'sini ekle
            'publisher' => $validated['publisher'] ?? null, // YENİ: Publisher eklendi
        ]);

        // Create the answers
        foreach ($validated['answers'] as $answerData) {
            Answer::create([
                'question_id' => $question->id,
                'answer_text' => $answerData['answer_text'],
                'is_correct' => $answerData['is_correct'],
                'image_path' => $answerData['image_path'] ?? null,
            ]);
        }

        // Return the question with relations
        return response()->json(
            Question::with(['category', 'answers', 'user:id,name,email'])->find($question->id),
            201
        );
    }

    /**
     * Display the specified question.
     */
    public function show(Question $question)
    {
        $question->load(['category', 'answers', 'user:id,name,email']);
        return response()->json($question);
    }

    /**
     * Update the specified question.
     */
    public function update(Request $request, Question $question)
    {
        $validated = $request->validate([
            'category_id' => 'sometimes|required|exists:question_categories,id',
            'question_text' => 'sometimes|required|string',
            'question_type' => 'sometimes|required|in:multiple_choice,true_false,qa',
            'difficulty' => 'sometimes|required|in:easy,medium,hard',
            'image_path' => 'nullable|string',
            'metadata' => 'nullable|array',
            'publisher' => 'nullable|string|max:255', // YENİ: Publisher validation
            'answers' => 'sometimes|required|array|min:1',
            'answers.*.id' => 'nullable|exists:answers,id',
            'answers.*.answer_text' => 'required|string',
            'answers.*.is_correct' => 'required|boolean',
            'answers.*.image_path' => 'nullable|string',
        ]);

        // Update data array'ini oluştur
        $updateData = [];
        
        if (isset($validated['category_id'])) {
            $updateData['category_id'] = $validated['category_id'];
        }
        if (isset($validated['question_text'])) {
            $updateData['question_text'] = $validated['question_text'];
        }
        if (isset($validated['question_type'])) {
            $updateData['question_type'] = $validated['question_type'];
        }
        if (isset($validated['difficulty'])) {
            $updateData['difficulty'] = $validated['difficulty'];
        }
        if (isset($validated['metadata'])) {
            $updateData['metadata'] = $validated['metadata'];
        }
        
        // YENİ: Publisher güncellemesi
        if (array_key_exists('publisher', $validated)) {
            $updateData['publisher'] = $validated['publisher'];
        }
        
        // ÖNEMLİ: image_path için isset kullan - bu sayede null değeri bile olsa güncellenir
        if (array_key_exists('image_path', $validated)) {
            $updateData['image_path'] = $validated['image_path'];
        }
        
        $question->update($updateData);

        // Update answers if provided
        if (isset($validated['answers'])) {
            // Get existing answer IDs
            $existingAnswerIds = $question->answers->pluck('id')->toArray();
            $newAnswerIds = [];

            foreach ($validated['answers'] as $answerData) {
                if (isset($answerData['id'])) {
                    // Update existing answer
                    $answer = Answer::find($answerData['id']);
                    $answer->update([
                        'answer_text' => $answerData['answer_text'],
                        'is_correct' => $answerData['is_correct'],
                        'image_path' => $answerData['image_path'] ?? $answer->image_path,
                    ]);
                    $newAnswerIds[] = $answer->id;
                } else {
                    // Create new answer
                    $answer = Answer::create([
                        'question_id' => $question->id,
                        'answer_text' => $answerData['answer_text'],
                        'is_correct' => $answerData['is_correct'],
                        'image_path' => $answerData['image_path'] ?? null,
                    ]);
                    $newAnswerIds[] = $answer->id;
                }
            }

            // Delete answers that are not in the new set
            $answersToDelete = array_diff($existingAnswerIds, $newAnswerIds);
            if (!empty($answersToDelete)) {
                Answer::whereIn('id', $answersToDelete)->delete();
            }
        }

        // Return the updated question
        $question->load(['category', 'answers', 'user:id,name,email']);
        return response()->json($question);
    }

    /**
     * Remove the specified question.
     */
    public function destroy(Question $question)
    {
        // Sadece admin veya soruyu oluşturan kullanıcı soruyu silebilir
        $currentUserId = Auth::id();
        if (!Auth::user()->isAdmin() && $question->user_id !== $currentUserId) {
            return response()->json([
                'message' => 'You are not authorized to delete this question'
            ], 403);
        }


        // Check if the question is used in any question group
        if ($question->questionGroups()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete question used in question groups'
            ], 400);
        }

        // Delete the question (answers will be cascade deleted)
        $question->delete();

        return response()->json(null, 204);
    }

    /**
     * Filter questions by various criteria.
     */
    public function filter(Request $request)
    {
        $query = Question::with(['category', 'answers', 'user:id,name,email']);

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('question_text', 'LIKE', "%{$search}%");
        }

        if ($request->has('type')) {
            $query->where('question_type', $request->input('type'));
        }

        if ($request->has('difficulty')) {
            $query->where('difficulty', $request->input('difficulty'));
        }

        // YENİ: Çoklu kategori desteği filter endpoint'inde de
        if ($request->filled('category_ids')) {
            $categoryIds = $request->input('category_ids');
            if (is_array($categoryIds) && !empty($categoryIds)) {
                $query->whereIn('category_id', $categoryIds);
            }
        } elseif ($request->has('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        // YENİ: Publisher filtresi - artık doğrudan questions tablosundan
        if ($request->filled('publisher')) {
            $query->where('publisher', $request->input('publisher'));
        }

        // Eğitim yapısı filtreleri
        if ($request->filled('grade_id')) {
            $query->whereHas('category', function($q) use ($request) {
                $q->where('grade_id', $request->input('grade_id'));
            });
        }

        if ($request->filled('subject_id')) {
            $query->whereHas('category', function($q) use ($request) {
                $q->where('subject_id', $request->input('subject_id'));
            });
        }

        if ($request->filled('unit_id')) {
            $query->whereHas('category', function($q) use ($request) {
                $q->where('unit_id', $request->input('unit_id'));
            });
        }

        if ($request->filled('topic_id')) {
            $query->whereHas('category', function($q) use ($request) {
                $q->where('topic_id', $request->input('topic_id'));
            });
        }

        // Eski filtreler - geriye dönük uyumluluk
        if ($request->has('grade')) {
            $query->whereHas('category', fn($q) =>
            $q->where('grade', $request->input('grade'))
            );
        }

        if ($request->has('subject')) {
            $query->whereHas('category', fn($q) =>
            $q->where('subject', $request->input('subject'))
            );
        }

        if ($request->has('unit')) {
            $query->whereHas('category', fn($q) =>
            $q->where('unit', $request->input('unit'))
            );
        }

        if ($request->has('konu')) {
            $query->whereHas('category', fn($q) =>
            $q->where('description', 'LIKE', '%' . $request->input('konu') . '%')
            );
        }

        $perPage = $request->input('per_page', 10);
        $questions = $query->latest()->paginate($perPage);

        return response()->json($questions);
    }

    /**
     * Get questions created by the authenticated user.
     */
    public function myQuestions(Request $request)
    {
        $userId = Auth::id();
        $perPage = $request->input('per_page', 10);

        $questions = Question::with(['category', 'answers'])
            ->where('user_id', $userId)
            ->latest()
            ->paginate($perPage);

        return response()->json($questions);
    }

    /**
     * Upload question image.
     */
    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:2048', // 2MB max
        ]);

        $path = $request->file('image')->store('questions', 'public');
        // Storage::url() zaten APP_URL ile tam URL döndürür
        $url = Storage::url($path);

        return response()->json(['url' => $url]);
    }
    
    /**
     * Upload base64 image (for copy-paste functionality)
     */
    public function uploadBase64Image(Request $request)
    {
        $request->validate([
            'image_data' => 'required|string',
        ]);
        
        // Base64 formatındaki görseli decode et
        $imageData = $request->input('image_data');
        
        // Base64 veriyi temizle (data:image/png;base64, kısmını kaldır)
        $imageData = preg_replace('#^data:image/\w+;base64,#i', '', $imageData);
        
        // Geçerli bir base64 veri mi kontrol et
        if (!base64_decode($imageData, true)) {
            return response()->json([
                'message' => 'Invalid base64 image data'
            ], 400);
        }
        
        // Base64'ten dosyaya çevir
        $imageContent = base64_decode($imageData);
        
        // Dosya boyutu kontrolü (2MB)
        if (strlen($imageContent) > 2 * 1024 * 1024) {
            return response()->json([
                'message' => 'Image size must be less than 2MB'
            ], 400);
        }
        
        // Rastgele dosya adı oluştur
        $fileName = 'question_' . Str::random(10) . '.png';
        
        // Dosyayı kaydet
        Storage::disk('public')->put('questions/' . $fileName, $imageContent);
        
        $url = Storage::url('questions/' . $fileName);
        
        return response()->json(['url' => $url]);
    }
    
    /**
     * Search images from Pixabay API
     */
    public function searchImages(Request $request)
    {
        $request->validate([
            'query' => 'required|string|max:100',
            'page' => 'nullable|integer|min:1',
        ]);
        
        // Freepik API anahtarı
        $apiKey = env('FREEPIK_API_KEY');
        
        if (!$apiKey) {
            return response()->json([
                'message' => 'Freepik API anahtarı yapılandırılmamış'
            ], 500);
        }
        
        $query = trim($request->input('query'));
        $page = $request->input('page', 1);

        // Boş sorgu kontrolü
        if (empty($query)) {
            return response()->json([
                'message' => 'Arama sorgusu boş olamaz'
            ], 400);
        }

        // NOT: Görsel arama için yapılan iyileştirmeler kaldırıldı.
        // Kullanıcının girdiği arama terimi doğrudan Freepik API'ye iletilecek.

        // Freepik API'de sayfalama - Web sitesindeki gibi daha fazla sonuç
        $perPage = 48; // Freepik web sitesi gibi sayfa başına daha fazla sonuç
        
        try {
            // Arama parametrelerini loglayalım
            Log::info('Freepik Image Search Request', [
                'query' => $query,
                'page' => $page,
                'per_page' => $perPage,
            ]);
            
            // Freepik API çağrısı - Web sitesindeki gibi geniş sonuçlar için sadece temel parametreler
            $response = Http::withOptions([
                'verify' => false,  // SSL doğrulamasını kapat (production'da KULLANMA!)
            ])->withHeaders([
                'x-freepik-api-key' => $apiKey,
                'Accept-Language' => 'tr-TR',
            ])->get('https://api.freepik.com/v1/resources', [
                'term' => $query,
                'page' => $page,
                'limit' => $perPage,
                'order' => 'relevance', // Alakalılığa göre sırala (Freepik web sitesi gibi)
                'locale' => 'tr-TR' // Türkçe dil desteği
            ]);
            
            if ($response->failed()) {
                Log::error('Freepik API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return response()->json([
                    'message' => 'Freepik\'ten görsel arama sırasında hata oluştu'
                ], 500);
            }
            
            $data = $response->json();
            
            // Sonuçları loglayalım
            Log::info('Freepik Image Search Response', [
                'total' => $data['meta']['total'] ?? 0,
                'current_page' => $data['meta']['current_page'] ?? 0,
                'result_count' => isset($data['data']) ? count($data['data']) : 0
            ]);
            
            // API sonuçları kontrol
            if (!isset($data['data']) || empty($data['data'])) {
                return response()->json([
                    'total' => 0,
                    'images' => [],
                ]);
            }
            
            // Freepik API'den gelen görselleri formatlama
            $images = collect($data['data'])->map(function ($item) {
                // Görsel URL'sini bul (preview veya source)
                $previewUrl = $item['image']['source']['url'] ?? null;
                $largeUrl = $item['image']['source']['url'] ?? null;
                
                // Eğer thumbnail varsa onu kullan
                if (isset($item['thumbnails']) && !empty($item['thumbnails'])) {
                    foreach ($item['thumbnails'] as $thumb) {
                        if ($thumb['width'] <= 300) {
                            $previewUrl = $thumb['url'];
                            break;
                        }
                    }
                }
                
                return [
                    'id' => $item['id'],
                    'preview_url' => $previewUrl,
                    'web_format_url' => $largeUrl,
                    'large_image_url' => $largeUrl,
                    'source' => 'Freepik',
                    'title' => $item['title'] ?? '',
                ];
            })->filter(function ($item) {
                // En az bir URL mevcut olmalı (preview veya web)
                return !empty($item['preview_url']) || !empty($item['web_format_url']);
            })->values();
            
            return response()->json([
                'total' => $data['meta']['total'] ?? count($images),
                'images' => $images,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in searchImages', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Görsel arama sırasında bir hata oluştu'
            ], 500);
        }
    }
    
    /**
     * Download image from external URL and save to server
     */
    public function saveExternalImage(Request $request)
    {
        $request->validate([
            'image_url' => 'required|url',
        ]);
        
        $imageUrl = $request->input('image_url');
        
        try {
            // URL'den görseli indir (SSL doğrulamasız - development için)
            $response = Http::withOptions([
                'verify' => false,
            ])->timeout(10)->get($imageUrl);
            
            if ($response->failed()) {
                return response()->json([
                    'message' => 'URL\'den görsel indirilirken hata oluştu'
                ], 400);
            }
            
            $imageContent = $response->body();
            
            // Dosya boyutu kontrolü (2MB)
            if (strlen($imageContent) > 2 * 1024 * 1024) {
                return response()->json([
                    'message' => 'Görsel boyutu 2MB\'dan küçük olmalıdır'
                ], 400);
            }
            
            // Görselin MIME türünü tespit et
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->buffer($imageContent);
            
            // Sadece görsel dosyalarına izin ver
            if (!str_starts_with($mimeType, 'image/')) {
                return response()->json([
                    'message' => 'URL geçerli bir görsele işaret etmiyor'
                ], 400);
            }
            
            // Dosya uzantısını belirle
            $extension = match($mimeType) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/gif' => 'gif',
                'image/webp' => 'webp',
                default => 'jpg',
            };
            
            // Rastgele dosya adı oluştur
            $fileName = 'external_' . Str::random(10) . '.' . $extension;
            
            // Dosyayı kaydet
            Storage::disk('public')->put('questions/' . $fileName, $imageContent);
            
            // Tam URL döndür
            $url = Storage::url('questions/' . $fileName);
            
            return response()->json([
                'url' => $url
            ])->header('Content-Type', 'application/json')
              ->header('Access-Control-Allow-Origin', '*');
            
        } catch (\Exception $e) {
            Log::error('Error in saveExternalImage', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Görsel kaydedilirken bir hata oluştu'
            ], 500);
        }
    }

    /**
     * Belirli bir kullanıcı ve oyun için soruları getir
     */
    public function getQuestionsByUserAndGame(Request $request, $userId, $gameId)
    {
        // Kullanıcının varlığını kontrol et
        $user = User::findOrFail($userId);

        // Oyunun varlığını kontrol et
        $game = Game::findOrFail($gameId);

        // Kullanıcının eklediği ve bu oyuna dahil edilmiş soruları getir
        $questions = Question::with(['category', 'answers', 'user:id,name,email'])
            ->where('user_id', $userId)
            ->whereHas('games', function($query) use ($gameId) {
                $query->where('games.id', $gameId);
            })
            ->get();

        return response()->json($questions);
    }
    
    /**
     * YENİ: Publisher'ları getir - artık questions tablosundan
     */
    public function getPublishers()
    {
        $publishers = Question::select('publisher')
            ->whereNotNull('publisher')
            ->where('publisher', '!=', '')
            ->groupBy('publisher')
            ->selectRaw('publisher, COUNT(*) as count')
            ->orderBy('publisher')
            ->get();
    
        return response()->json($publishers);
    }
}