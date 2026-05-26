// Inlined copy of examples/canonical_workflow.agi for the Sprint 0 bench.
//
// At MVP time this gets replaced by a Rust command that reads the file
// from disk; for now we embed the source so the renderer is the only
// thing we're validating.

export const CANONICAL_AGI_SOURCE = `// canonical_workflow.agi
// The fixture that drives every Agicore Studio milestone demo.

APP studio_demo {
  TITLE  "Studio Demo — Summarize and Post"
  DB     studio_demo.db
}

WORKFLOW summarize_and_post {
  DESCRIPTION "Fetch an article, summarize with AI, get human approval, post the summary."

  INPUT  article_url: string, destination_url: string
  OUTPUT posted_summary: string, was_approved: bool

  NODE fetch_article {
    TYPE      http_call
    METHOD    GET
    URL       "{{input.article_url}}"
    OUTPUT    body: string
  }

  NODE summarize {
    TYPE      ai_call
    PROMPT    "Summarize the following article in three sentences. Be concise and factual.\\n\\n{{fetch_article.body}}"
    OUTPUT    summary: string
  }

  NODE human_review {
    TYPE      qc_checkpoint
    PROMPT    "Review the AI summary. Approve, edit, or reject."
    INPUT     summary: string FROM summarize.summary
    OUTPUT    decision: string, final_summary: string
  }

  NODE post_summary {
    TYPE      http_call
    METHOD    POST
    URL       "{{input.destination_url}}"
    BODY      { summary: "{{human_review.final_summary}}" }
    WHEN      human_review.decision == "approved" OR human_review.decision == "edited"
    OUTPUT    status_code: number
  }

  EDGE fetch_article -> summarize
  EDGE summarize     -> human_review
  EDGE human_review  -> post_summary
}
`;
