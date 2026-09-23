import { useState } from "react";
import { 
  X, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  FileText, 
  Send, 
  RotateCw, 
  ArrowRightLeft, 
  Star, 
  Sparkles,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Building2,
  CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/quesole/store";
import { getNetworkOrigin } from "@/lib/api-config";
import { cn } from "@/lib/utils";

interface AppointmentCustomerModalProps {
  booking: any;
  onClose: () => void;
  onRefresh: () => void;
  services: any[];
  desks: any[];
}

export function AppointmentCustomerModal({
  booking,
  onClose,
  onRefresh,
  services = [],
  desks = []
}: AppointmentCustomerModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "escalate" | "notes" | "feedback">("overview");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reschedule State
  const [rescheduleDate, setRescheduleDate] = useState(booking.date || "");
  const [rescheduleSlot, setRescheduleSlot] = useState(booking.slot_time ? booking.slot_time.substring(0, 5) : "10:00");
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Escalate / Transfer State
  const [selectedServiceId, setSelectedServiceId] = useState(booking.service ? String(booking.service) : "");
  const [selectedDeskId, setSelectedDeskId] = useState(booking.desk ? String(booking.desk) : "");
  const [escalationNote, setEscalationNote] = useState("");

  // Staff Internal Notes State
  const [newNote, setNewNote] = useState("");

  const rawEmail = booking.customer_email || booking.email || "";
  const isRealEmail = rawEmail && !rawEmail.startsWith("bookings+anon_") && !rawEmail.includes("@quesole.com");

  const rawName = booking.customer_name || "Valued Customer";
  const displayName = rawName.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

  const serviceObj = services.find((s: any) => String(s.id) === String(booking.service));
  const serviceName = serviceObj?.name || "General Service";

  const deskObj = desks.find((d: any) => String(d.id) === String(booking.desk));
  const deskName = deskObj?.name || "Appointment Counter";

  const feedbackUrl = `${getNetworkOrigin()}/feedback/${booking.booking_reference}`;

  // Update Status
  const handleUpdateStatus = async (newStatus: string) => {
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/online-bookings/${booking.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      toast.success(`Booking ${booking.booking_reference} status updated to ${newStatus.replace('_', ' ')}.`);
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Reschedule
  const handleSaveReschedule = async () => {
    if (!rescheduleDate || !rescheduleSlot) {
      toast.error("Please select a date and slot time.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/online-bookings/${booking.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          date: rescheduleDate,
          slot_time: rescheduleSlot
        })
      });
      toast.success(`Appointment ${booking.booking_reference} rescheduled successfully!`);
      setIsRescheduling(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to reschedule appointment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Escalation / Transfer
  const handleSaveEscalation = async () => {
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/online-bookings/${booking.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          service: selectedServiceId || null,
          desk: selectedDeskId || null,
          escalated_notes: escalationNote.trim()
        })
      });
      toast.success(`Appointment ${booking.booking_reference} transferred / escalated successfully!`);
      setEscalationNote("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to escalate appointment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Internal Staff Note
  const handleAddStaffNote = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    try {
      const existing = booking.internal_notes || "";
      const timestamp = new Date().toLocaleString();
      const updatedNotes = existing ? `${existing}\n[${timestamp}] ${newNote.trim()}` : `[${timestamp}] ${newNote.trim()}`;
      
      await apiFetch(`/api/online-bookings/${booking.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          internal_notes: updatedNotes
        })
      });
      toast.success("Staff note added!");
      setNewNote("");
      booking.internal_notes = updatedNotes;
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to add note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const STATUS_BADGES: Record<string, React.ReactNode> = {
    confirmed: <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20">Confirmed</span>,
    checked_in: <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Checked In</span>,
    completed: <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20">Completed</span>,
    no_show: <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/20">No Show</span>,
    cancelled: <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-gray-500/10 text-gray-600 border border-gray-500/20">Cancelled</span>,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-border/80 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Top Header & Customer Bio Strip */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {booking.customer_photo ? (
              <img
                src={booking.customer_photo}
                alt={displayName}
                className="h-20 w-20 rounded-full object-cover border-4 border-white/20 shadow-lg shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-indigo-600/50 border-4 border-white/20 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-lg">
                {displayName.charAt(0)}
              </div>
            )}

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-black tracking-tight">{displayName}</h2>
                <div className="bg-white/10 px-3 py-0.5 rounded-full text-xs font-mono font-bold text-indigo-200 border border-white/10">
                  {booking.booking_reference}
                </div>
              </div>

              <div className="text-xs text-white/70 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
                {booking.customer_phone && <span>📱 {booking.customer_phone}</span>}
                {isRealEmail && <span>✉️ {rawEmail}</span>}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {STATUS_BADGES[booking.status] || <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10">{booking.status}</span>}
                <span className="text-xs text-white/60 font-medium">
                  Scheduled: {booking.date} · {booking.slot_time?.substring(0, 5)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons Toolbar */}
        <div className="bg-muted/40 border-b border-border/60 p-3 px-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {booking.status === "confirmed" && (
              <Button
                size="sm"
                variant="brand"
                disabled={isSubmitting}
                className="rounded-xl text-xs font-bold gap-1 h-8 px-3"
                onClick={() => handleUpdateStatus("checked_in")}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Check-In / Call
              </Button>
            )}

            {["confirmed", "checked_in"].includes(booking.status) && (
              <Button
                size="sm"
                variant="default"
                disabled={isSubmitting}
                className="rounded-xl text-xs font-bold gap-1 h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleUpdateStatus("completed")}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Mark Resolved & Request Feedback
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs font-bold gap-1 h-8 px-3"
              onClick={() => setIsRescheduling(!isRescheduling)}
            >
              <RotateCw className="h-3.5 w-3.5 text-indigo-500" /> Reschedule
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            {["confirmed", "checked_in"].includes(booking.status) && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  className="rounded-xl text-xs font-bold text-amber-600 border-amber-500/30 hover:bg-amber-500/10 h-8 px-2.5"
                  onClick={() => handleUpdateStatus("no_show")}
                >
                  No-Show
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  className="rounded-xl text-xs font-bold text-rose-600 border-rose-500/30 hover:bg-rose-500/10 h-8 px-2.5"
                  onClick={() => handleUpdateStatus("cancelled")}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Inline Reschedule Drawer */}
        {isRescheduling && (
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 border-b border-indigo-200 dark:border-indigo-800 space-y-3">
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <RotateCw className="h-4 w-4 text-indigo-600" /> Reschedule Appointment Date & Time Slot
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">New Date</Label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-background"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">New Slot Time</Label>
                <Input
                  type="time"
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-background"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={() => setIsRescheduling(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="brand" disabled={isSubmitting} className="h-7 text-xs font-bold rounded-lg" onClick={handleSaveReschedule}>
                Save Reschedule
              </Button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-border/60 px-6 bg-muted/20">
          {[
            { id: "overview", label: "Overview & Info", icon: FileText },
            { id: "escalate", label: "Escalate & Transfer", icon: ArrowRightLeft },
            { id: "notes", label: "Staff Notes", icon: MessageSquare },
            { id: "feedback", label: "Customer Feedback", icon: Star },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all",
                  isActive 
                    ? "border-brand text-brand bg-background/50" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl border border-border/80 bg-accent/10 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> Service Category
                  </div>
                  <div className="text-sm font-bold text-foreground">{serviceName}</div>
                </div>

                <div className="p-3.5 rounded-2xl border border-border/80 bg-accent/10 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Counter / Desk
                  </div>
                  <div className="text-sm font-bold text-foreground">{deskName}</div>
                </div>

                <div className="p-3.5 rounded-2xl border border-border/80 bg-accent/10 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Date & Time Slot
                  </div>
                  <div className="text-sm font-bold text-foreground">{booking.date} at {booking.slot_time?.substring(0, 5)}</div>
                </div>

                <div className="p-3.5 rounded-2xl border border-border/80 bg-accent/10 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Current Status
                  </div>
                  <div className="text-sm font-bold text-foreground capitalize">{booking.status?.replace('_', ' ')}</div>
                </div>
              </div>

              {booking.notes && (
                <div className="p-4 rounded-2xl border border-border/80 bg-slate-50 dark:bg-slate-900/60 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer Notes</div>
                  <div className="text-xs text-foreground leading-relaxed italic">"{booking.notes}"</div>
                </div>
              )}

              {/* Feedback Link Information Box */}
              <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Customer Feedback Link
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate max-w-sm">
                    {feedbackUrl}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold gap-1 shrink-0 h-8"
                  onClick={() => {
                    navigator.clipboard.writeText(feedbackUrl);
                    toast.success("Feedback link copied to clipboard!");
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Copy Link
                </Button>
              </div>
            </div>
          )}

          {/* Tab 2: Escalate & Transfer */}
          {activeTab === "escalate" && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                Reassign this appointment to another service category or desk counter with escalation notes.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-foreground">Reassign Service</Label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium mt-1"
                  >
                    <option value="">-- Keep Current Service --</option>
                    {services.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Assign Desk / Counter</Label>
                  <select
                    value={selectedDeskId}
                    onChange={(e) => setSelectedDeskId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium mt-1"
                  >
                    <option value="">-- Select Counter Desk --</option>
                    {desks.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">Escalation Reason / Notes</Label>
                <Textarea
                  value={escalationNote}
                  onChange={(e) => setEscalationNote(e.target.value)}
                  placeholder="Enter reason for transferring or escalating this appointment..."
                  className="mt-1 text-xs rounded-xl min-h-[80px]"
                />
              </div>

              {booking.escalated_notes && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  <div className="font-bold mb-1">Previous Escalation Notes:</div>
                  <div>{booking.escalated_notes}</div>
                </div>
              )}

              <Button
                disabled={isSubmitting}
                variant="brand"
                className="rounded-xl text-xs font-bold gap-1.5 h-9 w-full"
                onClick={handleSaveEscalation}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" /> Save Escalation & Transfer
              </Button>
            </div>
          )}

          {/* Tab 3: Staff Internal Notes */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Add New Staff Note</Label>
                <div className="flex gap-2">
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Type internal note for team members..."
                    className="text-xs rounded-xl flex-1"
                  />
                  <Button
                    size="sm"
                    variant="brand"
                    disabled={isSubmitting || !newNote.trim()}
                    className="rounded-xl text-xs font-bold gap-1 px-4"
                    onClick={handleAddStaffNote}
                  >
                    <Send className="h-3.5 w-3.5" /> Add Note
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold text-foreground">Staff Notes Log</Label>
                {booking.internal_notes ? (
                  <div className="p-4 rounded-2xl border border-border/80 bg-accent/10 space-y-2 text-xs font-mono whitespace-pre-wrap text-foreground">
                    {booking.internal_notes}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-2xl">
                    No internal staff notes recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Customer Feedback */}
          {activeTab === "feedback" && (
            <div className="space-y-4">
              {booking.feedback_rating ? (
                <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-center space-y-3">
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-6 w-6",
                          star <= booking.feedback_rating 
                            ? "fill-amber-400 text-amber-400" 
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    Rating: {booking.feedback_rating} / 5 Stars
                  </div>
                  {booking.feedback_text && (
                    <div className="text-xs text-muted-foreground italic bg-background/80 p-3 rounded-xl border border-border/60">
                      "{booking.feedback_text}"
                    </div>
                  )}
                  {booking.feedback_submitted_at && (
                    <div className="text-[10px] font-semibold text-muted-foreground">
                      Submitted on: {new Date(booking.feedback_submitted_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-2xl space-y-3">
                  <Star className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <div>No feedback submitted by customer yet.</div>
                  <div className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    When the appointment is marked as completed, an automated feedback link is sent to the customer.
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold gap-1 mx-auto"
                    onClick={() => {
                      window.open(feedbackUrl, "_blank");
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Preview Feedback Form
                  </Button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
