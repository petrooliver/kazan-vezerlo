<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TimeBlocksToHeat extends Model
{
    use HasFactory;

    // Engedélyezzük az 'hour' mező tömeges mentését
    protected $fillable = ['hour'];
}
