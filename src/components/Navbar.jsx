import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Home,
  Calendar,
  User,
  Settings,
  Briefcase,
  LifeBuoy,
  UserCircle,
  Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, logout: userLogout, loading: userLoading } = useAuth();
  const { isAdmin, logout: adminLogout, loading: adminLoading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle scroll effect for sticky navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);
    if (isAdmin) {
      await adminLogout();
    } else if (user) {
      await userLogout();
    }
    navigate('/');
  };

  // Navigation Links - Unified for the entire app
  const navLinks = [
    { name: "Home", href: "/", icon: <Home className="w-4 h-4 mr-2" />, hideOnAccount: true },
    { name: "Services", href: "/#our-values", icon: <Briefcase className="w-4 h-4 mr-2" />, hideOnAccount: true },
    { name: "Book Now", href: "/hourlybooking", icon: <Calendar className="w-4 h-4 mr-2" />, hideOnAccount: true },
    { name: "Contact", href: "/contact", icon: <User className="w-4 h-4 mr-2" />, hideOnAccount: true },
  ];

  const currentPathIsAccount = location.pathname === '/account';

  // Helper for hash links vs route links
  const handleLinkClick = (href) => {
    setIsMenuOpen(false);
    if (href.includes('#')) {
      const [path, hash] = href.split('#');
      if (location.pathname === path) {
        // Same page scroll
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // Navigate then scroll (handled by useEffect in target page usually, or basic browser behavior)
        navigate(href);
      }
    } else {
      navigate(href);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "U";
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-md shadow-md py-2" : "bg-transparent py-4"
        }`}
    >
      {isAdmin && (
        <div className="absolute top-0 left-0 right-0 bg-destructive text-destructive-foreground text-[10px] font-bold text-center py-0.5 z-[60]">
          ADMIN MODE ACTIVE
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
            <div className="h-5 w-auto"> {/* <-- Changed to h-8 (32px) */}
              <img alt="ReadyNest Logo" className="h-full w-auto object-contain" src="https://raw.githubusercontent.com/Alsabbagh16/ReadyNestAssets/refs/heads/main/text4.png" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              (!(currentPathIsAccount && link.hideOnAccount)) && (
                <Button
                  key={link.name}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/5 font-medium"
                  onClick={() => handleLinkClick(link.href)}
                >
                  {link.name}
                </Button>
              )
            ))}
          </nav>

          {/* User Menu / Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {isAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-2 ring-destructive/20">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt="Admin" />
                      <AvatarFallback className="bg-destructive text-destructive-foreground font-bold">AD</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Administrator</p>
                      <p className="text-xs leading-none text-muted-foreground">admin@readynest.com</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin-dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Admin Panel</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/10 hover:ring-primary/30 transition-all">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.first_name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(profile?.first_name, profile?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile?.first_name} {profile?.last_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/contact')}>
                    <Mail className="mr-2 h-4 w-4" />
                    <span>Report a Problem</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => navigate('/hourlybooking')} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                  Book Service
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMenu} className="text-foreground">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-background border-b shadow-xl overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              <nav className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  (!(currentPathIsAccount && link.hideOnAccount)) && (
                    <Button
                      key={link.name}
                      variant="ghost"
                      className="justify-start w-full text-left font-medium"
                      onClick={() => handleLinkClick(link.href)}
                    >
                      {link.icon}
                      {link.name}
                    </Button>
                  )
                ))}
              </nav>

              <div className="border-t pt-4 space-y-3">
                {isAdmin ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-2 py-2 mb-2 bg-muted/50 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-destructive text-destructive-foreground">AD</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Administrator</p>
                        <p className="text-xs text-muted-foreground">Admin Access</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full justify-start" onClick={() => { setIsMenuOpen(false); navigate('/admin-dashboard'); }}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Admin Panel
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </Button>
                  </div>
                ) : user ? (
                  <div className="space-y-2">
                    <div
                      className="flex items-center gap-3 px-2 py-2 mb-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => { setIsMenuOpen(false); navigate('/account'); }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(profile?.first_name, profile?.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{profile?.first_name || 'User'} {profile?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Settings className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Button variant="outline" className="w-full justify-start" onClick={() => { setIsMenuOpen(false); navigate('/dashboard'); }}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => { setIsMenuOpen(false); navigate('/auth'); }}>
                      Log in
                    </Button>
                    <Button onClick={() => { setIsMenuOpen(false); navigate('/hourlybooking'); }}>
                      Book Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;