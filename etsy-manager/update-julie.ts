import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const { error } = await supabase
    .from("orders")
    .update({
      ship_by: "2026-03-06",
      ordered_date: "2026-03-02",
      sold_for: 46.02,
      has_vat: true,
      vat_number: "370 6004 28",
      vat_amount: "£29.85",
      address: `Name: Julie Nixon
Address: 28 Chandlers Ridge
City: Middlesbrough
Province/State:
Country: United Kingdom
Zip code: TS7 0JL`,
    })
    .eq("etsy_order_no", "3991830853");

  if (error) console.log("FAIL:", error.message);
  else console.log("OK: Julie Nixon updated (ship_by, ordered_date, sold_for, VAT, address)");
}
main();
