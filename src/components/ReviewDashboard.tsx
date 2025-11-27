import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ReviewDashboard() {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedReview, setSelectedReview] = useState<any>(null);
  
  const reviews = useQuery(api.reviews.getMyReviews, 
    selectedStatus ? { status: selectedStatus } : {}
  );
  
  const respondToAssignment = useMutation(api.reviews.respondToReviewAssignment);

  const statusOptions = [
    { value: "", label: "All Reviews" },
    { value: "assigned", label: "Assigned" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "declined", label: "Declined" },
  ];

  const handleRespond = async (reviewId: string, accept: boolean) => {
    try {
      await respondToAssignment({ reviewId: reviewId as any, accept });
      toast.success(accept ? "Review accepted" : "Review declined");
    } catch (error) {
      toast.error("Failed to respond to review assignment");
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      assigned: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (selectedReview) {
    return (
      <div>
        <button
          onClick={() => setSelectedReview(null)}
          className="mb-4 text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Reviews
        </button>
        <ReviewForm review={selectedReview} onComplete={() => setSelectedReview(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Reviews</h2>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {reviews === undefined ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reviews found.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {reviews.map((review) => (
            <div
              key={review._id}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {review.paper?.title}
                  </h3>
                  <p className="text-gray-600">by {review.paper?.authorName}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(review.status)}`}>
                  {review.status.replace("_", " ")}
                </span>
              </div>

              {review.paper && (
                <p className="text-gray-600 mb-4 line-clamp-2">{review.paper.abstract}</p>
              )}

              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>Assigned: {new Date(review.assignedDate).toLocaleDateString()}</span>
                <span>Due: {new Date(review.dueDate).toLocaleDateString()}</span>
              </div>

              {review.paper?.fileUrl && (
                <div className="mb-4">
                  <a
                    href={review.paper.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    📄 View PDF
                  </a>
                </div>
              )}

              <div className="flex gap-3">
                {review.status === "assigned" && (
                  <>
                    <button
                      onClick={() => handleRespond(review._id, true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Accept Review
                    </button>
                    <button
                      onClick={() => handleRespond(review._id, false)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Decline Review
                    </button>
                  </>
                )}
                
                {review.status === "in_progress" && (
                  <button
                    onClick={() => setSelectedReview(review)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Submit Review
                  </button>
                )}

                {review.status === "completed" && review.recommendation && (
                  <div className="text-sm">
                    <span className="font-medium">Recommendation:</span>{" "}
                    <span className="capitalize">{review.recommendation.replace("_", " ")}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ review, onComplete }: { review: any; onComplete: () => void }) {
  const [overallScore, setOverallScore] = useState(3);
  const [technicalQuality, setTechnicalQuality] = useState(3);
  const [novelty, setNovelty] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [significance, setSignificance] = useState(3);
  const [comments, setComments] = useState("");
  const [confidentialComments, setConfidentialComments] = useState("");
  const [recommendation, setRecommendation] = useState<"accept" | "minor_revision" | "major_revision" | "reject">("minor_revision");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReview = useMutation(api.reviews.submitReview);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comments.trim()) {
      toast.error("Please provide comments for the review");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReview({
        reviewId: review._id,
        overallScore,
        technicalQuality,
        novelty,
        clarity,
        significance,
        comments: comments.trim(),
        confidentialComments: confidentialComments.trim() || undefined,
        recommendation,
      });
      
      toast.success("Review submitted successfully!");
      onComplete();
    } catch (error) {
      toast.error("Failed to submit review");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ScoreInput = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} ({value}/5)
      </label>
      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Review</h2>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">{review.paper?.title}</h3>
        <p className="text-gray-600 text-sm">by {review.paper?.authorName}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScoreInput label="Overall Score" value={overallScore} onChange={setOverallScore} />
          <ScoreInput label="Technical Quality" value={technicalQuality} onChange={setTechnicalQuality} />
          <ScoreInput label="Novelty" value={novelty} onChange={setNovelty} />
          <ScoreInput label="Clarity" value={clarity} onChange={setClarity} />
          <ScoreInput label="Significance" value={significance} onChange={setSignificance} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recommendation
          </label>
          <select
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="accept">Accept</option>
            <option value="minor_revision">Minor Revision</option>
            <option value="major_revision">Major Revision</option>
            <option value="reject">Reject</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comments for Authors *
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Provide detailed feedback for the authors..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confidential Comments for Editor
          </label>
          <textarea
            value={confidentialComments}
            onChange={(e) => setConfidentialComments(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional comments visible only to the editor..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSubmitting ? "Submitting Review..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}