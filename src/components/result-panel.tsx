import Link from "next/link";
import type { ActionResult } from "@/lib/action-result";

export function ResultPanel({ result }: { result: ActionResult | null }) {
  if (!result) return null;

  return (
    <section className={`result-panel ${result.type}`}>
      <h2>{result.title}</h2>
      <p>{result.message}</p>
      <div className="toolbar">
        {result.motorId ? (
          <Link className="button secondary" href={`/motors/${result.motorId}`}>
            查看详情
          </Link>
        ) : null}
      </div>
    </section>
  );
}
