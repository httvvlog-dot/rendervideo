import { createClient } from "@/utils/supabase/server";

export interface VideoTransition {
  id: string;
  code: string;
  name: string;
  default_duration: number;
}

export class TransitionService {
  /**
   * Fetches all active transitions from the database.
   */
  static async getActiveTransitions(): Promise<VideoTransition[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("transitions")
      .select("id, code, name, default_duration")
      .eq("is_active", true);

    if (error) {
      console.error("[TransitionService] Error fetching transitions:", error);
      return [];
    }

    return data as VideoTransition[];
  }
}
