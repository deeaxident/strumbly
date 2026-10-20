import { Moon, Sun } from "lucide-react";

import { useTheme, type Theme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed right-4 top-4 z-40 sm:right-6 sm:top-6">
      <div
        role="group"
        aria-label="Colour theme"
        className="flex items-center gap-1 rounded-full border border-border bg-card/85 p-1 shadow-[var(--shadow-soft)] backdrop-blur"
      >
        {OPTIONS.map(({ id, label, Icon }) => {
          const active = theme === id;
          return (
            <button
              key={id}
              type="button"
              aria-label={`${label} mode`}
              aria-pressed={active}
              onClick={() => setTheme(id as Theme)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
