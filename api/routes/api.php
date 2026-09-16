<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EnergyController;
use App\Http\Controllers\ScheduleController;
use App\Http\Middleware\CheckBearerToken;

Route::middleware([CheckBearerToken::class])->group(function () {
    Route::get('/prices', [EnergyController::class, 'getPrices']);
    Route::get('/schedule', [ScheduleController::class, 'getSchedule']);
    Route::post('/schedule', [ScheduleController::class, 'saveSchedule']);
});