<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QuestionGroup;
use App\Models\Question;
use App\Models\Game;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class QuestionGroupController extends Controller
{
    /**
     * Tüm soru gruplarını listele
     */
    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);

        $query = QuestionGroup::with(['game', 'creator', 'category'])
            ->withCount('questions');

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('question_type')) {
            $query->where('question_type', $request->question_type);
        }

        if ($request->filled('game_id')) {
            $query->where('game_id', $request->game_id);
        }

        // YENİ: Publisher filtresi - artık doğrudan question_groups tablosundan
        if ($request->filled('publisher')) {
            $query->where('publisher', $request->input('publisher'));
        }

        // YENİ: Çoklu kategori desteği
        if ($request->filled('category_ids')) {
            $categoryIds = $request->input('category_ids');
            if (is_array($categoryIds) && !empty($categoryIds)) {
                // Eğer [-1] gönderildiyse, hiçbir sonuç döndürme
                if (count($categoryIds) === 1 && $categoryIds[0] === -1) {
                    $query->whereRaw('1 = 0'); // Hiçbir sonuç döndürmeyen koşul
                } else {
                    $query->whereIn('category_id', $categoryIds);
                }
            }
        } elseif ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // YENİ: Eğitim yapısı filtreleri
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

        if ($request->filled('sort_field') && in_array($request->sort_field, ['name', 'question_type', 'game_id', 'created_at'])) {
            $sortDirection = $request->input('sort_direction', 'desc') === 'asc' ? 'asc' : 'desc';
            $query->orderBy($request->sort_field, $sortDirection);
        } else {
            $query->latest();
        }

        return response()->json(
            $query->paginate($perPage)
        );
    }

    /**
     * Yeni bir soru grubu oluştur
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'question_type' => 'required|in:multiple_choice,true_false,qa',
            'game_id' => 'required|exists:games,id',
            'category_id' => 'nullable|exists:question_categories,id',
            'publisher' => 'nullable|string|max:255', // YENİ: Publisher validation
            'question_ids' => 'required|array|min:16|max:48',
            'question_ids.*' => 'exists:questions,id',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        // Soru tipi ve oyuna göre soruları kontrol et
        $questions = Question::whereIn('id', $validated['question_ids'])
            ->get();

        // Tüm sorular seçilen tipe uygun mu?
        $invalidTypeQuestions = $questions->filter(function ($question) use ($validated) {
            return $question->question_type !== $validated['question_type'];
        });

        if ($invalidTypeQuestions->count() > 0) {
            return response()->json([
                'message' => 'Some questions do not match the selected type',
                'invalid_questions' => $invalidTypeQuestions->pluck('id'),
            ], 422);
        }
        
        // Görsel işleme
        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('question_groups', 'public');
        }

        // Soru grubu oluştur
        $questionGroup = QuestionGroup::create([
            'name' => $validated['name'],
            'question_type' => $validated['question_type'],
            'game_id' => $validated['game_id'],
            'category_id' => $validated['category_id'] ?? null,
            'created_by' => Auth::id(),
            'publisher' => $validated['publisher'] ?? null, // YENİ: Publisher eklendi
            'image_path' => $imagePath,
            'iframe_status' => 'pending',
        ]);

        // Soruları gruba ekle
        foreach ($validated['question_ids'] as $index => $questionId) {
            $questionGroup->questions()->attach($questionId, [
                'order' => $index + 1,
            ]);
        }

        // İlişkilerle birlikte yeni grubu döndür
        return response()->json(
            QuestionGroup::with(['game', 'creator', 'category', 'questions'])
                ->withCount('questions')
                ->find($questionGroup->id),
            201
        );
    }

    /**
     * Belirli bir soru grubunu göster
     */
    public function show(QuestionGroup $questionGroup)
    {
        $questionGroup->load(['game', 'creator', 'category', 'questions.answers']);
        $questionGroup->loadCount('questions');

        return response()->json($questionGroup);
    }

    /**
     * Bir soru grubunu güncelle
     */
    public function update(Request $request, QuestionGroup $questionGroup)
    {
        // Form data ile gönderilmişse PUT/PATCH metodu kontrolü
        $method = $request->input('_method', $request->method());

        // Form data ile PUT/PATCH istekleri için
        if (in_array($method, ['PUT', 'PATCH']) && $request->isMethod('POST')) {
            $request->setMethod($method);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'category_id' => 'nullable|exists:question_categories,id',
            'publisher' => 'nullable|string|max:255', // YENİ: Publisher validation
            'question_ids' => 'sometimes|required|array|min:16|max:48',
            'question_ids.*' => 'exists:questions,id',
            'image' => 'nullable|image|max:2048',
            'remove_image' => 'nullable|boolean',
            'iframe_status' => 'sometimes|in:pending,processing,completed,failed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $updateData = [];

        // Grup adını güncelle
        if (isset($validated['name'])) {
            $updateData['name'] = $validated['name'];
        }

        // Kategori ID'sini güncelle (null olabilir)
        if (array_key_exists('category_id', $validated)) {
            $updateData['category_id'] = $validated['category_id'];
        }

        // YENİ: Publisher güncellemesi
        if (array_key_exists('publisher', $validated)) {
            $updateData['publisher'] = $validated['publisher'];
        }

        // Görseli güncelle
        // Önce silme isteğini kontrol et
        if ($request->has('remove_image') && $request->boolean('remove_image')) {
            if ($questionGroup->image_path) {
                Storage::disk('public')->delete($questionGroup->image_path);
            }
            $updateData['image_path'] = null;
        } elseif ($request->hasFile('image')) {
            // Eskiyi sil
            if ($questionGroup->image_path) {
                Storage::disk('public')->delete($questionGroup->image_path);
            }
            $updateData['image_path'] = $request->file('image')->store('question_groups', 'public');
        }

        if (isset($validated['iframe_status']) && auth()->user()->isAdmin()) {
            $updateData['iframe_status'] = $validated['iframe_status'];
        }

        // Grup verilerini güncelle
        if (!empty($updateData)) {
            $questionGroup->update($updateData);
        }

        // Soruları güncelle
        if (isset($validated['question_ids'])) {
            // Tüm sorular doğru tipe sahip mi kontrol et
            $questions = Question::whereIn('id', $validated['question_ids'])
                ->get();

            $invalidTypeQuestions = $questions->filter(function ($question) use ($questionGroup) {
                return $question->question_type !== $questionGroup->question_type;
            });

            if ($invalidTypeQuestions->count() > 0) {
                return response()->json([
                    'message' => 'Some questions do not match the group question type',
                    'invalid_questions' => $invalidTypeQuestions->pluck('id'),
                ], 422);
            }

            // Mevcut soruları kaldır ve yenilerini ekle
            $questionGroup->questions()->detach();

            foreach ($validated['question_ids'] as $index => $questionId) {
                $questionGroup->questions()->attach($questionId, [
                    'order' => $index + 1,
                ]);
            }
        }

        // Güncellenmiş grubu döndür
        $questionGroup->load(['game', 'creator', 'category', 'questions']);
        $questionGroup->loadCount('questions');

        return response()->json($questionGroup);
    }

    /**
     * Bir soru grubunu sil
     */
    public function destroy(QuestionGroup $questionGroup)
    {
        // Eğer görsel varsa sil
        if ($questionGroup->image_path) {
            Storage::disk('public')->delete($questionGroup->image_path);
        }

        // Grup sorularının ilişkisi pivot tablosunda otomatik silinecek (cascade)
        $questionGroup->delete();

        return response()->json(null, 204);
    }

    /**
     * Kod ile soru grubunu ve sorularını getir
     */
    public function getByCode($code)
    {
        $questionGroup = QuestionGroup::where('code', $code)
            ->with(['questions.answers', 'game', 'category'])
            ->withCount('questions')
            ->firstOrFail();

        // Logo URL'yi hazırla - Publisher tablosundan al
        $logoUrl = null;
        
        // Publisher tablosundan doğru logo URL'sini al
        if ($questionGroup->publisher) {
            $publisher = \App\Models\Publisher::where('name', $questionGroup->publisher)->first();
            if ($publisher && $publisher->logo_url) {
                $logoUrl = $publisher->logo_url;
            }
        }
        
        // Fallback: Eğer publisher bulunamazsa eski mantığı kullan
        if (!$logoUrl && $questionGroup->publisher) {
            // Direkt dosya adı kontrolü - publisher adıyla başlayan dosya var mı?
            $publisherLogos = Storage::disk('public')->files('publisher-logos');
            
            // Publisher adını normalize et (özel karakterler vs. için)
            $normalizedPublisher = strtolower(trim($questionGroup->publisher));
            
            foreach ($publisherLogos as $logoFile) {
                $fileName = basename($logoFile);
                $fileNameLower = strtolower($fileName);
                
                // Eğer dosya adı publisher adıyla başlıyorsa veya içeriyorsa
                if (strpos($fileNameLower, $normalizedPublisher) !== false ||
                    strpos($fileNameLower, 'publisher_logo_' . $normalizedPublisher) !== false) {
                    // Sadece Storage::url() kullan, url() ile sarmala
                    $logoUrl = Storage::url($logoFile);
                    break;
                }
            }
            
            // Eğer hâlâ bulunamadıysa, tüm dosyaları kontrol et (debug için)
            if (!$logoUrl) {
                // En son değiştirilmiş publisher logo dosyasını al (geçici çözüm)
                $latestLogo = collect($publisherLogos)
                    ->sortByDesc(function($file) {
                        return Storage::disk('public')->lastModified($file);
                    })->first();
                
                if ($latestLogo) {
                    $logoUrl = Storage::url($latestLogo);
                }
            }
        }
        
        // Eğer publisher logo'su bulunamadıysa, soru grubunun kendi image_path'ini kullan
        if (!$logoUrl && $questionGroup->image_path) {
            $logoUrl = Storage::url($questionGroup->image_path);
        }

        // İstersen Publisher tablosu üzerinden logo çekebilirsin
        // if ($questionGroup->publisherModel && $questionGroup->publisherModel->logo_path) {
        //     $logoUrl = url(Storage::url($questionGroup->publisherModel->logo_path));
        // }

        return response()->json([
            'id' => $questionGroup->id,
            'code' => $questionGroup->code,
            'name' => $questionGroup->name,
            'question_type' => $questionGroup->question_type,
            'publisher' => $questionGroup->publisher,
            'logo_url' => $logoUrl, // 🔹 Unity için eklendi
            'image_path' => $questionGroup->image_path, // 🔹 Debug için eklendi
            'storage_url' => $questionGroup->image_path ? Storage::url($questionGroup->image_path) : null, // 🔹 Debug
            'available_logos' => Storage::disk('public')->files('publisher-logos'), // 🔹 Debug: mevcut logolar
            'questions' => $questionGroup->questions->map(function ($question) {
                return [
                    'id' => $question->id,
                    'question_text' => $question->question_text,
                    'question_type' => $question->question_type,
                    'image_path' => $question->image_path
                        ? Storage::url($question->image_path)
                        : null,
                    'category_id' => $question->category_id,
                    'answers' => $question->answers->map(function ($answer) {
                        return [
                            'answer_text' => $answer->answer_text,
                            'is_correct' => $answer->is_correct,
                            'image_path' => $answer->image_path
                                ? Storage::url($answer->image_path)
                                : null,
                        ];
                    }),
                ];
            }),
        ]);
    }

    /**
     * Belirli bir oyun ve soru tipine uyan soruları getir (grup oluşturma için)
     * YENİ: Çoklu kategori desteği eklendi
     */
    public function getEligibleQuestions(Request $request)
    {
        $validated = $request->validate([
            'game_id' => 'required|exists:games,id',
            'question_type' => 'required|in:multiple_choice,true_false,qa',
            'category_id' => 'nullable|exists:question_categories,id',
            'category_ids' => 'nullable|array', // YENİ: Çoklu kategori
            'category_ids.*' => 'exists:question_categories,id',
            'grade_id' => 'nullable|exists:grades,id', // YENİ: Eğitim yapısı filtreleri
            'subject_id' => 'nullable|exists:subjects,id',
            'unit_id' => 'nullable|exists:units,id',
            'topic_id' => 'nullable|exists:topics,id',
            'publisher' => 'nullable|string', // YENİ: Publisher filtresi
        ]);

        $questions = Question::with(['category'])
            ->where('question_type', $validated['question_type'])
            ->whereHas('games', function ($query) use ($validated) {
                $query->where('games.id', $validated['game_id']);
            });

        // YENİ: Publisher filtresi
        if (!empty($validated['publisher'])) {
            $questions->where('publisher', $validated['publisher']);
        }

        // YENİ: Çoklu kategori filtreleme
        if (!empty($validated['category_ids'])) {
            $questions->whereIn('category_id', $validated['category_ids']);
        } elseif (!empty($validated['category_id'])) {
            $questions->where('category_id', $validated['category_id']);
        }

        // YENİ: Eğitim yapısı filtreleri
        if (!empty($validated['grade_id'])) {
            $questions->whereHas('category', function($q) use ($validated) {
                $q->where('grade_id', $validated['grade_id']);
            });
        }

        if (!empty($validated['subject_id'])) {
            $questions->whereHas('category', function($q) use ($validated) {
                $q->where('subject_id', $validated['subject_id']);
            });
        }

        if (!empty($validated['unit_id'])) {
            $questions->whereHas('category', function($q) use ($validated) {
                $q->where('unit_id', $validated['unit_id']);
            });
        }

        if (!empty($validated['topic_id'])) {
            $questions->whereHas('category', function($q) use ($validated) {
                $q->where('topic_id', $validated['topic_id']);
            });
        }

        return response()->json(
            $questions->latest()->paginate(30)
        );
    }

    /**
     * Görsel yükleme endpoint'i
     */
    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:2048', // 2MB max (Question ile aynı)
        ]);

        $path = $request->file('image')->store('question_groups', 'public');
        $url = Storage::url($path);

        return response()->json(['url' => $url]);
    }

    /**
     * İframe oluşturma işlemini başlat
     *
     * @param  int  $id
     * @return RedirectResponse
     */
    public function createIframe($id)
    {
        $jenkinsController = app(JenkinsController::class);
        $response = $jenkinsController->createIframe($id);

        if ($response->original['success']) {
            return redirect()->route('admin.question-groups.show', $id)
                ->with('success', 'İframe oluşturma işlemi başlatıldı. Bu işlem birkaç dakika sürebilir.');
        } else {
            return redirect()->route('admin.question-groups.show', $id)
                ->with('error', 'İframe oluşturulamadı: ' . $response->original['message']);
        }
    }

    /**
     * İframe durumunu kontrol et (AJAX)
     *
     * @param  int  $id
     * @return JsonResponse
     */
    public function checkIframeStatus($id)
    {
        $questionGroup = QuestionGroup::findOrFail($id);

        return response()->json([
            'status' => $questionGroup->iframe_status,
            'statusText' => $questionGroup->iframe_status_text,
            'isReady' => $questionGroup->isIframeReady(),
            'iframe_code' => $questionGroup->iframe_code
        ]);
    }

    /**
     * Soru grubu verilerini Jenkins için JSON formatında dışa aktar
     */
    public function exportForJenkins($id, Request $request)
    {
        // API token kontrolü
        $providedToken = $request->header('Authorization');
        if (!$providedToken || strpos($providedToken, 'Bearer ') !== 0) {
            return response()->json(['error' => 'Invalid token format'], 401);
        }

        $token = substr($providedToken, 7); // "Bearer " kısmını kaldır

        // Soru grubunu al
        $questionGroup = QuestionGroup::with(['questions.answers', 'category', 'game'])
            ->findOrFail($id);

        // Veriyi hazırla
        $data = [
            'id' => $questionGroup->id,
            'code' => $questionGroup->code,
            'name' => $questionGroup->name,
            'question_type' => $questionGroup->question_type,
            'publisher' => $questionGroup->publisher, // YENİ: Publisher eklendi
            'game' => [
                'id' => $questionGroup->game->id,
                'name' => $questionGroup->game->name,
            ],
            'category' => $questionGroup->category ? [
                'id' => $questionGroup->category->id,
                'name' => $questionGroup->category->name,
            ] : null,
            'questions' => $questionGroup->questions->map(function ($question) {
                return [
                    'id' => $question->id,
                    'text' => $question->question_text,
                    'type' => $question->question_type,
                    'image_path' => $question->image_path,
                    'publisher' => $question->publisher, // YENİ: Question publisher'ı da eklendi
                    'answers' => $question->answers->map(function ($answer) {
                        return [
                            'id' => $answer->id,
                            'text' => $answer->answer_text,
                            'is_correct' => $answer->is_correct,
                            'image_path' => $answer->image_path,
                        ];
                    }),
                ];
            }),
        ];

        return response()->json($data);
    }

    /**
     * YENİ: Publisher'ları getir - artık question_groups tablosundan
     */
    public function getPublishers()
    {
        $publishers = QuestionGroup::select('publisher')
            ->whereNotNull('publisher')
            ->where('publisher', '!=', '')
            ->groupBy('publisher')
            ->selectRaw('publisher, COUNT(*) as count')
            ->orderBy('publisher')
            ->get();
    
        return response()->json($publishers);
    }
}