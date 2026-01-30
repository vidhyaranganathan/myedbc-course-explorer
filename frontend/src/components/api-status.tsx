"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HealthStatus } from "@/types/api";

export default function ApiStatus() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then(setStatus)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm text-red-700">API Offline</span>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Connecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 shadow-lg">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm text-green-700">
          API Connected ({status.courseCount.toLocaleString()} courses)
        </span>
      </div>
    </div>
  );
}
