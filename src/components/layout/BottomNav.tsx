import { CalendarDays, CheckSquare, Home, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { bottomNavItems } from "../../app/navigation";

const navIcons = {
  "/": Home,
  "/tasks": CheckSquare,
  "/calendar": CalendarDays,
  "/settings": Settings,
} as const;

export const BottomNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-30">
    <div className="mx-auto max-w-3xl px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-4 rounded-[18px] border border-[rgb(var(--color-line-soft))] bg-card/92 p-1.5 shadow-soft backdrop-blur-xl">
        {bottomNavItems.map((item) => {
          const Icon = navIcons[item.to];

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[13px] text-[11px] font-bold transition",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-ink-muted",
                ].join(" ")
              }
            >
              <Icon aria-hidden size={17} strokeWidth={2.1} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  </nav>
);
