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
  <nav className="ui-bottom-nav" aria-label="주요 메뉴">
    <div className="ui-bottom-nav-inner mx-auto w-full px-3">
      <div className="ui-navigation-shell">
        <p className="ui-nav-heading">주요 메뉴</p>
        {bottomNavItems.map((item) => {
          const Icon = navIcons[item.to];

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `ui-nav-item ${isActive ? "is-active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="ui-nav-icon">
                    <Icon aria-hidden size={17} strokeWidth={isActive ? 2.4 : 2.1} />
                  </span>
                  <span className="ui-nav-label">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  </nav>
);
