<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Publisher extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'logo_url'
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Publisher silinirken logo dosyasını da sil
        static::deleting(function ($publisher) {
            if ($publisher->logo_url) {
                $relativePath = str_replace('/storage/', '', $publisher->logo_url);
                if (Storage::disk('public')->exists($relativePath)) {
                    Storage::disk('public')->delete($relativePath);
                }
            }
        });
    }

    /**
     * Logo URL accessor - Tam URL döndür
     */
    public function getLogoUrlAttribute($value): ?string
    {
        if (!$value) {
            return null;
        }

        // Eğer zaten tam URL ise olduğu gibi döndür
        if (str_starts_with($value, 'http')) {
            return $value;
        }

        // Storage URL'ini tam URL'e çevir
        if (str_starts_with($value, '/storage/')) {
            return url($value);
        }

        // Diğer durumlarda storage URL'i oluştur
        return Storage::url($value);
    }

    /**
     * Logo var mı kontrolü
     */
    public function hasLogo(): bool
    {
        return !empty($this->logo_url);
    }

    /**
     * Logo dosya adını al
     */
    public function getLogoFileName(): ?string
    {
        if (!$this->logo_url) {
            return null;
        }

        return basename($this->logo_url);
    }

    /**
     * Logo dosya boyutunu al (eğer varsa)
     */
    public function getLogoFileSize(): ?int
    {
        if (!$this->logo_url) {
            return null;
        }

        $relativePath = str_replace('/storage/', '', $this->logo_url);
        
        if (Storage::disk('public')->exists($relativePath)) {
            return Storage::disk('public')->size($relativePath);
        }

        return null;
    }

    /**
     * String'e dönüştürme
     */
    public function __toString(): string
    {
        return $this->name;
    }

    /**
     * JSON serialization için ek alanlar
     */
    public function toArray()
    {
        $array = parent::toArray();
        
        // Logo bilgilerini ekle
        $array['has_logo'] = $this->hasLogo();
        $array['logo_file_name'] = $this->getLogoFileName();
        $array['logo_file_size'] = $this->getLogoFileSize();
        
        return $array;
    }
}