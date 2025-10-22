<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Publisher;

class PublisherSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $publishers = [
            // Popüler Yayınevleri
            'MEB Yayınları',
            'ARI Yayıncılık',
            'Biltest Yayınları',
            'Palme Yayınevi',
            'Karekök Yayınları',
            'Anıttepe Yayınları',
            'Final Yayınları',
            'Limit Yayınları',
            'Tonguç Akademi'

        ];

        foreach ($publishers as $publisherName) {
            Publisher::firstOrCreate([
                'name' => $publisherName
            ]);
        }

        $this->command->info('Publisher seeder tamamlandı. Toplam ' . count($publishers) . ' yayınevi eklendi.');
    }
}
