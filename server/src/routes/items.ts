import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { buildItemFormSchema, type PublishTarget } from "@cms-manager/shared";
import { verifyAuth } from "../middleware/auth";
import { requireCollectionPermission } from "../middleware/collectionPermission";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { itemService } from "../services/itemService";
import { activityLogService } from "../services/activityLogService";

/** `mergeParams` so `req.params.id` (project) and `req.params.collectionId` from the mount path in app.ts reach the route handlers here. */
export const itemsRouter = Router({ mergeParams: true });

itemsRouter.use(verifyAuth);

/** In-memory only — files are streamed straight through to Webflow's asset storage, never written to disk here (Section 6). */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new AppError("Only image files can be uploaded.", 400));
      return;
    }
    cb(null, true);
  },
});

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/** Needed by both the create and edit forms — gated on either grant, not just `canCreate` (Section 6). */
itemsRouter.post(
  "/assets",
  requireCollectionPermission(["canCreate", "canEdit"]),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError("No file uploaded.", 400);
    }
    const { url } = await itemService.uploadAsset(req.project!, {
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    res.json({ url });
  }),
);

itemsRouter.get(
  "/",
  requireCollectionPermission("canView"),
  asyncHandler(async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const result = await itemService.listItems(req.project!, req.collection!, query);
    res.json(result);
  }),
);

itemsRouter.get(
  "/:itemId",
  requireCollectionPermission("canView"),
  asyncHandler(async (req, res) => {
    const item = await itemService.getItem(
      req.project!,
      req.collection!,
      req.params.itemId!,
    );
    res.json({ item });
  }),
);

/** "Save Draft" only needs `canCreate`; "Save to Staging"/"Publish" additionally need `canPublish` — checked here against the resolved grant the middleware already attached, not a second lookup (Section 5). */
itemsRouter.post(
  "/",
  requireCollectionPermission("canCreate"),
  asyncHandler(async (req, res) => {
    const schema = buildItemFormSchema(req.collection!.fields);
    // The dynamic shape (built from a runtime FieldMapping[] loop) can't
    // carry per-key literal types through z.infer — `publishTarget` is
    // added via the same mechanism, so it needs the same explicit
    // annotation.
    const { publishTarget, ...fieldValues } = schema.parse(req.body) as Record<
      string,
      unknown
    > & { publishTarget: PublishTarget };

    if (publishTarget !== "draft" && !req.collectionPermissions!.canPublish) {
      throw new AppError(
        "You do not have permission to publish items in this collection.",
        403,
      );
    }

    const item = await itemService.createItem(
      req.project!,
      req.collection!,
      fieldValues,
      publishTarget,
    );

    await activityLogService.logActivity({
      projectId: req.project!.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "CREATE_ITEM",
      collectionId: req.collection!.id,
      itemId: item.id,
      targetUserId: null,
      previousData: null,
      newData: item,
    });

    res.status(201).json({ item });
  }),
);

itemsRouter.patch(
  "/:itemId",
  requireCollectionPermission("canEdit"),
  asyncHandler(async (req, res) => {
    const schema = buildItemFormSchema(req.collection!.fields);
    const { publishTarget, ...fieldValues } = schema.parse(req.body) as Record<
      string,
      unknown
    > & { publishTarget: PublishTarget };

    if (publishTarget !== "draft" && !req.collectionPermissions!.canPublish) {
      throw new AppError(
        "You do not have permission to publish items in this collection.",
        403,
      );
    }

    const previousData = await itemService.getItem(
      req.project!,
      req.collection!,
      req.params.itemId!,
    );
    const item = await itemService.updateItem(
      req.project!,
      req.collection!,
      req.params.itemId!,
      fieldValues,
      publishTarget,
    );

    await activityLogService.logActivity({
      projectId: req.project!.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "UPDATE_ITEM",
      collectionId: req.collection!.id,
      itemId: item.id,
      targetUserId: null,
      previousData,
      newData: item,
    });

    res.json({ item });
  }),
);

itemsRouter.delete(
  "/:itemId",
  requireCollectionPermission("canDelete"),
  asyncHandler(async (req, res) => {
    const previousData = await itemService.getItem(
      req.project!,
      req.collection!,
      req.params.itemId!,
    );
    await itemService.deleteItem(req.project!, req.collection!, req.params.itemId!);

    await activityLogService.logActivity({
      projectId: req.project!.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "DELETE_ITEM",
      collectionId: req.collection!.id,
      itemId: req.params.itemId!,
      targetUserId: null,
      previousData,
      newData: null,
    });

    res.status(204).end();
  }),
);

itemsRouter.post(
  "/:itemId/publish",
  requireCollectionPermission("canPublish"),
  asyncHandler(async (req, res) => {
    const previousData = await itemService.getItem(
      req.project!,
      req.collection!,
      req.params.itemId!,
    );
    const item = await itemService.publishItem(
      req.project!,
      req.collection!,
      req.params.itemId!,
    );

    await activityLogService.logActivity({
      projectId: req.project!.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "PUBLISH_ITEM",
      collectionId: req.collection!.id,
      itemId: item.id,
      targetUserId: null,
      previousData,
      newData: item,
    });

    res.json({ item });
  }),
);

itemsRouter.post(
  "/:itemId/unpublish",
  requireCollectionPermission("canPublish"),
  asyncHandler(async (req, res) => {
    const previousData = await itemService.getItem(
      req.project!,
      req.collection!,
      req.params.itemId!,
    );
    const item = await itemService.unpublishItem(
      req.project!,
      req.collection!,
      req.params.itemId!,
    );

    await activityLogService.logActivity({
      projectId: req.project!.id,
      userId: req.user!.uid,
      userEmail: req.user!.email,
      action: "UNPUBLISH_ITEM",
      collectionId: req.collection!.id,
      itemId: item.id,
      targetUserId: null,
      previousData,
      newData: item,
    });

    res.json({ item });
  }),
);
