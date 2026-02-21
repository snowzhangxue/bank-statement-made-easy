import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getDashboardData() {
  // Find or create the default tax return
  let taxReturn = await prisma.taxReturn.findFirst();
  if (!taxReturn) {
    taxReturn = await prisma.taxReturn.create({ data: {} });
  }

  const documentCount = await prisma.document.count({
    where: { taxReturnId: taxReturn.id },
  });

  const itemCount = await prisma.extractedItem.count({
    where: { taxReturnId: taxReturn.id },
  });

  const verifiedItemCount = await prisma.extractedItem.count({
    where: { taxReturnId: taxReturn.id, verified: true },
  });

  const formCount = await prisma.generatedForm.count({
    where: { taxReturnId: taxReturn.id },
  });

  return {
    taxReturn,
    documentCount,
    itemCount,
    verifiedItemCount,
    formCount,
  };
}

function statusLabel(status: string) {
  switch (status) {
    case "in_progress":
      return { label: "In Progress", variant: "secondary" as const };
    case "review":
      return { label: "Under Review", variant: "outline" as const };
    case "completed":
      return { label: "Completed", variant: "default" as const };
    default:
      return { label: status, variant: "secondary" as const };
  }
}

export default async function DashboardPage() {
  const { taxReturn, documentCount, itemCount, verifiedItemCount, formCount } =
    await getDashboardData();

  const status = statusLabel(taxReturn.status);

  const stats = [
    {
      title: "Documents Uploaded",
      value: documentCount,
      description: "Tax documents ready for processing",
    },
    {
      title: "Extracted Items",
      value: itemCount,
      description: `${verifiedItemCount} of ${itemCount} verified`,
    },
    {
      title: "Generated Forms",
      value: formCount,
      description: "Tax forms generated",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Tax Year {taxReturn.year} Overview
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader>
              <CardDescription>{stat.title}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
