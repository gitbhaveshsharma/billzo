"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  ChevronRight,
  ChevronDown,
  Search,
  MoreHorizontal,
  FolderOpen,
  Folder,
} from "lucide-react";
import toast from "react-hot-toast";
import { useInventory } from "@/app/inventory/_context/inventory-context";
import { useProductStore } from "@/stores/product.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { createCategorySchema, updateCategorySchema } from "@/validations/product.validation";
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@/types/product.types";

// ============================================================================
// INVENTORY MANAGER — CATEGORIES PAGE
// ============================================================================

export default function InventoryCategoriesPage() {
  const { storeId } = useInventory();

  const {
    categories,
    isLoading,
    isSaving,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useProductStore();

  // ── State ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<string | undefined>(undefined);

  // ── Form State ─────────────────────────────────────────────────────────
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formParentId, setFormParentId] = useState<string>("none");
  const [formIsLeaf, setFormIsLeaf] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!storeId) return;
    fetchCategories(storeId);
  }, [storeId, fetchCategories]);

  // ========================================================================
  // HELPERS
  // ========================================================================

  const rootCategories = categories.filter((c) => !c.parent_id);
  const getChildren = useCallback(
    (parentId: string) => categories.filter((c) => c.parent_id === parentId),
    [categories],
  );

  const filteredCategories = search
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code?.toLowerCase().includes(search.toLowerCase()),
      )
    : null; // null = show tree view; non-null = flat list

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormParentId("none");
    setFormIsLeaf(false);
    setFormErrors({});
  };

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleCreate = useCallback(async () => {
    if (!storeId) return;
    const data: CreateCategoryRequest = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      parent_id: formParentId !== "none" ? formParentId : undefined,
      is_leaf: formIsLeaf,
    };

    const parsed = createCategorySchema.safeParse(data);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const f = i.path.join(".");
        if (!errs[f]) errs[f] = i.message;
      });
      setFormErrors(errs);
      return;
    }

    const result = await createCategory(storeId, parsed.data as CreateCategoryRequest);
    if (result) {
      toast.success(`Category "${formName}" created`);
      setAddDialogOpen(false);
      resetForm();
    } else {
      toast.error("Failed to create category");
    }
  }, [storeId, formName, formDescription, formParentId, formIsLeaf, createCategory]);

  const handleUpdate = useCallback(async () => {
    if (!storeId || !selectedCategory) return;
    const data: UpdateCategoryRequest = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      parent_id: formParentId !== "none" ? formParentId : undefined,
      is_leaf: formIsLeaf,
    };

    const parsed = updateCategorySchema.safeParse(data);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const f = i.path.join(".");
        if (!errs[f]) errs[f] = i.message;
      });
      setFormErrors(errs);
      return;
    }

    const success = await updateCategory(storeId, selectedCategory.id, parsed.data as UpdateCategoryRequest);
    if (success) {
      toast.success(`Category "${formName}" updated`);
      setEditDialogOpen(false);
      resetForm();
    } else {
      toast.error("Failed to update category");
    }
  }, [storeId, selectedCategory, formName, formDescription, formParentId, formIsLeaf, updateCategory]);

  const handleDelete = useCallback(async () => {
    if (!storeId || !selectedCategory) return;
    const success = await deleteCategory(storeId, selectedCategory.id);
    if (success) {
      toast.success(`Category "${selectedCategory.name}" deleted`);
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
    } else {
      toast.error("Failed to delete category — it may have products or subcategories");
    }
  }, [storeId, selectedCategory, deleteCategory]);

  const openAddDialog = (parentId?: string) => {
    resetForm();
    if (parentId) setFormParentId(parentId);
    setAddDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setSelectedCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description ?? "");
    setFormParentId(cat.parent_id ?? "none");
    setFormIsLeaf(cat.is_leaf);
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (cat: Category) => {
    setSelectedCategory(cat);
    setDeleteDialogOpen(true);
  };

  // ========================================================================
  // TREE ROW RENDERER
  // ========================================================================

  const renderCategoryRow = (cat: Category, depth: number = 0) => {
    const children = getChildren(cat.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(cat.id);

    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 border-b transition-colors"
          style={{ paddingLeft: `${12 + depth * 24}px` }}
        >
          {/* Expand / Collapse */}
          <button
            onClick={() => hasChildren && toggleExpand(cat.id)}
            className="w-5 h-5 flex items-center justify-center shrink-0"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>

          {/* Icon */}
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-amber-500 shrink-0" />
            )
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          {/* Name */}
          <span className="font-medium text-sm flex-1 truncate">{cat.name}</span>

          {/* Badges */}
          {cat.code && (
            <Badge variant="outline" className="text-xs">
              {cat.code}
            </Badge>
          )}
          {!cat.is_active && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
          {cat.is_leaf && (
            <Badge variant="outline" className="text-xs text-green-600">
              Leaf
            </Badge>
          )}

          {/* Level */}
          <span className="text-xs text-muted-foreground w-14 text-right">
            L{cat.level}
          </span>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openAddDialog(cat.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subcategory
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(cat)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openDeleteDialog(cat)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Render children */}
        {hasChildren && isExpanded &&
          children.map((child) => renderCategoryRow(child, depth + 1))
        }
      </div>
    );
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
            <InfoTooltip content="Organize products into hierarchical categories. Categories can be nested (parent → child) and used to filter products throughout the system." />
          </div>
          <p className="text-sm text-muted-foreground">
            {categories.length} categories &middot; {rootCategories.length} top-level
          </p>
        </div>
        <Button onClick={() => openAddDialog()} className="gap-1">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Category</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Tree / Search Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderTree className="h-4 w-4" />
            {filteredCategories ? "Search Results" : "Category Tree"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredCategories ? (
            // Flat search results
            filteredCategories.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No categories match &quot;{search}&quot;
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>{cat.code ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {cat.path ?? "—"}
                      </TableCell>
                      <TableCell>L{cat.level}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(cat)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(cat)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : rootCategories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No categories created yet. Add your first category to organize products.
            </div>
          ) : (
            <div className="divide-y">
              {rootCategories.map((cat) => renderCategoryRow(cat, 0))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={addDialogOpen || editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editDialogOpen ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editDialogOpen
                ? "Update category details."
                : "Create a new product category."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Electronics"
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            {/* Parent */}
            <div className="space-y-1.5">
              <Label>Parent Category</Label>
              <Select value={formParentId} onValueChange={setFormParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {categories
                    .filter((c) => c.id !== selectedCategory?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {"—".repeat(c.level)} {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Leaf toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={formIsLeaf}
                onCheckedChange={setFormIsLeaf}
                id="cat-leaf"
              />
              <Label htmlFor="cat-leaf" className="text-sm cursor-pointer">
                Leaf category (no subcategories expected)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editDialogOpen ? handleUpdate : handleCreate}
              disabled={isSaving || !formName.trim()}
            >
              {isSaving ? "Saving..." : editDialogOpen ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ────────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedCategory?.name}&quot;? This
              cannot be undone. Categories with products or subcategories cannot be
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
