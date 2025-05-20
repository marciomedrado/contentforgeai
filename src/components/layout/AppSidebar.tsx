"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Logo } from './Logo';
import { NAV_LINKS } from '@/lib/constants';
import * as LucideIcons from 'lucide-react'; // Import all icons

type IconName = keyof typeof LucideIcons;

export function AppSidebar() {
  const { state: sidebarState } = useSidebar();
  const pathname = usePathname();
  const isCollapsed = sidebarState === 'collapsed';

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon" className="border-r">
      <SidebarHeader>
        <Logo collapsed={isCollapsed} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {NAV_LINKS.map((link) => {
            const IconComponent = LucideIcons[link.iconName as IconName] as React.ElementType;
            if (!IconComponent) {
              console.warn(`Icon ${link.iconName} not found in lucide-react.`);
              return null; 
            }
            return (
              <SidebarMenuItem key={link.href}>
                <Link href={link.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))}
                    tooltip={isCollapsed ? link.label : undefined}
                  >
                    <a>
                      <IconComponent />
                      <span>{link.label}</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
