import { Vault } from "lucide-react";
const Footer = () => {
  return <footer className="py-12 border-t border-border/50 bg-muted/20">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center gap-8">
          
          {/* Page End Confirmation & Knowledge Quote */}
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground/60 uppercase tracking-widest font-medium">
              You’ve reached the end — ready to build your vault?
            </p>
            <h3 className="text-xl md:text-2xl font-serif italic text-muted-foreground/80">
              "Your future self will thank you."
            </h3>
          </div>

          <div className="w-full h-px bg-border/50" />

          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Vault className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">DropVault</span>
            </div>

            <nav className="flex items-center gap-8">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>

            <p className="text-sm text-muted-foreground">
              © 2025 DropVault. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>;
};
export default Footer;
