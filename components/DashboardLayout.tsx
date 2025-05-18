"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageSquare, Send, Car, Settings, Database, FileText, ChevronRight, Menu, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive?: boolean
  isPending?: boolean
  isExternal?: boolean
  children?: React.ReactNode
}

function NavItem({ href, icon, label, isActive, isPending, isExternal, children }: NavItemProps) {
  return (
    <li className="mb-1">
      <Link
        href={href}
        className={cn(
          "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-[#25D366]/10 hover:text-[#25D366]",
          isActive ? "bg-[#25D366]/10 text-[#25D366]" : "text-slate-600 dark:text-slate-400",
        )}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer" : undefined}
      >
        {icon}
        <span className="ml-3 flex-1">{label}</span>
        {isPending ? <span className="ml-auto h-2 w-2 rounded-full bg-[#25D366]" /> : null}
        {isExternal ? <ChevronRight className="ml-auto h-4 w-4 opacity-50" /> : null}
      </Link>
      {children}
    </li>
  )
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 pr-0">
            <MobileNav pathname={pathname} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-xl text-[#25D366]">WhatsApp Automation</span>
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Paramètres
          </Button>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-64 border-r bg-slate-50 dark:bg-slate-900 md:block">
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="flex flex-col gap-4 p-4">
              <nav className="grid gap-1">
                <h3 className="mb-2 text-lg font-semibold tracking-tight">Navigation</h3>
                <ul>
                  <NavItem
                    href="/"
                    icon={<Home className="h-4 w-4" />}
                    label="Tableau de bord"
                    isActive={pathname === "/"}
                  />
                  <NavItem
                    href="/multi-sender"
                    icon={<Users className="h-4 w-4" />}
                    label="Envoi multiple"
                    isActive={pathname === "/multi-sender"}
                  />
                  <NavItem
                    href="/conversations"
                    icon={<MessageSquare className="h-4 w-4" />}
                    label="Conversations"
                    isActive={pathname === "/conversations"}
                  />
                  <NavItem
                    href="/autoscout"
                    icon={<Car className="h-4 w-4" />}
                    label="AutoScout24"
                    isActive={pathname === "/autoscout"}
                  />
                  <NavItem
                    href="/logs"
                    icon={<FileText className="h-4 w-4" />}
                    label="Logs"
                    isActive={pathname === "/logs"}
                  />
                  <NavItem
                    href="/db-conversations"
                    icon={<Database className="h-4 w-4" />}
                    label="Base de données"
                    isActive={pathname === "/db-conversations"}
                  />
                </ul>
              </nav>
              <Separator />
              <nav className="grid gap-1">
                <h3 className="mb-2 text-lg font-semibold tracking-tight">Outils</h3>
                <ul>
                  <NavItem
                    href="/whatsapptest"
                    icon={<Send className="h-4 w-4" />}
                    label="Test WhatsApp"
                    isActive={pathname === "/whatsapptest"}
                  />
                </ul>
              </nav>
            </div>
          </ScrollArea>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="font-bold text-xl text-[#25D366]">WhatsApp Automation</span>
      </Link>
      <Separator />
      <nav className="grid gap-1">
        <h3 className="mb-2 text-lg font-semibold tracking-tight">Navigation</h3>
        <ul>
          <NavItem href="/" icon={<Home className="h-4 w-4" />} label="Tableau de bord" isActive={pathname === "/"} />
          <NavItem
            href="/multi-sender"
            icon={<Users className="h-4 w-4" />}
            label="Envoi multiple"
            isActive={pathname === "/multi-sender"}
          />
          <NavItem
            href="/conversations"
            icon={<MessageSquare className="h-4 w-4" />}
            label="Conversations"
            isActive={pathname === "/conversations"}
          />
          <NavItem
            href="/autoscout"
            icon={<Car className="h-4 w-4" />}
            label="AutoScout24"
            isActive={pathname === "/autoscout"}
          />
          <NavItem href="/logs" icon={<FileText className="h-4 w-4" />} label="Logs" isActive={pathname === "/logs"} />
          <NavItem
            href="/db-conversations"
            icon={<Database className="h-4 w-4" />}
            label="Base de données"
            isActive={pathname === "/db-conversations"}
          />
        </ul>
      </nav>
      <Separator />
      <nav className="grid gap-1">
        <h3 className="mb-2 text-lg font-semibold tracking-tight">Outils</h3>
        <ul>
          <NavItem
            href="/whatsapptest"
            icon={<Send className="h-4 w-4" />}
            label="Test WhatsApp"
            isActive={pathname === "/whatsapptest"}
          />
        </ul>
      </nav>
    </div>
  )
}
