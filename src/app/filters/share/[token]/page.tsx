import Link from "next/link";

export default function SharedFilterPage({ params }: { params: { token: string } }) {
  void params;

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-[var(--background)] flex items-center justify-center px-4">
      <div className="bg-white border border-[#E6E8EB] rounded-xl shadow-sm p-8 w-full max-w-md">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-[#F1F3F4] flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-[#6B7075]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-[#9AA0A6] font-medium uppercase tracking-wide">Shared filter set</p>
            <p className="text-base font-bold text-[#1A1D21]">—</p>
          </div>
        </div>

        <div className="rounded-lg border border-[#E6E8EB] bg-[#F6F7F9] px-4 py-3 mb-6">
          <p className="text-xs text-[#9AA0A6] font-semibold uppercase tracking-wide mb-2">Filters</p>
          <p className="text-sm text-[#6B7075]">Filter details will appear here.</p>
        </div>

        <button
          disabled
          className="w-full bg-[#1A1D21] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Load these filters
        </button>

        <p className="text-xs text-[#9AA0A6] text-center mt-4">
          Shared via{" "}
          <Link href="/" className="text-[#1A1D21] font-medium hover:underline">
            BC Course Finder
          </Link>
        </p>

      </div>
    </div>
  );
}
