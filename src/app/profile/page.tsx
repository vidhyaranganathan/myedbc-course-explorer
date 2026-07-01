import Link from "next/link";
import { createAuthClient } from "@/lib/supabase-auth";

export default async function ProfilePage() {
  let userEmail: string | null = null;
  try {
    const supabase = await createAuthClient();
    const { data } = await supabase.auth.getUser();
    userEmail = data.user?.email ?? null;
  } catch {
    // Session read failed
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-[var(--background)]">
      <div className="max-w-[880px] mx-auto px-4 py-8 sm:py-12">

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7075] hover:text-[#1A1D21] transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to course search
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1D21]">
            Profile
          </h1>
          <p className="text-base text-[#6B7075] mt-2">{userEmail}</p>
        </div>

        {/* Profile fields */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E6E8EB] p-6 mb-5">
          <h2 className="text-sm font-semibold text-[#1A1D21] uppercase tracking-wide mb-5">
            About you
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ProfileField label="Role" placeholder="e.g. Teacher, Counsellor, Parent" />
            <ProfileField label="Grade interest" placeholder="e.g. Grade 10–12" />
            <ProfileField label="School" placeholder="e.g. Burnaby North Secondary" />
            <ProfileField label="District" placeholder="e.g. SD 41 Burnaby" />
          </div>
          <p className="text-xs text-[#9AA0A6] mt-5">Editing coming soon.</p>
        </div>

        {/* Saved filter sets */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E6E8EB] p-6">
          <h2 className="text-sm font-semibold text-[#1A1D21] uppercase tracking-wide mb-5">
            Saved filters
          </h2>
          <div className="text-center py-10">
            <svg className="w-10 h-10 mx-auto text-[#D1D5DB] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <p className="text-sm text-[#6B7075] font-medium">No saved filters yet</p>
            <p className="text-xs text-[#9AA0A6] mt-1">
              Use the filter bar on the home page to save a set of filters.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function ProfileField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#9AA0A6] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type="text"
        disabled
        placeholder={placeholder}
        className="w-full border border-[#E6E8EB] rounded-lg px-3 py-2 text-sm text-[#1A1D21] placeholder-[#C4C9D0] bg-[#F6F7F9] disabled:cursor-not-allowed"
      />
    </div>
  );
}
