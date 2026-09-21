<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ScheduleController extends Controller
{
    /**
     * Mentett idősávok lekérése az SQLite adatbázisból
     */
    public function index()
    {
        try {
            // Beolvassuk az elmentett idősávokat
            $schedules = DB::table('schedules')->pluck('time_block')->toArray();

            return response()->json([
                'status' => 'success',
                'time_blocks' => $schedules
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Idősávok mentése és felülírása
     */
    public function store(Request $request)
    {
        try {
            // Kiolvassuk a beérkező tömböt (támogatja a time_blocks és hours kulcsot is)
            $blocks = $request->input('time_blocks', $request->input('hours', []));

            if (!is_array($blocks)) {
                $blocks = [];
            }

            // 1. Töröljük a korábbi rekordokat az adatbázisból (megakadályozza az SQL duplikációs hibát)
            DB::table('schedules')->delete();

            // 2. Előkészítjük az új rekordokat beszúrásra
            $dataToInsert = [];
            foreach ($blocks as $block) {
                $dataToInsert[] = [
                    'time_block' => (string)$block,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            // 3. Beszúrjuk az új idősávokat
            if (!empty($dataToInsert)) {
                DB::table('schedules')->insert($dataToInsert);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Idősávok sikeresen frissítve!',
                'time_blocks' => $blocks
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}