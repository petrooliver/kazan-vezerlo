<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckBearerToken
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        $expectedToken = env('BEARER_TOKEN', 'OLIVER-BOSCH-BEUGRO');

        if ($token !== $expectedToken) {
            return response()->json(['error' => 'Unauthorized token'], 401);
        }

        return $next($request);
    }
}