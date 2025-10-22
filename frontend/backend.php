<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Eğer maintenance varsa yükle
if (file_exists($maintenance = __DIR__.'/../laravel_ariyayin/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Autoloader yükle
require __DIR__.'/../laravel_ariyayin/vendor/autoload.php';

// Laravel app yükle
$app = require_once __DIR__.'/../laravel_ariyayin/bootstrap/app.php';

$app->handleRequest(
    Request::capture()
);

