import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { buildItemFormSchema, slugify } from "@cms-manager/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProject } from "@/api/projects";
import { useCreateItem, useItem, useUpdateItem } from "@/api/items";
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

  const titleField = collection?.fields.find((f) => f.isTitleField);

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
      ...Object.fromEntries(
        (collection?.fields ?? []).map((f) => [f.key, defaultValueFor(f.type)]),
      ),
      published: false,
    },
  });

  useEffect(() => {
    if (itemQuery.data && collection) {
      reset({
        ...Object.fromEntries(
          collection.fields.map((f) => [f.key, itemQuery.data.fieldData[f.key] ?? defaultValueFor(f.type)]),
        ),
        published: itemQuery.data.published,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemQuery.data, collection]);

  const titleValue = titleField ? watch(titleField.key) : undefined;
  const previewSlug = isEditMode
    ? itemQuery.data?.slug
    : typeof titleValue === "string"
      ? slugify(titleValue)
      : "";

  async function onSave(published: boolean, values: Record<string, unknown>): Promise<void> {
    const payload = { ...values, published };
    try {
      if (isEditMode) {
        await updateItem.mutateAsync(payload);
      } else {
        await createItem.mutateAsync(payload);
      }
      toast.success(published ? "Item published." : "Item saved as draft.");
      navigate(`/projects/${projectId}/collections/${collectionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save item.");
    }
  }

  const handleSaveDraft = handleSubmit((values) => onSave(false, values));
  const handlePublish = handleSubmit((values) => onSave(true, values));

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

  const isSaving = isSubmitting || createItem.isPending || updateItem.isPending;

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

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
            {collection.fields.map((field) => (
              <DynamicField
                key={field.key}
                field={field}
                control={control}
                error={errors[field.key]?.message as string | undefined}
                helperText={
                  field.isTitleField
                    ? previewSlug
                      ? `URL slug: ${previewSlug}${isEditMode ? " (unchanged when editing)" : ""}`
                      : undefined
                    : undefined
                }
              />
            ))}

            {permissions.canPublish && (
              <p className="text-xs text-muted-foreground">
                Publishing pushes this item live immediately. There's no way to
                unpublish from here afterward — marking it a draft again won't
                remove it from the live site; that has to be done directly in{" "}
                {project.cmsProvider === "webflow" ? "Webflow" : "the CMS"}.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(`/projects/${projectId}/collections/${collectionId}`)}
              >
                Cancel
              </Button>
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
