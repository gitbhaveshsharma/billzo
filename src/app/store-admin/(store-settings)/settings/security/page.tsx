import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Security controls are being finalized. Use IP Whitelist and profile settings for now.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/store-admin/settings/ip">IP Whitelist</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/profile">My Profile</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
