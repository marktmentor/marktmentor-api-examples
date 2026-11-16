import { Link, useLocation } from "@tanstack/react-router"
import {
  GaugeIcon,
  BookOpenIcon,
  LayoutDashboardIcon,
  PackageSearchIcon,
  StoreIcon,
  TargetIcon,
} from "lucide-react"
import { UsageMeter } from "@/components/usage-meter"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { useI18n } from "@/i18n"
import type { Quota, Rates } from "@/lib/types"

type Props = React.ComponentProps<typeof Sidebar> & {
  quota: Quota | null
  rates: Rates
  reserve: number
  demo: boolean
}

export function AppSidebar({ quota, rates, reserve, demo, ...props }: Props) {
  const { m } = useI18n()
  const research = [
    { to: "/products", label: m.nav.products, icon: PackageSearchIcon },
    { to: "/niches", label: m.nav.niches, icon: TargetIcon },
  ] as const
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                  MM
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">MarktMentor</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {m.meta.appName}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem
                to="/"
                label={m.nav.overview}
                icon={LayoutDashboardIcon}
                exact
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{m.nav.research}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {research.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{m.nav.yourData}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem to="/store" label={m.nav.store} icon={StoreIcon} />
              <NavItem to="/usage" label={m.navExtra.usage} icon={GaugeIcon} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm">
                  <a
                    href="https://api.marktmentor.nl"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <BookOpenIcon />
                    <span>{m.nav.docs}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UsageMeter quota={quota} rates={rates} reserve={reserve} demo={demo} />
      </SidebarFooter>
    </Sidebar>
  )
}

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
}: {
  to: "/" | "/products" | "/niches" | "/store" | "/usage"
  label: string
  icon: React.ComponentType
  exact?: boolean
}) {
  const pathname = useLocation({ select: (l) => l.pathname })
  const { setOpenMobile } = useSidebar()
  const active = exact ? pathname === to : pathname.startsWith(to)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <Link to={to} onClick={() => setOpenMobile(false)}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
