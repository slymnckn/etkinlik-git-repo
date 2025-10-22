<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'string', 'min:8'],
            'role' => 'required|string|in:admin,editor,viewer',
            'publisher' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'publisher' => $request->publisher ?? 'Arı Yayıncılık',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully',
            'user' => $user,
            'token' => $user->createToken('api-token')->plainTextToken,
        ], 201);
    }

    /**
     * Authenticate user and create token
     */
    public function login(Request $request)
    {
	\Log::info('Login isteği geldi.',['email' => $request->email]);
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke all old tokens
        $user->tokens()->delete();
	\Log::info('TOKEN CREATED.');

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('api-token')->plainTextToken,
        ]);
    }

    /**
     * Get authenticated user
     */
    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function listUsers()
    {
        // Sadece admin erişebilsin
        if (Auth::user()->role !== 'admin' && Auth::user()->role !== 'editor') {
            return response()->json(['message' => 'Yetkisiz erişim'], 403);
        }

        $users = User::all();
        return response()->json($users);
    }

    public function deleteUser( $id)
    {
        if (Auth::user()->role !== 'admin' && Auth::user()->role !== 'editor') {
            return response()->json(['message' => 'Yetkisiz erişim'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'Kullanıcı bulunamadı'], 404);
        }

        $user->delete();
        return response()->json(['message' => 'Kullanıcı silindi']);
    }

    public function  getUser( $id )
    {
        $user = User::find($id);
        return response()->json($user);
    }

    public function updateUser(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $id,
            'role' => 'required|string|in:admin,editor,viewer',
            'password' => ['nullable', 'string', 'min:8'],
            'publisher' => 'nullable|string|max:255',
        ]);

        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Kullanıcı bulunamadı'], 404);
        }

        $user->name = $request->name;
        $user->email = $request->email;
        $user->role = $request->role;
        $user->publisher = $request->publisher ?? $user->publisher ?? 'Arı Yayıncılık';

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Kullanıcı güncellendi',
            'user' => $user
        ]);
    }


}
