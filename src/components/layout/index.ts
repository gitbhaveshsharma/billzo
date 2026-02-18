// Layout system barrel export
export { ConditionalLayout } from "./conditional-layout";
export { AppHeader } from "./app-header";
export { AppSidebar } from "./app-sidebar";
export { SearchDialog } from "./search/search-dialog";
export { useSearch } from "./search/use-search";
export {
  getLayoutConfig,
  resolvePageType,
  filterSidebarItems,
  mergeLayoutConfig,
} from "./config";
export type {
  LayoutConfig,
  PageType,
  HeaderType,
  HeaderConfig,
  SidebarConfig,
  SidebarItem,
  SidebarChildItem,
  ResponsiveConfig,
  ConditionalLayoutProps,
  SearchItem,
  SearchCategory,
  SearchPriority,
  MobileSidebarMode,
} from "./types";
