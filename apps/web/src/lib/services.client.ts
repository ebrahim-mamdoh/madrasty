import { createServices, type Services } from "@madrasty/api";
import { getBrowserSupabase } from "@/lib/supabase/browser";

let services: Services | undefined;

/** Browser services singleton. Components reach it through hooks in hooks/queries. */
export function getBrowserServices(): Services {
  services ??= createServices(getBrowserSupabase());
  return services;
}
