import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface PaperDetailsProps {
  paperId: string;
}

export function PaperDetails({ paperId }: PaperDetailsProps) {
  const paper = useQuery(api.papers.getPaper, { paperId: paperId as any });

  if (!paper) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors = {
      submitted: "bg-blue-100 text-blue-800",
      under_review: "bg-yellow-100 text-yellow-800",
      revision_requested: "bg-orange-100 text-orange-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      published: "bg-purple-100 text-purple-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getRecommendationColor = (recommendation: string) => {
    const colors = {
      accept: "text-green-600",
      minor_revision: "text-yellow-600",
      major_revision: "text-orange-600",
      reject: "text-red-600",
    };
    return colors[recommendation as keyof typeof colors] || "text-gray-600";
  };

  return (
    <div className="space-y-8">
      {/* Paper Header */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{paper.title}</h1>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(paper.status)}`}>
            {paper.status.replace("_", " ")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Author</h3>
            <p className="text-gray-600">{paper.authorName}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Category</h3>
            <p className="text-gray-600">{paper.category}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Submission Date</h3>
            <p className="text-gray-600">{new Date(paper.submissionDate).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Version</h3>
            <p className="text-gray-600">{paper.version}</p>
          </div>
        </div>

        {paper.coAuthors && paper.coAuthors.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Co-Authors</h3>
            <p className="text-gray-600">{paper.coAuthors.join(", ")}</p>
          </div>
        )}

        {paper.keywords.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {paper.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {paper.fileUrl && (
          <div className="mb-6">
            <a
              href={paper.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              📄 View PDF
            </a>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Abstract</h3>
          <p className="text-gray-600 leading-relaxed">{paper.abstract}</p>
        </div>
      </div>

      {/* Reviews */}
      {paper.reviews && paper.reviews.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>
          <div className="space-y-6">
            {paper.reviews.map((review) => (
              <div key={review._id} className="border-l-4 border-blue-200 pl-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Review by {review.reviewerName}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {review.submittedDate 
                        ? `Submitted on ${new Date(review.submittedDate).toLocaleDateString()}`
                        : `Assigned on ${new Date(review.assignedDate).toLocaleDateString()}`
                      }
                    </p>
                  </div>
                  {review.recommendation && (
                    <span className={`font-medium ${getRecommendationColor(review.recommendation)}`}>
                      {review.recommendation.replace("_", " ")}
                    </span>
                  )}
                </div>

                {review.overallScore && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Overall</p>
                      <p className="text-lg font-semibold">{review.overallScore}/5</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Technical</p>
                      <p className="text-lg font-semibold">{review.technicalQuality}/5</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Novelty</p>
                      <p className="text-lg font-semibold">{review.novelty}/5</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Clarity</p>
                      <p className="text-lg font-semibold">{review.clarity}/5</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Significance</p>
                      <p className="text-lg font-semibold">{review.significance}/5</p>
                    </div>
                  </div>
                )}

                {review.comments && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">Comments</h5>
                    <p className="text-gray-600 whitespace-pre-wrap">{review.comments}</p>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  Status: <span className="capitalize">{review.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editorial Decisions */}
      {paper.editorialDecisions && paper.editorialDecisions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Editorial Decisions</h2>
          <div className="space-y-4">
            {paper.editorialDecisions.map((decision, index) => (
              <div key={index} className="border-l-4 border-green-200 pl-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900">
                    Decision: <span className={getRecommendationColor(decision.decision)}>
                      {decision.decision.replace("_", " ")}
                    </span>
                  </h4>
                  <p className="text-sm text-gray-500">
                    {new Date(decision.decisionDate).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-gray-600 whitespace-pre-wrap">{decision.comments}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
