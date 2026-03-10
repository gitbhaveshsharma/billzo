import type { Metadata } from "next";
import { ProfilePageView } from "./_components";

export const metadata: Metadata = {
  title: "My Profile – StorePOS",
  description: "View and update your personal and work information.",
};

export default function ProfilePage() {
  return <ProfilePageView />;
}
