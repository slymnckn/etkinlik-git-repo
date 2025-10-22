<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Advertisement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AdvertisementController extends Controller
{
    /**
     * Tüm reklamları listele
     */
    public function index()
    {
        $advertisements = Advertisement::orderBy('created_at', 'desc')->get();
        return response()->json($advertisements);
    }

    /**
     * Yeni bir reklam ekle
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:image,video',
            'file' => 'required|file|max:20480', // 20MB maksimum dosya boyutu
            'grade' => 'nullable|string|max:100',
            'subject' => 'nullable|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration'   => 'required|integer|min:1|max:10',

        ]);

        // Dosya türünü kontrol et
        $file = $request->file('file');
        $fileType = $request->type;
        $allowedMimeTypes = $fileType === 'image'
            ? ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
            : ['video/mp4', 'video/webm', 'video/ogg'];

        if (!in_array($file->getMimeType(), $allowedMimeTypes)) {
            return response()->json([
                'message' => 'Geçersiz dosya türü. Lütfen ' .
                    ($fileType === 'image' ? 'bir görsel' : 'bir video') .
                    ' dosyası yükleyin.'
            ], 422);
        }

        // Dosyayı kaydet
        $path = $file->store('advertisements', 'public');
        $url = Storage::url($path);

        // Reklam kaydını oluştur
        $advertisement = Advertisement::create([
            'name' => $request->name,
            'type' => $request->type,
            'file_path' => $path,
            'file_url' => $url,
            'is_active' => true,
            'grade' => $request->grade,
            'subject' => $request->subject,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'duration'   => $validated['duration'],
        ]);

        return response()->json($advertisement, 201);
    }

    /**
     * Belirli bir reklamı görüntüle
     */
    public function show($id)
    {
        $advertisement = Advertisement::findOrFail($id);
        return response()->json($advertisement);
    }

/**
 * Bir reklamı güncelle
 */
public function update(Request $request, $id)
{
    $advertisement = Advertisement::findOrFail($id);

    $validated = $request->validate([
        'name' => 'sometimes|string|max:255',
        'type' => 'sometimes|in:image,video',
        'file' => 'sometimes|file|max:20480', // ← Bu satır var mı?
        'is_active' => 'sometimes|boolean',
        'grade' => 'nullable|string|max:100',
        'subject' => 'nullable|string|max:100',
        'start_date' => 'nullable|date',
        'end_date' => 'nullable|date|after_or_equal:start_date',
        'duration' => 'sometimes|integer|min:1|max:10',
    ]);

    // ← Bu kısım var mı?
    if ($request->hasFile('file')) {
        $file = $request->file('file');
        $fileType = $request->type ?? $advertisement->type;
        
        // Dosya türünü kontrol et
        $allowedMimeTypes = $fileType === 'image'
            ? ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
            : ['video/mp4', 'video/webm', 'video/ogg'];

        if (!in_array($file->getMimeType(), $allowedMimeTypes)) {
            return response()->json([
                'message' => 'Geçersiz dosya türü.'
            ], 422);
        }

        // Eski dosyayı sil
        if (Storage::disk('public')->exists($advertisement->file_path)) {
            Storage::disk('public')->delete($advertisement->file_path);
        }

        // Yeni dosyayı kaydet
        $path = $file->store('advertisements', 'public');
        $url = Storage::url($path);

        $validated['file_path'] = $path;
        $validated['file_url'] = $url;
    }

    $advertisement->update($validated);
    return response()->json($advertisement);
}


    /**
     * Bir reklamı sil
     */
    public function destroy($id)
    {
        $advertisement = Advertisement::findOrFail($id);

        // Dosyayı sil
        if (Storage::exists($advertisement->file_path)) {
            Storage::delete($advertisement->file_path);
        }

        $advertisement->delete();

        return response()->json(null, 204);
    }
    /**
     * Aktif reklamları getir (oyunlar için)
     *
     */
    public function getActiveAds($grade = null, $subject = null, $gameType = null)
    {
        $advertisements = Advertisement::where('is_active', true);

        if ($gameType && in_array($gameType, ['image', 'video'])) {
            $advertisements->where('type', $gameType);
        }

        if ($grade) {
            $advertisements->where('grade', $grade);
        }

        if ($subject) {
            $advertisements->where('subject', $subject);
        }

        return response()->json(
            $advertisements->orderBy('created_at', 'desc')->get()
        );
    }

}
