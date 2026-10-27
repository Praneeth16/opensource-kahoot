// Typed results rather than throws: in production Next.js hides a thrown error's message.
export type WriteResult =
  | { kind: "committed"; txid: string }
  | { kind: "unchanged" } // nothing matched: already done elsewhere, or a double click
  | { kind: "rejected"; reason: string };

export const rejected = (reason: string): WriteResult => ({
  kind: "rejected",
  reason,
});

export const toResult = (row?: { txid: string }): WriteResult =>
  row ? { kind: "committed", txid: row.txid } : { kind: "unchanged" };
