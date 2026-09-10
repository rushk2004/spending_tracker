"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadDemoData } from "@/app/actions/demo";

export function DemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    const res = await loadDemoData();
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={loading} variant="secondary">
        <Sparkles className="h-4 w-4" />
        {loading ? "Loading…" : "Load demo data"}
      </Button>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
