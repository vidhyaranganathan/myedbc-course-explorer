"use client";

import { useActionState } from "react";
import { signUp } from "@/app/auth/actions";

export default function SignupPage() {
  const [message, formAction, isPending] = useActionState(signUp, null);

  if (message === "CHECK_EMAIL") {
    return (
      <div className="min-h-[calc(100vh-3rem)] bg-[var(--background)] flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-[#1A1D21] mb-3">Check your email</h1>
          <p className="text-sm text-[#6B7075]">
            We sent you a confirmation link. Click it to activate your account.
          </p>
          <a
            href="/login"
            className="inline-block mt-6 text-sm font-medium text-[#1A1D21] hover:underline"
          >
            Back to log in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-[var(--background)] flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-[#1A1D21] mb-6">Create account</h1>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A1D21] mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1D21]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A1D21] mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1D21]"
            />
            <p className="text-xs text-[#6B7075] mt-1">Minimum 6 characters</p>
          </div>
          {message && (
            <p className="text-sm text-red-600">{message}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#1A1D21] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#3C4043] transition-colors disabled:opacity-50"
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-sm text-[#6B7075] mt-4 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-[#1A1D21] font-medium hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
