import Link from "next/link";
import { getSessionUser } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase-server";
import { PROFILE_COLUMNS, FILTER_SET_COLUMNS, toProfile, toSavedFilterSet } from "@/lib/user-mapper";
import type { Profile, SavedFilterSet } from "@/lib/user-types";
import ProfileForm from "./ProfileForm";
import SavedFiltersList from "./SavedFiltersList";

const EMPTY_PROFILE: Profile = { role: null, gradeInterest: null, school: null, district: null };

export default async function ProfilePage() {
  const user = await getSessionUser();
  const userEmail = user?.email ?? null;

  let profile: Profile = EMPTY_PROFILE;
  let savedSets: SavedFilterSet[] = [];

  if (user) {
    try {
      const supabase = createServerClient();
      const [profileResult, setsResult] = await Promise.all([
        supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.userId).maybeSingle(),
        supabase
          .from("saved_filter_sets")
          .select(FILTER_SET_COLUMNS)
          .eq("user_id", user.userId)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      if (profileResult.data) profile = toProfile(profileResult.data);
      if (setsResult.data) savedSets = setsResult.data.map(toSavedFilterSet);
    } catch {
      // Fall back to empty defaults if the initial server-side fetch fails;
      // the page still renders and the client components can retry via their own actions.
    }
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

        <ProfileForm initialProfile={profile} />

        {/* Saved filter sets */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E6E8EB] p-6">
          <h2 className="text-sm font-semibold text-[#1A1D21] uppercase tracking-wide mb-5">
            Saved filters
          </h2>
          <SavedFiltersList initialSets={savedSets} />
        </div>

      </div>
    </div>
  );
}
