"use client";

import { useState } from "react";
import type { SavedFilterSet } from "@/lib/user-types";

export default function SavedFiltersList({ initialSets }: { initialSets: SavedFilterSet[] }) {
  const [sets, setSets] = useState<SavedFilterSet[]>(initialSets);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function setPending(id: string, on: boolean) {
    setPendingIds((cur) => {
      const next = new Set(cur);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function setRowError(id: string, message: string | null) {
    setErrors((cur) => {
      const next = { ...cur };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
  }

  async function patchSet(id: string, body: object): Promise<SavedFilterSet | null> {
    setPending(id, true);
    setRowError(id, null);
    try {
      const res = await fetch(`/api/user/filters/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error ?? `Failed (${res.status})`);
      }
      return (await res.json()) as SavedFilterSet;
    } catch (e) {
      setRowError(id, e instanceof Error ? e.message : "Failed");
      return null;
    } finally {
      setPending(id, false);
    }
  }

  async function handleRename(id: string) {
    const name = renameValue.trim();
    if (!name) return;
    const updated = await patchSet(id, { name });
    if (updated) {
      setSets((cur) => cur.map((s) => (s.id === id ? updated : s)));
      setRenamingId(null);
    }
  }

  async function handleToggleDefault(id: string, makeDefault: boolean) {
    const updated = await patchSet(id, { isDefault: makeDefault });
    if (updated) {
      setSets((cur) => cur.map((s) => ({ ...s, isDefault: s.id === id ? makeDefault : makeDefault ? false : s.isDefault })));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this saved filter set?")) return;
    setPending(id, true);
    setRowError(id, null);
    try {
      const res = await fetch(`/api/user/filters/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error ?? `Failed (${res.status})`);
      }
      setSets((cur) => cur.filter((s) => s.id !== id));
    } catch (e) {
      setRowError(id, e instanceof Error ? e.message : "Failed");
      setPending(id, false);
    }
  }

  if (sets.length === 0) {
    return (
      <div className="text-center py-10">
        <svg className="w-10 h-10 mx-auto text-[#D1D5DB] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <p className="text-sm text-[#6B7075] font-medium">No saved filters yet</p>
        <p className="text-xs text-[#9AA0A6] mt-1">
          Use the filter bar on the home page to save a set of filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sets.map((set) => {
        const pending = pendingIds.has(set.id);
        const rowError = errors[set.id];
        return (
          <div key={set.id} className="border border-[#E6E8EB] rounded-lg px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {renamingId === set.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(set.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="text-sm border border-[#E6E8EB] rounded px-2 py-1 flex-1 min-w-0"
                    />
                    <button
                      onClick={() => handleRename(set.id)}
                      disabled={pending}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button onClick={() => setRenamingId(null)} className="text-xs text-[#6B7075] hover:text-[#1A1D21]">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#1A1D21] truncate">{set.name}</span>
                    {set.isDefault && (
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                        Default
                      </span>
                    )}
                  </div>
                )}
                {rowError && <p className="text-xs text-red-600 mt-1">{rowError}</p>}
              </div>

              {renamingId !== set.id && (
                <div className="flex items-center gap-3 shrink-0 text-xs font-medium">
                  <a href={`/?loadFilterSet=${set.id}`} className="text-blue-600 hover:text-blue-700">
                    Load
                  </a>
                  <button
                    onClick={() => {
                      setRenamingId(set.id);
                      setRenameValue(set.name);
                    }}
                    disabled={pending}
                    className="text-[#6B7075] hover:text-[#1A1D21] disabled:opacity-50"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleToggleDefault(set.id, !set.isDefault)}
                    disabled={pending}
                    className="text-[#6B7075] hover:text-[#1A1D21] disabled:opacity-50"
                  >
                    {set.isDefault ? "Unset default" : "Set default"}
                  </button>
                  <button
                    onClick={() => handleDelete(set.id)}
                    disabled={pending}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
