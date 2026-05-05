import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Mic, History } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  return (
    <header className="sticky top-0 z-40 glass">
      <nav className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
            <Mic className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Vox<span className="text-gradient">Prep</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/history">
            <Button variant={loc.pathname === "/history" ? "secondary" : "ghost"} size="sm" className="gap-2">
              <History className="w-4 h-4" /> <span className="hidden sm:inline">History</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </nav>
    </header>
  );
}
