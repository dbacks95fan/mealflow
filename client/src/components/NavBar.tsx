// ABOUTME: Primary navigation: a bottom tab bar on phones and a pill bar on wide
// ABOUTME: screens (CSS decides). The active section is marked for the current
// ABOUTME: route, and This Week carries a badge with the number of planned recipes.
import { Link, useLocation } from "react-router-dom";
import { useSelections } from "../lib/useSelections";
import { Icon, type IconName } from "./Icon";

interface Section {
  to: string;
  label: string;
  icon: IconName;
  /** Route prefixes that belong to this section. */
  matches: (pathname: string) => boolean;
}

const sections: Section[] = [
  {
    to: "/",
    label: "Recipes",
    icon: "book",
    matches: (p) => p === "/" || p.startsWith("/recipes"),
  },
  { to: "/this-week", label: "This Week", icon: "calendar", matches: (p) => p === "/this-week" },
  {
    to: "/groceries",
    label: "Groceries",
    icon: "list",
    // Fry's review is the last part of the shopping list, so Groceries stays lit.
    matches: (p) => p === "/groceries" || p === "/frys",
  },
  { to: "/settings", label: "Settings", icon: "sliders", matches: (p) => p === "/settings" },
];

export function NavBar() {
  const { pathname } = useLocation();
  const { selections } = useSelections();
  const planned = selections?.length ?? 0;

  return (
    <nav className="nav-bar" aria-label="Primary">
      {sections.map((section) => {
        const active = section.matches(pathname);
        const showBadge = section.to === "/this-week" && planned > 0;
        return (
          <Link
            key={section.to}
            to={section.to}
            className={active ? "nav-link active" : "nav-link"}
            aria-current={active ? "page" : undefined}
            aria-describedby={showBadge ? "nav-planned-count" : undefined}
          >
            <span className="nav-icon">
              <Icon name={section.icon} />
              {showBadge && (
                <span className="nav-badge" aria-hidden="true">
                  {planned}
                </span>
              )}
            </span>
            {section.label}
          </Link>
        );
      })}
      {planned > 0 && (
        <span id="nav-planned-count" className="visually-hidden">
          {planned} recipe{planned === 1 ? "" : "s"} planned
        </span>
      )}
    </nav>
  );
}
