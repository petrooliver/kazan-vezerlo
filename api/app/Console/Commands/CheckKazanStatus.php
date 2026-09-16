<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckKazanStatus extends Command
{
    protected $signature = 'kazan:check';
    protected $description = 'Percenként ellenőrzi és vezérli a kazánt';

    public function handle()
    {
        $currentBlock = now()->format('Y-m-d H:i:00');

        // Ellenőrizzük, hogy a jelenlegi idősáv mentve van-e az adatbázisban
        $shouldHeat = DB::table('time_blocks_to_heat')
            ->where('time_block', $currentBlock)
            ->exists();

        $switchParam = $shouldHeat ? 'on' : 'off';
        
        // Futtatjuk a kazan.exe-t
        $exePath = base_path('kazan.exe');
        $command = "{$exePath} --user=bosch --password=bosch60 --switch={$switchParam}";
        
        $output = shell_exec($command);
        $responseText = trim($output ?? 'Nincs válasz');

        // Esemény naplózása az events táblába
        DB::table('events')->insert([
            'action' => "switch={$switchParam}",
            'response' => $responseText,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->info("Kazán ellenőrizve: switch={$switchParam} -> Válasz: {$responseText}");
    }
}