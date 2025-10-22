<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Publisher;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PublisherController extends Controller
{
    /**
     * Tüm publisher'ları listele 
     */
    public function index(): JsonResponse
    {
        $publishers = Publisher::orderBy('name')->get(['id', 'name', 'logo_url', 'created_at']);
        return response()->json($publishers);
    }

    /**
     * İsme göre publisher bul veya oluştur
     */
    public function findOrCreate(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255'
        ]);

        $publisher = Publisher::firstOrCreate(['name' => $request->name]);

        return response()->json($publisher);
    }

    /**
     * Yeni publisher oluştur
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:publishers,name',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:5120' // 5MB
        ]);

        try {
            $publisherData = [
                'name' => trim($request->name)
            ];

            // Logo yükleme işlemi
            if ($request->hasFile('logo')) {
                $logoPath = $this->handleLogoUpload($request->file('logo'));
                $publisherData['logo_url'] = $logoPath;
            }

            $publisher = Publisher::create($publisherData);

            return response()->json([
                'message' => 'Publisher başarıyla oluşturuldu',
                'data' => $publisher
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Publisher oluşturulurken bir hata oluştu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Publisher güncelle
     */
    public function update(Request $request, Publisher $publisher): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:publishers,name,' . $publisher->id,
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp|max:5120' // 5MB
        ]);

        try {
            $publisherData = [
                'name' => trim($request->name)
            ];

            // Yeni logo yükleme işlemi
            if ($request->hasFile('logo')) {
                // Eski logoyu sil
                if ($publisher->logo_url) {
                    $this->handleLogoDelete($publisher->logo_url);
                }
                
                // Yeni logoyu yükle
                $logoPath = $this->handleLogoUpload($request->file('logo'));
                $publisherData['logo_url'] = $logoPath;
            }

            $publisher->update($publisherData);

            return response()->json([
                'message' => 'Publisher başarıyla güncellendi',
                'data' => $publisher
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Publisher güncellenirken bir hata oluştu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Publisher sil
     */
    public function destroy(Publisher $publisher): JsonResponse
    {
        try {
            // İlişkili sorular varsa kontrol et (opsiyonel)
            // $questionsCount = $publisher->questions()->count();
            // if ($questionsCount > 0) {
            //     return response()->json([
            //         'message' => 'Bu publisher\'a ait sorular bulunduğu için silinemez',
            //         'questions_count' => $questionsCount
            //     ], 422);
            // }

            // Logoyu sil
            if ($publisher->logo_url) {
                $this->handleLogoDelete($publisher->logo_url);
            }

            $publisherName = $publisher->name;
            $publisher->delete();

            return response()->json([
                'message' => "'{$publisherName}' publisher'ı başarıyla silindi"
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Publisher silinirken bir hata oluştu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Belirli publisher'ı göster
     */
    public function show(Publisher $publisher): JsonResponse
    {
        return response()->json($publisher);
    }

    /**
     * Sadece logo yükleme endpoint'i
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:5120', // 5MB
            'publisher_id' => 'nullable|exists:publishers,id'
        ]);

        try {
            $logoPath = $this->handleLogoUpload($request->file('logo'));

            // Eğer publisher_id varsa, o publisher'ın logosunu güncelle
            if ($request->publisher_id) {
                $publisher = Publisher::findOrFail($request->publisher_id);
                
                // Eski logoyu sil
                if ($publisher->logo_url) {
                    $this->handleLogoDelete($publisher->logo_url);
                }
                
                $publisher->update(['logo_url' => $logoPath]);
                
                return response()->json([
                    'message' => 'Logo başarıyla güncellendi',
                    'logo_url' => $logoPath,
                    'publisher' => $publisher
                ]);
            }

            // Sadece logo URL'ini döndür
            return response()->json([
                'message' => 'Logo başarıyla yüklendi',
                'logo_url' => $logoPath
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Logo yüklenirken bir hata oluştu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Logo silme endpoint'i
     */
    public function deleteLogo(Request $request, Publisher $publisher): JsonResponse
    {
        try {
            if ($publisher->logo_url) {
                $this->handleLogoDelete($publisher->logo_url);
                $publisher->update(['logo_url' => null]);
                
                return response()->json([
                    'message' => 'Logo başarıyla silindi'
                ]);
            }

            return response()->json([
                'message' => 'Publisher\'ın logosu bulunmuyor'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Logo silinirken bir hata oluştu',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Logo yükleme yardımcı fonksiyonu
     */
    private function handleLogoUpload($logoFile): string
    {
        // Benzersiz dosya adı oluştur
        $fileName = 'publisher_logo_' . Str::random(20) . '_' . time() . '.' . $logoFile->getClientOriginalExtension();
        
        // Storage/app/public/publisher-logos klasörüne kaydet
        $logoPath = $logoFile->storeAs('publisher-logos', $fileName, 'public');
        
        // Public URL'i döndür
        return Storage::url($logoPath);
    }

    /**
     * Logo silme yardımcı fonksiyonu
     */
    private function handleLogoDelete(string $logoUrl): void
    {
        // URL'den dosya yolunu çıkar
        $relativePath = str_replace('/storage/', '', $logoUrl);
        
        // Dosyayı sil
        if (Storage::disk('public')->exists($relativePath)) {
            Storage::disk('public')->delete($relativePath);
        }
    }
}