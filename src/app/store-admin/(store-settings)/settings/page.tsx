import { redirect } from "next/navigation";

export default function StoreSettingsIndexPage() {
  redirect("/store-admin/settings/general");
}
