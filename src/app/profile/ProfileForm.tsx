"use client";

import { useState } from "react";
import { PROFILE_ROLES, VALID_GRADES, type Profile, type ProfileRole } from "@/lib/user-types";

type SaveState = "idle" | "saving" | "success" | "error";

export default function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const [role, setRole] = useState<ProfileRole | "">(initialProfile.role ?? "");
  const [gradeInterest, setGradeInterest] = useState<number[]>(initialProfile.gradeInterest ?? []);
  const [school, setSchool] = useState(initialProfile.school ?? "");
  const [district, setDistrict] = useState(initialProfile.district ?? "");
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  function toggleGrade(grade: number) {
    setGradeInterest((cur) => (cur.includes(grade) ? cur.filter((g) => g !== grade) : [...cur, grade]));
  }

  async function handleSave() {
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          role: role === "" ? null : role,
          gradeInterest: gradeInterest.length === 0 ? null : gradeInterest,
          school: school.trim() === "" ? null : school.trim(),
          district: district.trim() === "" ? null : district.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Failed to save (${res.status})`);
      }
      setState("success");
      setTimeout(() => setState("idle"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setState("error");
    }
  }

  const saving = state === "saving";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E6E8EB] p-6 mb-5">
      <h2 className="text-sm font-semibold text-[#1A1D21] uppercase tracking-wide mb-5">
        About you
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="profile-role" className="block text-xs font-semibold text-[#9AA0A6] uppercase tracking-wide mb-1.5">
            Role
          </label>
          <select
            id="profile-role"
            value={role}
            onChange={(e) => setRole(e.target.value as ProfileRole | "")}
            disabled={saving}
            className="w-full border border-[#E6E8EB] rounded-lg px-3 py-2 text-sm text-[#1A1D21] bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Select a role</option>
            {PROFILE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#9AA0A6] uppercase tracking-wide mb-1.5">
            Grade interest
          </label>
          <div className="flex gap-3 pt-2">
            {VALID_GRADES.map((g) => (
              <label key={g} className="flex items-center gap-1.5 text-sm text-[#1A1D21]">
                <input
                  type="checkbox"
                  checked={gradeInterest.includes(g)}
                  onChange={() => toggleGrade(g)}
                  disabled={saving}
                />
                Grade {g}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="profile-school" className="block text-xs font-semibold text-[#9AA0A6] uppercase tracking-wide mb-1.5">
            School
          </label>
          <input
            id="profile-school"
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            disabled={saving}
            placeholder="e.g. Burnaby North Secondary"
            className="w-full border border-[#E6E8EB] rounded-lg px-3 py-2 text-sm text-[#1A1D21] placeholder-[#C4C9D0] bg-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="profile-district" className="block text-xs font-semibold text-[#9AA0A6] uppercase tracking-wide mb-1.5">
            District
          </label>
          <input
            id="profile-district"
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            disabled={saving}
            placeholder="e.g. SD 41 Burnaby"
            className="w-full border border-[#E6E8EB] rounded-lg px-3 py-2 text-sm text-[#1A1D21] placeholder-[#C4C9D0] bg-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-medium text-white bg-[#1A1D21] rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {state === "success" && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
        {state === "error" && error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
