import { createAuthClient } from "@/lib/supabase-auth";

export default async function Header() {
  let userEmail: string | null = null;
  try {
    const supabase = await createAuthClient();
    const { data } = await supabase.auth.getUser();
    userEmail = data.user?.email ?? null;
  } catch {
    // No session or env vars missing — show logged-out state
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-[880px] mx-auto px-4 h-12 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#1A1D21]">BC Course Finder</span>
        <nav className="flex items-center gap-4 text-sm">
          {userEmail ? (
            <>
              <span className="text-[#6B7075] hidden sm:block truncate max-w-[200px]">
                {userEmail}
              </span>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="font-medium text-[#1A1D21] hover:text-[#6B7075] transition-colors"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <a
              href="/login"
              className="font-medium text-[#1A1D21] hover:text-[#6B7075] transition-colors"
            >
              Log in
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
