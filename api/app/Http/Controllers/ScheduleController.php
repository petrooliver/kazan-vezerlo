<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ScheduleController extends Controller
{
    public function getSchedule()
    {
        $blocks = DB::table('time_blocks_to_heat')->pluck('time_block');
        return response()->json($blocks);
    }

    public function saveSchedule(Request $request)
    {
        $request->validate([
            'time_blocks' => 'required|array'
        ]);

        DB::table('time_blocks_to_heat')->truncate(); // Töröljük a korábbi preferenciákat

        foreach ($request->time_blocks as $block) {
            DB::table('time_blocks_to_heat')->insert([
                'time_block' => $block,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Idősávok elmentve!']);
    }
}