import { Link, useLocation } from "wouter";
import { Home, Clock, Star, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Início", icon: Home },
    { href: "/historico", label: "Histórico", icon: Clock },
    { href: "/favoritos", label: "Favoritos", icon: Star },
    { href: "/templates", label: "Templates", icon: LayoutTemplate },
  ];

  // Do not show bottom nav on result page if we want it focused, but prompt doesn't specify. We'll show it everywhere.
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-beige/50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.02)] sm:max-w-md sm:mx-auto">
      <div className="flex items-center justify-around h-16 px-4">
        {links.map((link) => {
          const isActive = location === link.href || (location.startsWith(link.href) && link.href !== "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-medium transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
              )}
            >
              <Icon
                className={cn(
                  "w-6 h-6 transition-all duration-300",
                  isActive ? "scale-110 mb-0.5" : "scale-100"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn("transition-all duration-300", isActive ? "opacity-100" : "opacity-80")}>
                {link.label}
              </span>
              {isActive && (
                <div className="absolute top-1 right-1/4 w-1.5 h-1.5 bg-accent rounded-full animate-in zoom-in" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
