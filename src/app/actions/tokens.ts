"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUser } from "@/auth/server";
import { createApiToken, revokeApiToken } from "@/lib/api-tokens";

export type CreateTokenResult =
  { kind: "created"; token: string } | { kind: "rejected"; reason: string };

export async function createToken(name: string): Promise<CreateTokenResult> {
  const user = await getUser();
  if (!user)
    return { kind: "rejected", reason: "Your session ended. Sign in again." };
  const parsed = z.string().trim().min(1).max(60).safeParse(name);
  if (!parsed.success)
    return {
      kind: "rejected",
      reason: 'Name the token, for example "Claude Code on my laptop".',
    };
  const token = await createApiToken(user.id, parsed.data);
  revalidatePath("/connect");
  return { kind: "created", token };
}

export async function revokeToken(id: string) {
  const user = await getUser();
  if (!user || !z.uuid().safeParse(id).success) return;
  await revokeApiToken(user.id, id);
  revalidatePath("/connect");
}
