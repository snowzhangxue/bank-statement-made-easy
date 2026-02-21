"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Upload,
  CheckSquare,
  Calculator,
  FileOutput,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, step: null },
  { href: "/upload", label: "Upload Documents", icon: Upload, step: 1 },
  { href: "/review", label: "Review Items", icon: CheckSquare, step: 2 },
  { href: "/summary", label: "Tax Summary", icon: Calculator, step: 3 },
  { href: "/forms", label: "Generate Forms", icon: FileOutput, step: 4 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center px-6">
        <Link href="/dashboard" className="text-lg font-semibold">
          Snow Tax
        </Link>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.step !== null && (
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                    isActive
                      ? "bg-primary-foreground text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.step}
                </span>
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
