"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X, LogOut, Activity, Sun, Moon, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { supabaseBrowser } from "@/lib/supabase"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  useEffect(() => {
    setMounted(true)
    supabaseBrowser.auth.getUser().then(({ data }) => setUser(data.user ?? null))
  }, [])
  const isAuthenticated = !!user

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "🏥" },
    { href: "/consultation", label: "Consultation", icon: "💬" },
    { href: "/profile", label: "Health Profile", icon: "👤" },
  ]

  if (!isAuthenticated) return (
    <nav className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <span className="font-semibold text-foreground hidden sm:inline">Medical Consultant Bot</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="default" className="gap-2">
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="outline" className="gap-2">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )

  async function handleLogout() {
    try {
      await fetch("/api/auth/signout", { method: "POST" })
      await supabaseBrowser.auth.signOut()
    } finally {
      router.push("/")
    }
  }

  return (
    <nav className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <span className="font-semibold text-foreground hidden sm:inline">Medical Consultant Bot</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant={pathname === item.href ? "default" : "ghost"} className="gap-2">
                  <span>{item.icon}</span>
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Logout + Theme */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {mounted ? (
                resolvedTheme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />
              ) : (
                <span className="inline-block w-4 h-4" aria-hidden />
              )}
              <span className="hidden sm:inline">Theme</span>
            </Button>
            <Button variant="outline" className="gap-2 bg-transparent" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu */}
          <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                <Button variant={pathname === item.href ? "default" : "ghost"} className="w-full justify-start gap-2">
                  <span>{item.icon}</span>
                  {item.label}
                </Button>
              </Link>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {mounted ? (
                resolvedTheme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />
              ) : (
                <span className="inline-block w-4 h-4" aria-hidden />
              )}
              Toggle Theme
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
