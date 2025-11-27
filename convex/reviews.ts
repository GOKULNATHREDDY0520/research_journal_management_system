import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Assign reviewer to paper
export const assignReviewer = mutation({
  args: {
    paperId: v.id("papers"),
    reviewerId: v.id("users"),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile?.role !== "editor" && profile?.role !== "admin") {
      throw new Error("Only editors can assign reviewers");
    }

    const reviewId = await ctx.db.insert("reviews", {
      paperId: args.paperId,
      reviewerId: args.reviewerId,
      assignedBy: userId,
      assignedDate: Date.now(),
      dueDate: args.dueDate,
      status: "assigned",
    });

    // Create notification for reviewer
    const paper = await ctx.db.get(args.paperId);
    await ctx.db.insert("notifications", {
      userId: args.reviewerId,
      type: "review_assigned",
      title: "Review Assignment",
      message: `You have been assigned to review "${paper?.title}"`,
      paperId: args.paperId,
      reviewId,
      read: false,
      createdAt: Date.now(),
    });

    return reviewId;
  },
});

// Get reviews assigned to current user
export const getMyReviews = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let query = ctx.db
      .query("reviews")
      .withIndex("by_reviewer", (q) => q.eq("reviewerId", userId));

    const reviews = await query.collect();

    const filteredReviews = args.status 
      ? reviews.filter(r => r.status === args.status)
      : reviews;

    const reviewsWithPapers = await Promise.all(
      filteredReviews.map(async (review) => {
        const paper = await ctx.db.get(review.paperId);
        const authorProfile = paper ? await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", paper.authorId))
          .first() : null;

        return {
          ...review,
          paper: paper ? {
            ...paper,
            authorName: authorProfile 
              ? `${authorProfile.firstName} ${authorProfile.lastName}`
              : "Unknown",
            fileUrl: paper.fileId ? await ctx.storage.getUrl(paper.fileId) : null,
          } : null,
        };
      })
    );

    return reviewsWithPapers.sort((a, b) => b.assignedDate - a.assignedDate);
  },
});

// Submit review
export const submitReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    overallScore: v.number(),
    technicalQuality: v.number(),
    novelty: v.number(),
    clarity: v.number(),
    significance: v.number(),
    comments: v.string(),
    confidentialComments: v.optional(v.string()),
    recommendation: v.union(
      v.literal("accept"),
      v.literal("minor_revision"),
      v.literal("major_revision"),
      v.literal("reject")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const review = await ctx.db.get(args.reviewId);
    if (!review || review.reviewerId !== userId) {
      throw new Error("Review not found or not authorized");
    }

    await ctx.db.patch(args.reviewId, {
      overallScore: args.overallScore,
      technicalQuality: args.technicalQuality,
      novelty: args.novelty,
      clarity: args.clarity,
      significance: args.significance,
      comments: args.comments,
      confidentialComments: args.confidentialComments,
      recommendation: args.recommendation,
      status: "completed",
      submittedDate: Date.now(),
    });

    // Create notification for editor
    const paper = await ctx.db.get(review.paperId);
    if (paper?.editorId) {
      await ctx.db.insert("notifications", {
        userId: paper.editorId,
        type: "review_completed",
        title: "Review Completed",
        message: `Review for "${paper.title}" has been completed`,
        paperId: review.paperId,
        reviewId: args.reviewId,
        read: false,
        createdAt: Date.now(),
      });
    }

    return args.reviewId;
  },
});

// Get available reviewers
export const getAvailableReviewers = query({
  args: { expertise: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile?.role !== "editor" && profile?.role !== "admin") {
      return [];
    }

    let reviewers = await ctx.db
      .query("profiles")
      .withIndex("by_role", (q) => q.eq("role", "reviewer"))
      .collect();

    if (args.expertise) {
      reviewers = reviewers.filter(reviewer => 
        reviewer.expertise.some(exp => 
          exp.toLowerCase().includes(args.expertise!.toLowerCase())
        )
      );
    }

    return reviewers;
  },
});

// Accept or decline review assignment
export const respondToReviewAssignment = mutation({
  args: {
    reviewId: v.id("reviews"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const review = await ctx.db.get(args.reviewId);
    if (!review || review.reviewerId !== userId) {
      throw new Error("Review not found or not authorized");
    }

    await ctx.db.patch(args.reviewId, {
      status: args.accept ? "in_progress" : "declined",
    });

    // If declined, notify the editor
    if (!args.accept) {
      const paper = await ctx.db.get(review.paperId);
      if (paper?.editorId) {
        await ctx.db.insert("notifications", {
          userId: paper.editorId,
          type: "review_assigned",
          title: "Review Declined",
          message: `Reviewer declined to review "${paper.title}"`,
          paperId: review.paperId,
          reviewId: args.reviewId,
          read: false,
          createdAt: Date.now(),
        });
      }
    }

    return args.reviewId;
  },
});
