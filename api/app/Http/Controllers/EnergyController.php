<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class EnergyController extends Controller
{
    public function getPrices()
    {
        $prices = [
            ['hour' => 0,  'price' => 33.0, 'time_block' => '2026-09-21 00:00'],
            ['hour' => 1,  'price' => 21.0, 'time_block' => '2026-09-21 01:00'],
            ['hour' => 2,  'price' => 36.0, 'time_block' => '2026-09-21 02:00'],
            ['hour' => 3,  'price' => 40.0, 'time_block' => '2026-09-21 03:00'],
            ['hour' => 4,  'price' => 27.0, 'time_block' => '2026-09-21 04:00'],
            ['hour' => 5,  'price' => 33.0, 'time_block' => '2026-09-21 05:00'],
            ['hour' => 6,  'price' => 45.0, 'time_block' => '2026-09-21 06:00'],
            ['hour' => 7,  'price' => 22.0, 'time_block' => '2026-09-21 07:00'],
            ['hour' => 8,  'price' => 39.0, 'time_block' => '2026-09-21 08:00'],
            ['hour' => 9,  'price' => 21.0, 'time_block' => '2026-09-21 09:00'],
            ['hour' => 10, 'price' => 48.0, 'time_block' => '2026-09-21 10:00'],
            ['hour' => 11, 'price' => 48.0, 'time_block' => '2026-09-21 11:00'],
            ['hour' => 12, 'price' => 35.0, 'time_block' => '2026-09-21 12:00'],
            ['hour' => 13, 'price' => 43.0, 'time_block' => '2026-09-21 13:00'],
            ['hour' => 14, 'price' => 22.0, 'time_block' => '2026-09-21 14:00'],
            ['hour' => 15, 'price' => 28.0, 'time_block' => '2026-09-21 15:00'],
            ['hour' => 16, 'price' => 21.0, 'time_block' => '2026-09-21 16:00'],
            ['hour' => 17, 'price' => 25.0, 'time_block' => '2026-09-21 17:00'],
            ['hour' => 18, 'price' => 45.0, 'time_block' => '2026-09-21 18:00'],
            ['hour' => 19, 'price' => 49.0, 'time_block' => '2026-09-21 19:00'],
            ['hour' => 20, 'price' => 46.0, 'time_block' => '2026-09-21 20:00'],
            ['hour' => 21, 'price' => 38.0, 'time_block' => '2026-09-21 21:00'],
            ['hour' => 22, 'price' => 38.0, 'time_block' => '2026-09-21 22:00'],
            ['hour' => 23, 'price' => 49.0, 'time_block' => '2026-09-21 23:00'],
        ];

        return response()->json($prices);
    }
}