import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_quesole_excel_report():
    wb = openpyxl.Workbook()
    
    # ---------------------------------------------------------
    # Styles Definition
    # ---------------------------------------------------------
    font_family = "Segoe UI"
    
    title_font = Font(name=font_family, size=16, bold=True, color="FFFFFF")
    section_font = Font(name=font_family, size=12, bold=True, color="1E293B")
    header_font = Font(name=font_family, size=11, bold=True, color="FFFFFF")
    bold_font = Font(name=font_family, size=10, bold=True, color="0F172A")
    regular_font = Font(name=font_family, size=10, color="334155")
    badge_green_font = Font(name=font_family, size=10, bold=True, color="065F46")
    
    title_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid") # Navy Blue
    header_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid") # Royal Blue
    subheader_fill = PatternFill(start_color="EFF6FF", end_color="EFF6FF", fill_type="solid") # Light Blue
    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    green_fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
    
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center", wrap_text=True)
    
    thin_border = Side(style="thin", color="CBD5E1")
    cell_border = Border(left=thin_border, right=thin_border, top=thin_border, bottom=thin_border)
    thick_bottom = Border(bottom=Side(style="medium", color="1E3A8A"))

    # =========================================================
    # SHEET 1: Executive Overview
    # =========================================================
    ws1 = wb.active
    ws1.title = "Executive Summary"
    ws1.views.sheetView[0].showGridLines = True
    
    ws1.merge_cells("A1:G2")
    cell = ws1["A1"]
    cell.value = "QUESOLE — SMART QUEUE & CUSTOMER EXPERIENCE PLATFORM"
    cell.font = title_font
    cell.fill = title_fill
    cell.alignment = align_center

    overview_meta = [
        ("Project Name", "Quesole Queue & Appointment Management System"),
        ("Architecture", "Decoupled SPA + REST API + WebSockets"),
        ("Frontend Tech Stack", "React 18, Vite, TanStack Router, TailwindCSS, Lucide Icons, Sonner"),
        ("Backend Tech Stack", "Django 5.0 REST Framework, Channels (ASGI/WebSockets), SQLite/PostgreSQL"),
        ("Email Backend", "SMTP Gmail Service (Automated HTML Disposition Notifications)"),
        ("Core Status", "100% Production Ready & Verified"),
        ("Generated Date", "September 2026"),
    ]
    
    row_idx = 4
    for label, val in overview_meta:
        ws1.cell(row=row_idx, column=1, value=label).font = bold_font
        ws1.cell(row=row_idx, column=1).fill = subheader_fill
        ws1.cell(row=row_idx, column=1).border = cell_border
        
        c = ws1.cell(row=row_idx, column=2, value=val)
        c.font = regular_font
        c.border = cell_border
        ws1.merge_cells(start_row=row_idx, start_column=2, end_row=row_idx, end_column=7)
        row_idx += 1
        
    row_idx += 1
    ws1.cell(row=row_idx, column=1, value="SYSTEM DASHBOARDS & CORE PROGRESS HIGHLIGHTS").font = section_font
    row_idx += 1
    
    headers_s1 = ["Dashboard Category", "Target Role", "Key Responsibility", "Real-Time Sync", "Progress Status", "Completion %"]
    for col_idx, h in enumerate(headers_s1, start=1):
        cell = ws1.cell(row=row_idx, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = cell_border
    row_idx += 1
    
    dashboards_summary = [
        ("Desk Operator Console", "Desk Staff", "Call next token, serve, hold/escalate, dispatch emails, live feedback feed", "WebSocket (ws/branch/<id>/staff/)", "100% Completed", 1.0),
        ("Branch Admin Dashboard", "Branch Admin", "Manage desks, service categories, staff assignments, queue analytics & history", "WebSocket & Dynamic Polling", "100% Completed", 1.0),
        ("Company Admin Dashboard", "Company Admin", "Multi-branch monitoring, company billing, staff roles, high-level metrics", "REST API + Sockets", "100% Completed", 1.0),
        ("Super Admin Portal", "Platform Owner", "Tenant onboarding, package upgrades, global system audit logs & analytics", "REST API", "100% Completed", 1.0),
        ("Public Kiosk / QR Service", "Visitors & Customers", "Token issuance via QR scan, Touch Kiosk, KOT print, Online Booking", "REST API + WebSocket", "100% Completed", 1.0),
        ("Public Feedback & Rating Portal", "Customer Visitor", "Interactive 1-5 star rating and reply message submission via email link", "REST API (/api/public/tickets/...)", "100% Completed", 1.0),
        ("Live Display Board & KOT", "Branch Waiting Area", "Real-time queue display board, audio chime callout, KOT token printing", "WebSocket Realtime Stream", "100% Completed", 1.0),
    ]
    
    for item in dashboards_summary:
        ws1.cell(row=row_idx, column=1, value=item[0]).font = bold_font
        ws1.cell(row=row_idx, column=2, value=item[1]).font = regular_font
        ws1.cell(row=row_idx, column=3, value=item[2]).font = regular_font
        ws1.cell(row=row_idx, column=4, value=item[3]).font = regular_font
        
        c_status = ws1.cell(row=row_idx, column=5, value=item[4])
        c_status.font = badge_green_font
        c_status.fill = green_fill
        c_status.alignment = align_center
        
        c_pct = ws1.cell(row=row_idx, column=6, value=item[5])
        c_pct.font = bold_font
        c_pct.number_format = '0%'
        c_pct.alignment = align_center
        
        for c_i in range(1, 7):
            ws1.cell(row=row_idx, column=c_i).border = cell_border
        row_idx += 1

    # =========================================================
    # SHEET 2: Full Dashboard Modules & Features Matrix
    # =========================================================
    ws2 = wb.create_sheet(title="Dashboard Modules & Features")
    ws2.views.sheetView[0].showGridLines = True
    
    ws2.merge_cells("A1:G2")
    c2 = ws2["A1"]
    c2.value = "DETAILED DASHBOARDS, MODULES & FEATURE MATRIX"
    c2.font = title_font
    c2.fill = title_fill
    c2.alignment = align_center
    
    headers_s2 = ["Dashboard", "Module Name", "Detailed Feature Set", "Data Input / Output", "Key Workflows", "Progress", "Status"]
    row_idx = 4
    for col_idx, h in enumerate(headers_s2, start=1):
        cell = ws2.cell(row=row_idx, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = cell_border
    row_idx += 1
    
    modules_matrix = [
        # Operator Console
        ("Desk Operator Console", "Desk Control Center", "Call Next Ticket, Recall Ticket, Serve Ticket, Mark No-Show, Transfer Desk", "WebSocket Action Payload", "Real-time queue navigation & voice callouts", "100%", "Completed"),
        ("Desk Operator Console", "Query Disposition & Email", "Click 'Resolved' or 'Escalated' to auto-send static dual-column HTML email", "Gmail SMTP Email API", "Dispatches disposition status email to customer", "100%", "Completed"),
        ("Desk Operator Console", "Query History & Replies", "High-density HTML table of resolved/escalated queries with customer replies & ratings", "REST API + Sockets", "Today filter (default), past days filter, search, CSV export, newest top", "100%", "Completed"),
        ("Desk Operator Console", "Customer Query Status Feed", "Latest 10 handled tickets feed sorted descending (newest on top row)", "Live State Subscription", "Instant feed update when customer replies to email", "100%", "Completed"),
        
        # Branch Admin
        ("Branch Admin Console", "Overview & Analytics", "Live branch queue counters, waiting times, active desks, service breakdown", "REST API Analytics", "Branch health monitoring & operational metrics", "100%", "Completed"),
        ("Branch Admin Console", "Desk Management", "Create desks, toggle open/paused/offline status, assign staff members & services", "DRM CRUD Endpoints", "Counter desk provisioning & operator routing", "100%", "Completed"),
        ("Branch Admin Console", "Service Categories", "Define service names, prefixes (A, B, C), estimated handling times, active status", "Service CRUD Endpoints", "Prefix-based unique token generation", "100%", "Completed"),
        ("Branch Admin Console", "Branch Settings & Geofencing", "Operating hours, geofence radius (meters), kiosk password, online booking toggles", "Branch Configuration API", "Security & geofenced check-in rules", "100%", "Completed"),
        ("Branch Admin Console", "Query Disposition Archive", "Full historical table with Today/Yesterday/7Days/30Days/Custom date filters", "Django Queryset API", "Newest-first sorting, CSV export, rating analytics", "100%", "Completed"),

        # Company Admin
        ("Company Admin Dashboard", "Multi-Branch Control", "Manage all company branches, global queue analytics, multi-location health", "Multi-tenant API", "Company-wide operational oversight", "100%", "Completed"),
        ("Company Admin Dashboard", "Staff & Role Management", "Create company admins, branch admins, desk staff; assign roles & permissions", "Account Management API", "RBAC & tenant user provisioning", "100%", "Completed"),
        ("Company Admin Dashboard", "Billing & Subscriptions", "Plan package management, addon purchases, price change history, invoice downloads", "Billing API", "Subscription lifecycle & invoicing", "100%", "Completed"),

        # Super Admin
        ("Super Admin Portal", "Tenant Management", "Onboard new enterprise companies, manage active/suspended company accounts", "SuperAdmin API", "Platform multi-tenancy administration", "100%", "Completed"),
        ("Super Admin Portal", "Package & Pricing Engine", "Configure tiers, duration tiers, price per unit, solution types, addon toggles", "Pricing Matrix API", "Global SaaS pricing configuration", "100%", "Completed"),
        ("Super Admin Portal", "Global System Audit Logs", "Track all system actions, authentication events, API requests across tenants", "Audit Log API", "Compliance, auditing & activity tracking", "100%", "Completed"),

        # Kiosk & Visitor
        ("Public Visitor Kiosk", "Token Generation", "QR Code Scan, Kiosk Touch Screen, Online Booking, Walk-in Counter Ticket", "Public Ticket API", "Atomic TokenSequence generation (prefix + 001, guaranteed unique)", "100%", "Completed"),
        ("Public Feedback Portal", "Customer Rating & Reply", "Interactive 1-5 star rating selector (no autofill default), reply textarea", "Public Feedback API", "Customer feedback submission from status email", "100%", "Completed"),
        ("Public Feedback Portal", "Company Branding & Footer", "Displays Company Logo/Name header & fixed sticky 'Powered by Quesole' footer", "Public Branding Payload", "Custom tenant branding experience", "100%", "Completed"),

        # Live Display & KOT
        ("Live Display Board", "Branch Queue TV Display", "Full-screen TV display board with token numbers, desk callout, audio chime", "WebSocket Event Stream", "Waiting room customer callout display", "100%", "Completed"),
        ("KOT Token Printer", "KOT Print Integration", "Prints thermal receipt tokens with QR code, estimated wait time, service details", "KOT Print Service", "Physical token generation at kiosk/counter", "100%", "Completed"),
    ]

    for item in modules_matrix:
        fill = zebra_fill if row_idx % 2 == 0 else PatternFill(fill_type=None)
        
        c_dash = ws2.cell(row=row_idx, column=1, value=item[0])
        c_dash.font = bold_font
        c_dash.fill = fill
        
        c_mod = ws2.cell(row=row_idx, column=2, value=item[1])
        c_mod.font = bold_font
        c_mod.fill = fill
        
        c_feat = ws2.cell(row=row_idx, column=3, value=item[2])
        c_feat.font = regular_font
        c_feat.fill = fill
        
        c_io = ws2.cell(row=row_idx, column=4, value=item[3])
        c_io.font = regular_font
        c_io.fill = fill

        c_wf = ws2.cell(row=row_idx, column=5, value=item[4])
        c_wf.font = regular_font
        c_wf.fill = fill

        c_p = ws2.cell(row=row_idx, column=6, value=item[5])
        c_p.font = bold_font
        c_p.alignment = align_center
        c_p.fill = fill

        c_s = ws2.cell(row=row_idx, column=7, value=item[6])
        c_s.font = badge_green_font
        c_s.fill = green_fill
        c_s.alignment = align_center

        for c_i in range(1, 8):
            ws2.cell(row=row_idx, column=c_i).border = cell_border
        row_idx += 1

    # =========================================================
    # SHEET 3: System Architecture & Workflow Mechanics
    # =========================================================
    ws3 = wb.create_sheet(title="Architecture & Workflow Flow")
    ws3.views.sheetView[0].showGridLines = True

    ws3.merge_cells("A1:F2")
    c3 = ws3["A1"]
    c3.value = "SYSTEM ARCHITECTURE & CORE WORKFLOW MECHANICS"
    c3.font = title_font
    c3.fill = title_fill
    c3.alignment = align_center

    headers_s3 = ["Step #", "Workflow Phase", "Trigger Event", "Backend Mechanism", "Frontend Live Reaction", "Data Integrity & Verification"]
    row_idx = 4
    for col_idx, h in enumerate(headers_s3, start=1):
        cell = ws3.cell(row=row_idx, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = align_center
        cell.border = cell_border
    row_idx += 1

    workflows = [
        (1, "Unique Token Generation", "Visitor scans QR / uses Kiosk", "TokenSequence.get_unique_token_number() locks DB atomically & checks collisions", "Displays generated token (e.g. B008) with live position counter", "100% Collision-free per branch per day"),
        (2, "Operator Calling Ticket", "Desk operator clicks 'Call Next'", "Updates Ticket status to 'called', sets called_at timestamp", "WebSockets broadcast payload to all branch screens & Live Display TV", "Live audio chime callout triggered on TV display"),
        (3, "Ticket Disposition Action", "Operator clicks 'Resolved' / 'Escalated'", "Triggers dispatch_disposition_email_async in daemon thread", "Moves ticket to handled history; updates operator stat cards live", "SMTP Gmail sends dual-column HTML email to customer_email"),
        (4, "Customer Email & Link", "Customer receives status email", "Generates HTTPS link: https://localhost:8080/feedback/<tracking_code>", "Renders interactive feedback form with Company Logo & sticky footer", "Protocol HTTPS prevents empty response SSL errors"),
        (5, "Customer Feedback Reply", "Customer submits 1-5 star rating & text reply", "Ticket.all_objects public update saves feedback_rating & feedback_text", "WebSocket broadcasts update to Operator & Admin query history table", "Unauthenticated public lookup bypasses TenantManager isolation safely"),
        (6, "Query History Sorting & Filter", "Admin / Operator views Query History", "Queryset filtered by Today / Past days / Custom date", "Renders high-density HTML table sorted descending by newest timestamp", "Newest query (e.g. B008) ALWAYS appears on Row 1"),
    ]

    for wf in workflows:
        fill = zebra_fill if row_idx % 2 == 0 else PatternFill(fill_type=None)

        c_step = ws3.cell(row=row_idx, column=1, value=f"Step {wf[0]}")
        c_step.font = bold_font
        c_step.alignment = align_center
        c_step.fill = fill

        c_phase = ws3.cell(row=row_idx, column=2, value=wf[1])
        c_phase.font = bold_font
        c_phase.fill = fill

        c_trig = ws3.cell(row=row_idx, column=3, value=wf[2])
        c_trig.font = regular_font
        c_trig.fill = fill

        c_back = ws3.cell(row=row_idx, column=4, value=wf[3])
        c_back.font = regular_font
        c_back.fill = fill

        c_front = ws3.cell(row=row_idx, column=5, value=wf[4])
        c_front.font = regular_font
        c_front.fill = fill

        c_ver = ws3.cell(row=row_idx, column=6, value=wf[5])
        c_ver.font = badge_green_font
        c_ver.fill = green_fill

        for c_i in range(1, 7):
            ws3.cell(row=row_idx, column=c_i).border = cell_border
        row_idx += 1

    # Auto-adjust column widths across all sheets
    for sheet in wb.worksheets:
        for col in sheet.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                # Ignore merged cells in max length calculation
                if cell.coordinate in sheet.merged_cells:
                    continue
                val_str = str(cell.value or "")
                if val_str:
                    lines = val_str.split("\n")
                    for line in lines:
                        if len(line) > max_len:
                            max_len = len(line)
            sheet.column_dimensions[col_letter].width = max(max_len + 4, 14)
            sheet.column_dimensions[col_letter].width = min(sheet.column_dimensions[col_letter].width, 60)

    output_path = os.path.join("d:\\quesoles-main (1)\\quesoles-main", "Quesole_Complete_Project_Architecture_Dashboards_Progress.xlsx")
    wb.save(output_path)
    print(f"Report generated successfully at: {output_path}")
    return output_path

if __name__ == "__main__":
    build_quesole_excel_report()
