"use server";

import { createAuthClient } from "@/lib/supabase-auth";
import { redirect } from "next/navigation";

export async function signIn(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return error.message;
  redirect("/");
}

export async function signUp(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return error.message;

  // If email confirmation is required, session will be null
  if (!data.session) {
    return "CHECK_EMAIL";
  }

  redirect("/");
}
