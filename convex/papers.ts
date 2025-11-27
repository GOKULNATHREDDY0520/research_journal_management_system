import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Submit a new paper
export const submitPaper = mutation({
  args: {
    title: v.string(),
    abstract: v.string(),
    keywords: v.array(v.string()),
    coAuthors: v.optional(v.array(v.string())),
    category: v.string(),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const paperId = await ctx.db.insert("papers", {
      title: args.title,
      abstract: args.abstract,
      keywords: args.keywords,
      authorId: userId,
      coAuthors: args.coAuthors,
      fileId: args.fileId,
      fileName: args.fileName,
      status: "submitted",
      submissionDate: Date.now(),
      category: args.category,
      version: 1,
    });

    // Create notification for editors
    const editors = await ctx.db
      .query("profiles")
      .withIndex("by_role", (q) => q.eq("role", "editor"))
      .collect();

    for (const editor of editors) {
      await ctx.db.insert("notifications", {
        userId: editor.userId,
        type: "paper_submitted",
        title: "New Paper Submission",
        message: `New paper "${args.title}" has been submitted`,
        paperId,
        read: false,
        createdAt: Date.now(),
      });
    }

    return paperId;
  },
});

// Get papers by status for dashboard
export const getPapersByStatus = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const papers = args.status 
      ? await ctx.db
          .query("papers")
          .withIndex("by_status", (q) => q.eq("status", args.status as any))
          .collect()
      : await ctx.db.query("papers").collect();

    // Filter based on user role
    const filteredPapers = papers.filter(paper => {
      if (profile?.role === "admin" || profile?.role === "editor") {
        return true; // Editors and admins see all papers
      }
      return paper.authorId === userId; // Authors see only their papers
    });

    // Get author details for each paper
    const papersWithAuthors = await Promise.all(
      filteredPapers.map(async (paper) => {
        const author = await ctx.db.get(paper.authorId);
        const authorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", paper.authorId))
          .first();

        return {
          ...paper,
          authorName: authorProfile 
            ? `${authorProfile.firstName} ${authorProfile.lastName}`
            : author?.email || "Unknown",
          fileUrl: paper.fileId ? await ctx.storage.getUrl(paper.fileId) : null,
        };
      })
    );

    return papersWithAuthors.sort((a, b) => b.submissionDate - a.submissionDate);
  },
});

// Get single paper with details
export const getPaper = query({
  args: { paperId: v.id("papers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const paper = await ctx.db.get(args.paperId);
    if (!paper) return null;

    const author = await ctx.db.get(paper.authorId);
    const authorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", paper.authorId))
      .first();

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_paper", (q) => q.eq("paperId", args.paperId))
      .collect();

    const reviewsWithReviewers = await Promise.all(
      reviews.map(async (review) => {
        const reviewerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", review.reviewerId))
          .first();
        
        return {
          ...review,
          reviewerName: reviewerProfile 
            ? `${reviewerProfile.firstName} ${reviewerProfile.lastName}`
            : "Anonymous",
        };
      })
    );

    const editorialDecisions = await ctx.db
      .query("editorialDecisions")
      .withIndex("by_paper", (q) => q.eq("paperId", args.paperId))
      .collect();

    return {
      ...paper,
      authorName: authorProfile 
        ? `${authorProfile.firstName} ${authorProfile.lastName}`
        : author?.email || "Unknown",
      fileUrl: paper.fileId ? await ctx.storage.getUrl(paper.fileId) : null,
      reviews: reviewsWithReviewers,
      editorialDecisions,
    };
  },
});

// Search papers
export const searchPapers = query({
  args: { 
    query: v.string(),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let searchQuery = ctx.db
      .query("papers")
      .withSearchIndex("search_papers", (q) => {
        let search = q.search("title", args.query);
        if (args.category) {
          search = search.eq("category", args.category);
        }
        if (args.status) {
          search = search.eq("status", args.status as any);
        }
        return search;
      });

    const papers = await searchQuery.take(20);

    const papersWithAuthors = await Promise.all(
      papers.map(async (paper) => {
        const authorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", paper.authorId))
          .first();

        return {
          ...paper,
          authorName: authorProfile 
            ? `${authorProfile.firstName} ${authorProfile.lastName}`
            : "Unknown",
        };
      })
    );

    return papersWithAuthors;
  },
});

// Generate upload URL for paper files
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Update paper status (for editors)
export const updatePaperStatus = mutation({
  args: {
    paperId: v.id("papers"),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("revision_requested"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("published")
    ),
    editorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile?.role !== "editor" && profile?.role !== "admin") {
      throw new Error("Only editors can update paper status");
    }

    await ctx.db.patch(args.paperId, {
      status: args.status,
      editorId: args.editorId || userId,
    });

    // Create notification for author
    const paper = await ctx.db.get(args.paperId);
    if (paper) {
      await ctx.db.insert("notifications", {
        userId: paper.authorId,
        type: "decision_made",
        title: "Paper Status Updated",
        message: `Your paper "${paper.title}" status has been updated to ${args.status}`,
        paperId: args.paperId,
        read: false,
        createdAt: Date.now(),
      });
    }

    return args.paperId;
  },
});
