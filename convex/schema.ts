import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // User profiles with roles
  profiles: defineTable({
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    affiliation: v.string(),
    expertise: v.array(v.string()),
    role: v.union(v.literal("author"), v.literal("reviewer"), v.literal("editor"), v.literal("admin")),
    bio: v.optional(v.string()),
  }).index("by_user", ["userId"]).index("by_role", ["role"]),

  // Research paper submissions
  papers: defineTable({
    title: v.string(),
    abstract: v.string(),
    keywords: v.array(v.string()),
    authorId: v.id("users"),
    coAuthors: v.optional(v.array(v.string())),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("revision_requested"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("published")
    ),
    submissionDate: v.number(),
    category: v.string(),
    editorId: v.optional(v.id("users")),
    publishedDate: v.optional(v.number()),
    version: v.number(),
  }).index("by_author", ["authorId"])
    .index("by_status", ["status"])
    .index("by_editor", ["editorId"])
    .index("by_category", ["category"])
    .searchIndex("search_papers", {
      searchField: "title",
      filterFields: ["status", "category"]
    }),

  // Paper versions for revision tracking
  paperVersions: defineTable({
    paperId: v.id("papers"),
    version: v.number(),
    fileId: v.id("_storage"),
    fileName: v.string(),
    changes: v.optional(v.string()),
    uploadDate: v.number(),
  }).index("by_paper", ["paperId"]),

  // Peer reviews
  reviews: defineTable({
    paperId: v.id("papers"),
    reviewerId: v.id("users"),
    assignedBy: v.id("users"),
    assignedDate: v.number(),
    dueDate: v.number(),
    status: v.union(
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("declined")
    ),
    overallScore: v.optional(v.number()), // 1-5 scale
    technicalQuality: v.optional(v.number()),
    novelty: v.optional(v.number()),
    clarity: v.optional(v.number()),
    significance: v.optional(v.number()),
    comments: v.optional(v.string()),
    confidentialComments: v.optional(v.string()),
    recommendation: v.optional(v.union(
      v.literal("accept"),
      v.literal("minor_revision"),
      v.literal("major_revision"),
      v.literal("reject")
    )),
    submittedDate: v.optional(v.number()),
  }).index("by_paper", ["paperId"])
    .index("by_reviewer", ["reviewerId"])
    .index("by_status", ["status"]),

  // Editorial decisions
  editorialDecisions: defineTable({
    paperId: v.id("papers"),
    editorId: v.id("users"),
    decision: v.union(
      v.literal("accept"),
      v.literal("minor_revision"),
      v.literal("major_revision"),
      v.literal("reject")
    ),
    comments: v.string(),
    decisionDate: v.number(),
  }).index("by_paper", ["paperId"]),

  // Journal categories
  categories: defineTable({
    name: v.string(),
    description: v.string(),
    editorId: v.optional(v.id("users")),
  }),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("paper_submitted"),
      v.literal("review_assigned"),
      v.literal("review_completed"),
      v.literal("decision_made"),
      v.literal("revision_requested"),
      v.literal("paper_accepted"),
      v.literal("paper_published")
    ),
    title: v.string(),
    message: v.string(),
    paperId: v.optional(v.id("papers")),
    reviewId: v.optional(v.id("reviews")),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_read", ["read"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
