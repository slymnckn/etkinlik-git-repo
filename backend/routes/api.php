<?php

use App\Http\Controllers\Api\QuestionGroupController;
use App\Http\Controllers\Api\SettingsController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\QuestionCategoryController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\AdvertisementController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\TopicController;
use App\Http\Controllers\Api\UnitController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\JenkinsController;
use App\Http\Controllers\Api\PublisherController;
use App\Models\Publisher;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// CORS Headers - Tüm API istekleri için
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
header('Access-Control-Allow-Credentials: true');

// OPTIONS isteklerini handle et
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Public routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Publisher public erişimi (auth gerekmez)
Route::get('/publishers', [PublisherController::class, 'index']);
Route::get('/publishers/{publisher}', [PublisherController::class, 'show']);

// Exports - ApiResource ile temel CRUD işlemlerini otomatik oluşturma
Route::apiResource('exports', ExportController::class);

// Export özel rotaları
Route::post('exports/{export}/completed', [ExportController::class, 'markAsCompleted']);
Route::post('exports/{export}/failed', [ExportController::class, 'markAsFailed']);
Route::get('exports/{export}/download', [ExportController::class, 'download']);
Route::post('exports/{export}/cancel', [ExportController::class, 'cancel']);
Route::post('exports/{export}/retry', [ExportController::class, 'retry']);

// Public image upload routes
Route::post('question-groups/upload-image', [QuestionGroupController::class, 'uploadImage']);
Route::post('/questions/upload-base64-image', [QuestionController::class, 'uploadBase64Image']);
Route::get('/images/search', [QuestionController::class, 'searchImages']);
Route::post('/images/save-external', [QuestionController::class, 'saveExternalImage']);

// İframe durumunu kontrol etme (AJAX)
Route::get('question-groups/{id}/check-iframe-status', [QuestionGroupController::class, 'checkIframeStatus'])
    ->name('question-groups.check-iframe-status');

// Unity'ye özel public erişim (auth gerekmez)
Route::prefix('unity')->group(function () {
    Route::get('question-groups', [QuestionGroupController::class, 'index']);
    Route::get('question-groups/code/{code}', [QuestionGroupController::class, 'getByCode']);
    Route::get('eligible-questions', [QuestionGroupController::class, 'getEligibleQuestions']);

    Route::get('advertisements', [AdvertisementController::class, 'index']);

    Route::get('questions', [QuestionController::class, 'index']);
    Route::get('questions/filter', [QuestionController::class, 'filter']);
    Route::get('users/{userId}/games/{gameId}/questions', [QuestionController::class, 'getQuestionsByUserAndGame']);
    Route::get('my-questions', [QuestionController::class, 'myQuestions']);
    
    Route::apiResource('categories', QuestionCategoryController::class);
    Route::get('categories/filter/{grade?}/{subject?}', [QuestionCategoryController::class, 'filter']);
    
    Route::post('settings/uploadLogo', [SettingsController::class, 'uploadLogo']);
    
    Route::apiResource('grades', GradeController::class);
    Route::apiResource('subjects', SubjectController::class);
    Route::apiResource('units', UnitController::class);
    Route::apiResource('topics', TopicController::class);
    
    // Publisher Unity erişimi
    Route::get('publishers', [PublisherController::class, 'index']);
    Route::get('publishers/{publisher}', [PublisherController::class, 'show']);
});

// Jenkins routes
Route::prefix('jenkins')->group(function () {
    // İframe oluşturma işlemini başlat
    Route::post('create-iframe/{groupId}/{gameId}', [JenkinsController::class, 'createIframe'])
        ->name('jenkins.create-iframe')
        ->middleware('auth:sanctum');

    // Jenkins'ten gelen callback
    Route::post('callback', [JenkinsController::class, 'jenkinsCallback'])
        ->name('jenkins.callback');
});

// Public Game Access (For iframe embedding)
Route::get('game-access/{game}', [GameController::class, 'publicAccess']);

// Advertisements for public games
Route::get('game-ads/{grade?}/{subject?}/{gameType?}', [AdvertisementController::class, 'getActiveAds']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // User routes
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/users', [AuthController::class, 'listUsers']);
    Route::get('/user/{id}', [AuthController::class, 'getUser']);
    Route::delete('/users/{id}', [AuthController::class, 'deleteUser']);
    Route::put('/user-update/{id}', [AuthController::class, 'updateUser']);
    
    // Publisher routes - Sadece yazma işlemleri (okuma public'de)
    Route::post('/publishers', [PublisherController::class, 'store']);
    Route::put('/publishers/{publisher}', [PublisherController::class, 'update']);
    Route::delete('/publishers/{publisher}', [PublisherController::class, 'destroy']);
    Route::post('/publishers/find-or-create', [PublisherController::class, 'findOrCreate']);
    Route::post('/publishers/upload-logo', [PublisherController::class, 'uploadLogo']);
    Route::delete('/publishers/{publisher}/delete-logo', [PublisherController::class, 'deleteLogo']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);

    // Question Categories
    Route::apiResource('categories', QuestionCategoryController::class);
    Route::get('categories/filter/{grade?}/{subject?}', [QuestionCategoryController::class, 'filter']);

    // Questions
    Route::apiResource('questions', QuestionController::class);
    Route::get('questions/filter', [QuestionController::class, 'filter']);
    Route::post('questions/upload-image', [QuestionController::class, 'uploadImage']);
    Route::get('/users/{userId}/games/{gameId}/questions', [QuestionController::class, 'getQuestionsByUserAndGame']);
    Route::get('/my-questions', [QuestionController::class, 'myQuestions']);

    // Games
    Route::apiResource('games', GameController::class);
    Route::get('games/type/{type}', [GameController::class, 'getByType']);
    Route::post('games/{game}/add-question', [GameController::class, 'addQuestion']);
    Route::delete('games/{game}/remove-question/{question}', [GameController::class, 'removeQuestion']);
    Route::put('games/{game}/update-question/{question}', [GameController::class, 'updateQuestionConfig']);
    Route::get('games/{game}/config', [GameController::class, 'getJsonConfig']);
    Route::get('games/{game}/iframe', [GameController::class, 'getIframeCode']);
    Route::get('games/{game}/available-questions', [GameController::class, 'getAvailableQuestions']);
    Route::post('games/{game}/questions/bulk-add', [GameController::class, 'addMultipleQuestions']);

    // Advertisements
    Route::apiResource('advertisements', AdvertisementController::class);
    Route::post('advertisements/{id}', [AdvertisementController::class, 'update']);
    Route::post('advertisements/upload-media', [AdvertisementController::class, 'uploadMedia']);

    // Settings
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::put('/settings', [SettingsController::class, 'update']);
    Route::post('/settings/upload', [SettingsController::class, 'uploadAd']);
    Route::post('settings/uploadLogo', [SettingsController::class, 'uploadLogo']);

    // Question Groups
    Route::get('/question-groups/publishers', [QuestionGroupController::class, 'getPublishers']);
    Route::apiResource('question-groups', QuestionGroupController::class);
    Route::get('question-groups/code/{code}', [QuestionGroupController::class, 'getByCode']);
    Route::get('eligible-questions', [QuestionGroupController::class, 'getEligibleQuestions']);
    Route::post('question-groups/upload-image', [QuestionGroupController::class, 'uploadImage']);
    Route::get('question-groups/{id}/export', [QuestionGroupController::class, 'exportForJenkins'])
        ->name('api.question-groups.export');
    Route::post('question-groups/{id}/create-iframe', [QuestionGroupController::class, 'createIframe'])
        ->name('question-groups.create-iframe');
    
    // Eğitim yapısı
    Route::apiResource('grades', GradeController::class);
    Route::apiResource('subjects', SubjectController::class);
    Route::apiResource('units', UnitController::class);
    Route::apiResource('topics', TopicController::class);
});