import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create or update user profile
export const createProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    affiliation: v.string(),
    expertise: v.array(v.string()),
    role: v.union(v.literal("author"), v.literal("reviewer"), v.literal("editor"), v.literal("admin")),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        affiliation: args.affiliation,
        expertise: args.expertise,
        role: args.role,
        bio: args.bio,
      });
      return existingProfile._id;
    } else {
      return await ctx.db.insert("profiles", {
        userId,
        firstName: args.firstName,
        lastName: args.lastName,
        affiliation: args.affiliation,
        expertise: args.expertise,
        role: args.role,
        bio: args.bio,
      });
    }
  },
});

// Get current user's profile
export const getMyProfile = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// Seed default categories
export const seedCategories = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("categories").collect();
    if (existing.length > 0) return;
    
    const categories = [
      { name: "Computer Science", description: "General CS research" },
      { name: "Machine Learning", description: "ML and AI research" },
      { name: "Software Engineering", description: "Software development" },
      { name: "Data Science", description: "Data analysis research" },
    ];
    
    for (const cat of categories) {
      await ctx.db.insert("categories", cat);
    }
  },
});

// Get all categories
export const getCategories = query({
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

// Create category (admin only)
export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    editorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile?.role !== "admin") {
      throw new Error("Only admins can create categories");
    }

    return await ctx.db.insert("categories", {
      name: args.name,
      description: args.description,
      editorId: args.editorId,
    });
  },
});

// Get notifications for current user
export const getMyNotifications = query({
  args: { unreadOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let query = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    const notifications = await query.collect();

    const filtered = args.unreadOnly 
      ? notifications.filter(n => !n.read)
      : notifications;

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Mark notification as read
export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found or not authorized");
    }

    await ctx.db.patch(args.notificationId, { read: true });
    return args.notificationId;
  },
});
