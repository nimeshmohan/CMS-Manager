import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { buildItemFormSchema, slugify, type PublishTarget } from "@cms-manager/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from "@/api/projects";
import { useCreateItem, useItem, useUnpublishItem, useUpdateItem } from "@/api/items";
import { usePermissions } from "@/hooks/usePermissions";
import { DynamicField } from "@/components/items/DynamicField";

function defaultValueFor(type: string): unknown {
  switch (type) {
    case "number":
      return undefined;
    case "boolean":
      return false;
    default:
      return "";
  }
}

/** richText and the image upload widget need the full row; everything else is compact enough to pair up (Section 6). */
function isWideField(type: string): boolean {
  return type === "richText" || type === "image";
}

export function ItemFormPage() {
  const { id: projectId, collectionId, itemId } = useParams<{
    id: string;
    collectionId: string;
    itemId?: string;
  }>();
  const isEditMode = Boolean(itemId);
  const navigate = useNavigate();

  const { data: project } = useProject(projectId);
  const permissions = usePermissions(projectId, collectionId);
  const collection = useMemo(
    () => project?.collections.find((c) => c.id === collectionId),
    [project, collectionId],
  );

  const itemQuery = useItem(projectId ?? "", collectionId ?? "", itemId);
  const createItem = useCreateItem(projectId ?? "", collectionId ?? "");
  const updateItem = useUpdateItem(projectId ?? "", collectionId ?? "", itemId ?? "");
  const unpublishItem = useUnpublishItem(projectId ?? "", collectionId ?? "");

  const schema = useMemo(
    () => buildItemFormSchema(collection?.fields ?? []),
    [collection],
  );

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      ...Object.fromEntries(
        (collection?.fields ?? []).map((f) => [f.key, defaultValueFor(f.type)]),
      ),
      publishTarget: "draft",
    },
  });

  useEffect(() => {
    if (itemQuery.data && collection) {
      reset({
        name: itemQuery.data.name,
        slug: itemQuery.data.slug ?? "",
        ...Object.fromEntries(
          collection.fields.map((f) => [f.key, itemQuery.data.fieldData[f.key] ?? defaultValueFor(f.type)]),
        ),
        publishTarget: "draft",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemQuery.data, collection]);

  const watchedName = watch("name");
  const watchedSlug = watch("slug");
  const slugFromName = typeof watchedName === "string" ? slugify(watchedName) : "";
  const previewSlug = isEditMode
    ? (itemQuery.data?.slug ?? "")
    : (typeof watchedSlug === "string" && watchedSlug.trim()) || slugFromName;

  async function onSave(target: PublishTarget, values: Record<string, unknown>): Promise<void> {
    const payload = { ...values, publishTarget: target };
    try {
      if (isEditMode) {
        await updateItem.mutateAsync(payload);
      } else {
        await createItem.mutateAsync(payload);
      }
      toast.success(
        target === "draft"
          ? "Item saved as draft."
          : target === "staging"
            ? "Item saved to staging."
            : "Item published.",
      );
      navigate(`/projects/${projectId}/collections/${collectionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save item.");
    }
  }

  const handleSaveDraft = handleSubmit((values) => onSave("draft", values));
  const handleSaveStaging = handleSubmit((values) => onSave("staging", values));
  const handlePublish = handleSubmit((values) => onSave("live", values));

  async function handleUnpublish(): Promise<void> {
    if (!itemId) return;
    try {
      await unpublishItem.mutateAsync(itemId);
      toast.success("Item moved back to draft.");
      navigate(`/projects/${projectId}/collections/${collectionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unpublish item.");
    }
  }

  if (!project || !collection) {
    return (
      <div className="flex-1 p-6">
        <p className="text-sm text-muted-foreground">
          This collection doesn't exist, or you don't have access to it.
        </p>
      </div>
    );
  }

  if (isEditMode && itemQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isEditMode && itemQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Could not load this item.</p>
      </div>
    );
  }

  const isSaving =
    isSubmitting || createItem.isPending || updateItem.isPending || unpublishItem.isPending;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/projects/${projectId}/collections/${collectionId}`}>
            <ArrowLeft />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEditMode ? "Edit Item" : "New Item"}
          </h1>
          <p className="text-sm text-muted-foreground">{collection.name}</p>
        </div>
        {isEditMode && itemQuery.data && (
          <Badge
            variant={itemQuery.data.published ? "success" : "secondary"}
            className="ml-auto"
          >
            {itemQuery.data.published ? "Published" : "Draft"}
          </Badge>
        )}
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: rhfField }) => (
                    <Input
                      id="name"
                      value={typeof rhfField.value === "string" ? rhfField.value : ""}
                      onChange={rhfField.onChange}
                    />
                  )}
                />
                <FormError message={errors.name?.message as string | undefined} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Controller
                  control={control}
                  name="slug"
                  render={({ field: rhfField }) => (
                    <Input
                      id="slug"
                      value={typeof rhfField.value === "string" ? rhfField.value : ""}
                      onChange={rhfField.onChange}
                      disabled={isEditMode}
                      placeholder={isEditMode ? undefined : slugFromName || undefined}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {isEditMode
                    ? `URL slug: ${previewSlug || "—"} (unchanged when editing)`
                    : previewSlug
                      ? `Leave blank to use "${previewSlug}".`
                      : "Leave blank to generate a slug from the name."}
                </p>
                <FormError message={errors.slug?.message as string | undefined} />
              </div>

              {collection.fields.map((field) => (
                <div
                  key={field.key}
                  className={isWideField(field.type) ? "sm:col-span-2" : undefined}
                >
                  <DynamicField
                    field={field}
                    control={control}
                    error={errors[field.key]?.message as string | undefined}
                    projectId={projectId}
                    collectionId={collectionId}
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t pt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(`/projects/${projectId}/collections/${collectionId}`)}
              >
                Cancel
              </Button>
              {isEditMode && itemQuery.data?.published && permissions.canPublish && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => void handleUnpublish()}
                >
                  {isSaving && <Loader2 className="animate-spin" />}
                  Unpublish
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => void handleSaveDraft()}
              >
                {isSaving && <Loader2 className="animate-spin" />}
                Save Draft
              </Button>
              {permissions.canPublish && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => void handleSaveStaging()}
                >
                  {isSaving && <Loader2 className="animate-spin" />}
                  Save to Staging
                </Button>
              )}
              {permissions.canPublish && (
                <Button type="button" disabled={isSaving} onClick={() => void handlePublish()}>
                  {isSaving && <Loader2 className="animate-spin" />}
                  Publish
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
