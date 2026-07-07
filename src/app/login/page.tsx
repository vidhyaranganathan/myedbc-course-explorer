"use client";

import { useActionState } from "react";
import { signIn } from "@/app/auth/actions";

export default function LoginPage() {
  const [message, formAction, isPending] = useActionState(signIn, null);

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-[var(--background)] flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-[#1A1D21] mb-6">Log in</h1>
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
              autoComplete="current-password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1D21]"
            />
          </div>
          {message && message !== "CHECK_EMAIL" && (
            <p className="text-sm text-red-600">{message}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#1A1D21] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#3C4043] transition-colors disabled:opacity-50"
          >
            {isPending ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="text-sm text-[#6B7075] mt-4 text-center">
          No account?{" "}
          <a href="/signup" className="text-[#1A1D21] font-medium hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
