import { motion } from "framer-motion";
import { Box } from "lucide-react";
import { Button } from "@/components/ui/button";
const Header = ({ onLogin }) => {
  return <motion.header
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
  >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Box className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg text-foreground">DropVault</span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacy
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onLogin} className="hidden sm:inline-flex">
            Sign In
          </Button>
          <Button variant="hero" size="sm" onClick={onLogin}>
            Get Started
          </Button>
        </div>
      </div>
    </motion.header>;
};
export default Header;
