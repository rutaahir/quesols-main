import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Star, CheckCircle2, Send, Heart, AlertCircle, Monitor, Sparkles, Building2 } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/quesole/store";

export const Route = createFileRoute("/feedback/$trackingCode")({
  head: () => ({
    meta: [
      { title: "Service Feedback & Reply — Quesole" },
      { name: "description", content: "Rate your visit experience and reply directly to counter staff." },
    ],
  }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const { trackingCode } = Route.useParams();
  const [ticketData, setTicketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number>(0); // Default 0 (Do NOT autofill stars)
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadTicket = async () => {
      try {
        const data = await apiFetch(`/api/public/tickets/${trackingCode}/feedback/`);
        if (isMounted && data) {
          setTicketData(data);
          if (data.feedback_rating) setRating(data.feedback_rating);
          if (data.feedback_text) setFeedbackText(data.feedback_text);
          if (data.feedback_submitted_at) setSubmitted(true);
        }
      } catch (err) {
        console.error("Failed to load feedback details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadTicket();
  }, [trackingCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a star rating (1 to 5 stars) before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/public/tickets/${trackingCode}/feedback/`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          feedback_text: feedbackText,
        }),
      });
      setSubmitted(true);
      toast.success("Feedback & reply submitted! Thank you!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 pb-20">
      <div className="max-w-xl w-full mx-auto my-auto space-y-6">
        {/* Header Company Branding (Show Company Logo instead of Quesole Logo) */}
        <div className="flex items-center justify-center gap-2 py-2">
          {ticketData?.company_logo ? (
            <img
              src={ticketData.company_logo}
              alt={ticketData.company_name || "Company Logo"}
              className="h-12 max-w-[240px] object-contain mx-auto drop-shadow-sm"
            />
          ) : (
            <div className="text-xl font-black text-foreground tracking-tight flex items-center justify-center gap-2.5 bg-white dark:bg-slate-900 border border-border/60 px-6 py-3 rounded-2xl shadow-soft">
              <Building2 className="h-6 w-6 text-primary" />
              <span>{ticketData?.company_name || "Service Center"}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-3xl p-8 shadow-xl text-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-semibold text-muted-foreground">Loading your ticket resolution status...</p>
          </div>
        ) : ticketData ? (
          <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            {/* Status Hero Header */}
            <div className="text-center space-y-2 border-b border-border/40 pb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {ticketData.status === "served" ? "Query Resolved & Served" : "Query Escalated to Supervisor"}
              </div>

              <div className="pt-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block">Token Number</span>
                <span className="text-4xl font-black tracking-tight text-primary font-mono block mt-0.5">{ticketData.token_number}</span>
              </div>

              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Thank you for visiting <strong className="text-foreground">{ticketData.branch_name}</strong>. Please rate your experience and send a reply message to our counter staff.
              </p>
            </div>

            {/* Ticket Summary Pills */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-border/40">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assigned Desk</span>
                <span className="font-extrabold text-foreground block mt-0.5 flex items-center gap-1.5">
                  <Monitor className="h-3.5 w-3.5 text-primary shrink-0" />
                  {ticketData.desk_name}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-border/40">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Service Category</span>
                <span className="font-extrabold text-foreground block mt-0.5 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand shrink-0" />
                  {ticketData.service_name}
                </span>
              </div>
            </div>

            {submitted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3 animate-in fade-in zoom-in duration-300">
                <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <Heart className="h-6 w-6 fill-current" />
                </div>
                <h3 className="text-base font-black text-foreground">Feedback &amp; Reply Sent!</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Thank you <strong>{ticketData.customer_name}</strong>! Your {rating}-star rating and reply message have been logged live on our operator and branch admin console.
                </p>
                {feedbackText && (
                  <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 rounded-xl p-3 text-xs text-foreground italic text-left">
                    "{feedbackText}"
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubmitted(false)}
                  className="text-xs font-bold mt-2"
                >
                  Edit Feedback / Reply
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                {/* 5-Star Rating Selector (No Autofill by default) */}
                <div className="space-y-2 text-center">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block">
                    Rate Your Experience
                  </label>
                  <div className="flex items-center justify-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1.5 focus:outline-none transition-transform hover:scale-125"
                      >
                        <Star
                          className={`h-8 w-8 transition-colors ${
                            star <= (hoverRating || rating)
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-300 dark:text-slate-700"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-amber-500 block">
                    {rating === 0
                      ? "Tap stars to rate your visit (1 - 5 stars)"
                      : rating === 5
                      ? "⭐⭐⭐⭐⭐ Exceptional"
                      : rating === 4
                      ? "⭐⭐⭐⭐ Great"
                      : rating === 3
                      ? "⭐⭐⭐ Satisfactory"
                      : rating === 2
                      ? "⭐⭐ Needs Improvement"
                      : "⭐ Poor"}
                  </span>
                </div>

                {/* Reply / Feedback Message Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">
                    Your Reply / Message to Counter Operator
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Type your response, review or follow-up query to the operator..."
                    className="w-full rounded-2xl border border-border/80 bg-slate-50/50 dark:bg-slate-800/50 p-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  variant="brand"
                  className="w-full h-11 text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-brand/20 gap-2"
                >
                  {submitting ? (
                    <>Sending Reply...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit Feedback &amp; Send Reply
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-3xl p-8 shadow-xl text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-black text-foreground">Ticket Details Not Found</h3>
            <p className="text-xs text-muted-foreground">The ticket code provided does not exist or has expired.</p>
          </div>
        )}
      </div>

      {/* Sticky Bottom Footer Line: Powered by Quesoles */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-border/50 py-3 text-center text-xs text-muted-foreground font-semibold flex items-center justify-center gap-2 shadow-lg">
        <span>Powered by</span>
        <Logo size={18} />
      </footer>
    </div>
  );
}
