import { NavLink } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  CommandIcon,
  Folder01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"
import { BrandWordmark } from "@/components/brand-wordmark"
import { openCommandPalette } from "@/lib/command-palette-bus"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NAV } from "@/lib/nav"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", label: NAV.projects, icon: Folder01Icon, end: true },
  { to: "/projects/new", label: NAV.newCompilation, icon: Add01Icon },
  { to: "/settings", label: NAV.settings, icon: Settings01Icon },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="p-2">
        <div className="flex items-center px-2 py-2.5 group-data-[collapsible=icon]:justify-center">
          <BrandWordmark
            variant="full"
            className="min-w-0 group-data-[collapsible=icon]:hidden"
          />
          <BrandWordmark
            variant="mark"
            className="hidden group-data-[collapsible=icon]:flex"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ to, label, icon, end }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild tooltip={label} className="h-9">
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn(isActive && "bg-sidebar-accent font-medium")
                      }
                    >
                      <HugeiconsIcon icon={icon} strokeWidth={2} />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2.5">
        <Button
          variant="outline"
          className="h-9 w-full justify-start gap-2.5 px-3 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0"
          onClick={openCommandPalette}
        >
          <HugeiconsIcon
            icon={CommandIcon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          <span className="group-data-[collapsible=icon]:hidden">Commands</span>
          <kbd className="ml-auto hidden rounded-md border border-border/80 bg-muted/40 px-2 py-1 font-mono text-[10px] leading-none text-muted-foreground group-data-[collapsible=icon]:hidden md:inline">
            ⌘K
          </kbd>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
