<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        // SQLite'de dropColumn işlemleri ve indexler sorun çıkarabildiği için
        // sürücüye göre güvenli bir dönüşüm uygula.
        if (Schema::hasTable('question_categories')) {
            $connection = \Illuminate\Support\Facades\DB::connection()->getDriverName();

            // Eğer eski kolonlar varsa (grade, subject, unit, description) dönüştürme yap.
            $hasLegacyCols = Schema::hasColumn('question_categories', 'grade')
                || Schema::hasColumn('question_categories', 'subject')
                || Schema::hasColumn('question_categories', 'unit')
                || Schema::hasColumn('question_categories', 'description');

            if ($hasLegacyCols) {
                if ($connection === 'sqlite') {
                    // Yeni şema ile geçici tablo oluştur
                    Schema::create('question_categories_new', function (Blueprint $table) {
                        $table->id();
                        $table->string('name');
                        $table->foreignId('grade_id')->nullable()->constrained()->onDelete('set null');
                        $table->foreignId('subject_id')->nullable()->constrained()->onDelete('set null');
                        $table->foreignId('unit_id')->nullable()->constrained()->onDelete('set null');
                        $table->foreignId('topic_id')->nullable()->constrained()->onDelete('set null');
                        $table->timestamps();
                    });

                    // Mevcut verileri taşı (eski kolonlardan yeni ID kolonlarına birebir eşleme yok, null bırakılır)
                    \Illuminate\Support\Facades\DB::statement('INSERT INTO question_categories_new (id, name, grade_id, subject_id, unit_id, topic_id, created_at, updated_at) SELECT id, name, NULL as grade_id, NULL as subject_id, NULL as unit_id, NULL as topic_id, created_at, updated_at FROM question_categories');

                    // Eski tabloyu kaldır ve yenisini yeniden adlandır
                    Schema::drop('question_categories');
                    Schema::rename('question_categories_new', 'question_categories');
                } else {
                    // MySQL/Postgre için: önce index'i düşür, sonra kolonları kaldır ve yeni kolonları ekle
                    // Eski index adı: question_categories_grade_subject_index
                    try {
                        Schema::table('question_categories', function (Blueprint $table) {
                            $table->dropIndex('question_categories_grade_subject_index');
                        });
                    } catch (\Throwable $e) {
                        // Index yoksa sessizce devam et
                    }

                    Schema::table('question_categories', function (Blueprint $table) {
                        $table->dropColumn(['grade', 'subject', 'unit', 'description']);
                    });

                    Schema::table('question_categories', function (Blueprint $table) {
                        $table->foreignId('grade_id')->nullable()->constrained()->onDelete('set null');
                        $table->foreignId('subject_id')->nullable()->constrained()->onDelete('set null');
                        $table->foreignId('unit_id')->nullable()->constrained()->onDelete('set null');
                        $table->foreignId('topic_id')->nullable()->constrained()->onDelete('set null');
                    });
                }
            } else {
                // Eski kolonlar yoksa, eksik yeni kolonları ekle (idempotent davranış)
                if (!Schema::hasColumn('question_categories', 'grade_id')) {
                    Schema::table('question_categories', function (Blueprint $table) {
                        $table->foreignId('grade_id')->nullable()->constrained()->onDelete('set null');
                    });
                }
                if (!Schema::hasColumn('question_categories', 'subject_id')) {
                    Schema::table('question_categories', function (Blueprint $table) {
                        $table->foreignId('subject_id')->nullable()->constrained()->onDelete('set null');
                    });
                }
                if (!Schema::hasColumn('question_categories', 'unit_id')) {
                    Schema::table('question_categories', function (Blueprint $table) {
                        $table->foreignId('unit_id')->nullable()->constrained()->onDelete('set null');
                    });
                }
                if (!Schema::hasColumn('question_categories', 'topic_id')) {
                    Schema::table('question_categories', function (Blueprint $table) {
                        $table->foreignId('topic_id')->nullable()->constrained()->onDelete('set null');
                    });
                }
            }
        }
    }

    public function down()
    {
        // Tersine çevirme: mümkün olduğunca güvenli bir şekilde geri al.
        if (!Schema::hasTable('question_categories')) {
            return;
        }

        $connection = \Illuminate\Support\Facades\DB::connection()->getDriverName();
        if ($connection === 'sqlite') {
            // Eski şemaya dönen geçici tablo oluştur
            Schema::create('question_categories_old', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('grade')->nullable();
                $table->string('subject')->nullable();
                $table->string('unit')->nullable();
                $table->text('description')->nullable();
                $table->timestamps();
                $table->index(['grade', 'subject']);
            });

            \Illuminate\Support\Facades\DB::statement('INSERT INTO question_categories_old (id, name, grade, subject, unit, description, created_at, updated_at) SELECT id, name, NULL as grade, NULL as subject, NULL as unit, NULL as description, created_at, updated_at FROM question_categories');

            Schema::drop('question_categories');
            Schema::rename('question_categories_old', 'question_categories');
        } else {
            // İlişkileri kaldır
            try {
                Schema::table('question_categories', function (Blueprint $table) {
                    $table->dropForeign(['grade_id']);
                    $table->dropForeign(['subject_id']);
                    $table->dropForeign(['unit_id']);
                    $table->dropForeign(['topic_id']);
                });
            } catch (\Throwable $e) {
                // ignore
            }

            // Yeni kolonları kaldır ve eski kolonları geri ekle
            Schema::table('question_categories', function (Blueprint $table) {
                if (Schema::hasColumn('question_categories', 'grade_id')) $table->dropColumn('grade_id');
                if (Schema::hasColumn('question_categories', 'subject_id')) $table->dropColumn('subject_id');
                if (Schema::hasColumn('question_categories', 'unit_id')) $table->dropColumn('unit_id');
                if (Schema::hasColumn('question_categories', 'topic_id')) $table->dropColumn('topic_id');

                $table->string('grade')->nullable();
                $table->string('subject')->nullable();
                $table->string('unit')->nullable();
                $table->text('description')->nullable();
            });

            // Eski indexi geri ekle
            Schema::table('question_categories', function (Blueprint $table) {
                $table->index(['grade', 'subject']);
            });
        }
    }
};

