import { Twitter, Linkedin, Mail, Eye, Newspaper, Shield, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border/50 mt-10 md:mt-16 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary" />
      
      <div className="container mx-auto px-4 py-8 md:py-14 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {/* Brand - Full width on mobile */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4 md:mb-5 group">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <Eye className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold font-display text-foreground group-hover:text-primary transition-colors">
                  Executive Eye
                </h3>
                <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  Ghana Insurance Intelligence
                </p>
              </div>
            </Link>
            <p className="text-xs md:text-sm text-muted-foreground max-w-md leading-relaxed hidden sm:block">
              Your executive intelligence platform for Ghana's insurance industry. Real-time news, 
              NIC regulatory updates, performance metrics, and AI-powered insights for senior managers.
            </p>
            <div className="flex items-center gap-3 md:gap-4 mt-3 md:mt-4">
              <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Live updates</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                <Newspaper className="h-2.5 w-2.5 md:h-3 md:w-3" />
                <span>NIC Data</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h4 className="font-semibold text-foreground mb-3 md:mb-5 font-display text-sm md:text-base">Quick Links</h4>
            <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1.5 md:gap-2 group">
                  <Newspaper className="h-3 w-3 md:h-4 md:w-4" />
                  News
                </Link>
              </li>
              <li>
                <Link to="/insurance-ai" className="hover:text-primary transition-colors flex items-center gap-1.5 md:gap-2 group">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                  AI Tracker
                </Link>
              </li>
              <li>
                <a href="https://nicgh.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1.5 md:gap-2 group">
                  <Shield className="h-3 w-3 md:h-4 md:w-4" />
                  NIC Ghana
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div className="col-span-1">
            <h4 className="font-semibold text-foreground mb-3 md:mb-5 font-display text-sm md:text-base">Connect</h4>
            <div className="flex gap-2 md:gap-3">
              {[
                { icon: Twitter, label: 'Twitter' },
                { icon: Linkedin, label: 'LinkedIn' },
                { icon: Mail, label: 'Email' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="p-2 md:p-3 rounded-lg md:rounded-xl bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
                >
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                </a>
              ))}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-3 md:mt-4 hidden sm:block">
              Executive insights for Ghana's insurance leaders.
            </p>
          </div>
        </div>

        <div className="border-t border-border/50 mt-6 md:mt-10 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
          <p className="flex items-center gap-2 text-center md:text-left">
            <Eye className="h-3 w-3 md:h-4 md:w-4" />
            © {new Date().getFullYear()} Executive Eye
          </p>
          <div className="flex items-center gap-4 md:gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
