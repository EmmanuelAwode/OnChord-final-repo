import { supabase } from "../supabaseClient";

export async function getUid(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not logged in");
  return data.user.id;
}
