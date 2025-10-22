<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('question_groups', function (Blueprint $table) {
            $table->string('zip_url')->nullable()->after('iframe_code');
        });
    }

    public function down(): void
    {
        Schema::table('question_groups', function (Blueprint $table) {
            $table->dropColumn('zip_url');
        });
    }
};
