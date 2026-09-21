<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EnergyController;
use App\Http\Controllers\ScheduleController;
use App\Http\Middleware\CheckBearerToken;
use Illuminate\Http\Request;


// Minden OPTIONS (preflight) kérésre azonnal adjunk 200-as sikeres választ
Route::options('/{any}', function () {
    return response('', 200)
        ->header('Access-Control-Allow-Origin', 'http://localhost:5173')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
})->where('any', '.*');

Route::middleware([CheckBearerToken::class])->group(function () {
    Route::get('/prices', [EnergyController::class, 'getPrices']);
    Route::get('/schedule', [ScheduleController::class, 'getSchedule']);
    Route::post('/schedule', [ScheduleController::class, 'saveSchedule']);
    Route::get('/energy-prices', [EnergyController::class, 'getPrices']);
    Route::get('/schedule', [ScheduleController::class, 'index']);
    Route::post('/schedule', [ScheduleController::class, 'store']);
});