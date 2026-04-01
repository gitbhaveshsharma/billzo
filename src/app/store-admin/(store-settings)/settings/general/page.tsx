import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            This section is being rolled out. Use the available settings pages below in the meantime.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/store-admin/settings/hardware">Hardware</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/store-admin/settings/tax">Tax & GST</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/store-admin/settings/sales">Sales</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
