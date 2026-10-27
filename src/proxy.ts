import type { NextRequest } from "next/server";

import { getAuth } from "@/auth/server";

let middleware:
  ReturnType<ReturnType<typeof getAuth>["middleware"]> | undefined;

export default function proxy(request: NextRequest) {
  // Signed-out page loads get an HTTP redirect. Server Actions skip it and check the session themselves.
  if (request.headers.has("next-action")) return;
  middleware ??= getAuth().middleware({ loginUrl: "/auth/sign-in" });
  return middleware(request);
}

// Host pages only. /, /join and /play are public (players have no account); /api routes answer 401
// themselves. proxy.ts isn't the security boundary: every page, action and route checks again.
export const config = {
  matcher: ["/dashboard", "/quizzes/:path*", "/host/:path*", "/reports/:path*"],
};
