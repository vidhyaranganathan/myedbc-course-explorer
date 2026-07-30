import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { getSessionUser } from "@/lib/auth";

export default async function Header() {
  const user = await getSessionUser();
  const userEmail = user?.email ?? null;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-[880px] mx-auto px-4 h-12 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#1A1D21]">BC Course Finder</span>
        <nav className="flex items-center gap-4 text-sm">
          {userEmail ? (
            <>
              <a
                href="/profile"
                aria-label="Your profile"
                className="w-8 h-8 rounded-full bg-[#1A1D21] text-white flex items-center justify-center text-sm font-semibold hover:bg-[#3C4043] transition-colors shrink-0"
              >
                {userEmail[0].toUpperCase()}
              </a>
              <SignOutButton redirectUrl="/">
                <button
                  type="button"
                  className="font-medium text-[#1A1D21] hover:text-[#6B7075] transition-colors"
                >
                  Log out
                </button>
              </SignOutButton>
            </>
          ) : (
            <Link
              href="/login"
              className="font-medium text-[#1A1D21] hover:text-[#6B7075] transition-colors"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
