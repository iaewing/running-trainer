<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AthleteBootstrapController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $email = $validated['email'] ?? 'local-runner@running-trainer.test';

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $validated['name'] ?? 'Local Runner',
                'password' => Hash::make(str()->password(32)),
            ],
        );

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }
}

