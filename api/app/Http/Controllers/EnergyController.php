<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Http;

class EnergyController extends Controller
{
    public function getPrices()
    {
        // 1. Feladat: Árak lekérése az Energy Charts API-ból
        $response = Http::get('https://api.energy-charts.info/v2/price?bzn=HU');
        
        if ($response->failed()) {
            return response()->json(['error' => 'API hiba'], 500);
        }

        $data = $response->json();
        
        // Atváltás: EUR/MWh -> HUF/kWh (1 EUR = 380 HUF)
        // Képlet: (Ár * 380) / 1000
        $pricesHuf = array_map(function ($price) {
            return round(($price * 380) / 1000, 2);
        }, $data['price']);

        $avgPrice = round(array_sum($pricesHuf) / count($pricesHuf), 2);

        return response()->json([
            'unix_seconds' => $data['unix_seconds'],
            'prices_huf' => $pricesHuf,
            'average_price' => $avgPrice
        ]);
    }
}