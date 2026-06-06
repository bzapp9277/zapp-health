"""
Regenerate Brad_Health_Calendar_Jun2026-May2027.pdf
One text change from prior version:
  "Skin (every 3 yrs) + dental (annual) — both start 2027"
  -> "Skin + dental — both every 3 yrs, start 2027"
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

OUT = r"C:\Users\BradZapp\zapp-health\docs\Brad_Health_Calendar_Jun2026-May2027.pdf"

def build():
    doc = SimpleDocTemplate(
        OUT,
        pagesize=letter,
        leftMargin=0.65*inch,
        rightMargin=0.65*inch,
        topMargin=0.6*inch,
        bottomMargin=0.55*inch,
    )

    styles = getSampleStyleSheet()
    W = letter[0] - 1.30*inch  # usable width

    # ── style palette ────────────────────────────────────────────────────
    title_st = ParagraphStyle("title", fontSize=18, fontName="Helvetica-Bold",
                               spaceAfter=4, alignment=TA_CENTER)
    sub_st   = ParagraphStyle("sub",   fontSize=8.5, fontName="Helvetica",
                               spaceAfter=8, alignment=TA_CENTER,
                               textColor=colors.HexColor("#444444"))
    month_st = ParagraphStyle("month", fontSize=13, fontName="Helvetica-Bold",
                               spaceBefore=10, spaceAfter=4,
                               textColor=colors.HexColor("#1a1a6e"))
    ev_st    = ParagraphStyle("ev",    fontSize=9,  fontName="Helvetica",
                               spaceAfter=0, leading=13)
    ev_b_st  = ParagraphStyle("ev_b",  fontSize=9,  fontName="Helvetica-Bold",
                               spaceAfter=0, leading=13)
    det_st   = ParagraphStyle("det",   fontSize=8.5, fontName="Helvetica",
                               leftIndent=12, spaceAfter=0, leading=12,
                               textColor=colors.HexColor("#333333"))
    prep_st  = ParagraphStyle("prep",  fontSize=8,  fontName="Helvetica-Oblique",
                               leftIndent=12, spaceAfter=4, leading=11,
                               textColor=colors.HexColor("#555555"))
    note_st  = ParagraphStyle("note",  fontSize=8,  fontName="Helvetica-Oblique",
                               leftIndent=12, spaceAfter=4, leading=11,
                               textColor=colors.HexColor("#555555"))
    scr_hd   = ParagraphStyle("scr_hd", fontSize=10, fontName="Helvetica-Bold",
                               spaceBefore=6, spaceAfter=2)
    scr_ev   = ParagraphStyle("scr_ev", fontSize=9,  fontName="Helvetica-Bold",
                               spaceAfter=0, leading=13)
    scr_det  = ParagraphStyle("scr_det", fontSize=8.5, fontName="Helvetica",
                               leftIndent=12, spaceAfter=2, leading=12,
                               textColor=colors.HexColor("#333333"))
    foot_st  = ParagraphStyle("foot",  fontSize=8,  fontName="Helvetica-Oblique",
                               spaceAfter=0, alignment=TA_CENTER,
                               textColor=colors.HexColor("#666666"))

    story = []

    # ── title ─────────────────────────────────────────────────────────────
    story.append(Paragraph("Brad's Health &amp; Wellness Calendar", title_st))
    story.append(Paragraph(
        "June 2026 → May 2027  |  Friday items are PTO unless a different day is shown. "
        "+Kat = Kat joins. Golf runs every in-town Saturday May–Sep (plus every donation Saturday). "
        "The Hoxworth donation cycle repeats every ~3 months going forward.",
        sub_st))
    story.append(HRFlowable(width=W, thickness=0.5, color=colors.HexColor("#aaaaaa"), spaceAfter=6))

    # ── stats table ───────────────────────────────────────────────────────
    stat_rows = [
        [Paragraph("Prime IV (local)", ev_st),       Paragraph("12", ev_b_st),
         Paragraph("Fire pit + forest nights", ev_st), Paragraph("10", ev_b_st)],
        [Paragraph("Prime IV (FLL add-on)", ev_st),  Paragraph("1",  ev_b_st),
         Paragraph("Golf days", ev_st),               Paragraph("20", ev_b_st)],
        [Paragraph("Elite Medspa", ev_st),            Paragraph("4",  ev_b_st),
         Paragraph("LIV IV at work", ev_st),          Paragraph("4",  ev_b_st)],
        [Paragraph("Bom Dia (couples massage)", ev_st), Paragraph("4", ev_b_st),
         Paragraph("Massage chair days", ev_st),      Paragraph("2",  ev_b_st)],
        [Paragraph("Hoxworth donations", ev_st),      Paragraph("4",  ev_b_st),
         Paragraph("Travel weeks", ev_st),            Paragraph("5",  ev_b_st)],
        [Paragraph("Labs days", ev_st),               Paragraph("4",  ev_b_st),
         Paragraph("Blackout days", ev_st),           Paragraph("2",  ev_b_st)],
        [Paragraph("2027 screenings", ev_st),         Paragraph("TBD", ev_b_st),
         Paragraph("Date nights (Kat)", ev_st),       Paragraph("2",  ev_b_st)],
    ]
    col_w = W / 4
    tbl = Table(stat_rows, colWidths=[col_w*1.8, col_w*0.2, col_w*1.8, col_w*0.2])
    tbl.setStyle(TableStyle([
        ("ALIGN",  (1,0), (1,-1), "RIGHT"),
        ("ALIGN",  (3,0), (3,-1), "RIGHT"),
        ("TOPPADDING",    (0,0), (-1,-1), 1),
        ("BOTTOMPADDING", (0,0), (-1,-1), 1),
    ]))
    story.append(tbl)
    story.append(HRFlowable(width=W, thickness=0.5, color=colors.HexColor("#aaaaaa"),
                             spaceBefore=6, spaceAfter=8))

    # ── helper to add a PTO-block event ───────────────────────────────────
    def pto_block(header, details, prep=None):
        story.append(Paragraph(header, ev_b_st))
        for d in details:
            story.append(Paragraph(d, det_st))
        if prep:
            story.append(Paragraph(prep, prep_st))
        else:
            story.append(Spacer(1, 3))

    def inline_ev(text):
        story.append(Paragraph(text, ev_st))

    def month(name):
        story.append(Paragraph(name, month_st))

    # ══════════════════════════════════════════════════════════════════════
    # JUNE 2026
    # ══════════════════════════════════════════════════════════════════════
    month("JUNE 2026")
    inline_ev("■  Sat Jun 6 — Golf (morning)")
    inline_ev("■  Wed Jun 10 — LIV Healthy Hydrate — IV at work, for me + office people (daytime)")
    pto_block(
        "Fri Jun 12 [ PTO · +Kat ]",
        ["Fire pit + forest bathing with Kat (at home, evening)"],
    )
    inline_ev("■  Sat Jun 13 — Golf (morning)")
    inline_ev("■  Wed Jun 17 — Massage chair day (at the office)")
    pto_block(
        "Fri Jun 19 [ PTO · +Kat · PIZZA ]",
        ["Sleep in + breakfast with Kat",
         "12:45pm — Hoxworth blood donation (NKY)",
         "after — Prime IV + pedicure",
         "then — pizza to-go + chill night"],
        prep="prep: low-key Thursday 6/18 — no drinking, early night, low stress",
    )
    inline_ev("■  Sat Jun 20 — Golf (morning) — after donation (locked)")
    pto_block(
        "Mon Jun 22",
        ["~8:15am — fasting labs, Dr. Burgher (St. E)"],
        prep="prep: sober weekend beforehand for a clean draw",
    )
    inline_ev("✈  Tue Jun 23 – Sun Jun 28 — MICHIGAN (travel)")

    # ══════════════════════════════════════════════════════════════════════
    # JULY 2026
    # ══════════════════════════════════════════════════════════════════════
    month("JULY 2026")
    inline_ev("■  Sat Jul 4 — Golf (morning) — July 4th, confirm")
    pto_block("Fri Jul 10 [ PTO · +Kat ]",
              ["Prime IV (Florence) + pedicure + dinner with Kat"])
    inline_ev("■  Sat Jul 11 — Golf (morning)")
    pto_block("Fri Jul 17 [ PTO · +Kat ]",
              ["Fire pit + forest bathing with Kat (at home)"])
    inline_ev("■  Sat Jul 18 — Golf (morning)")
    pto_block("Fri Jul 24 [ PTO ]",
              ["Elite Medspa — Japanese head spa + men’s facial + IV"])
    inline_ev("■  Sat Jul 25 — Golf (morning)")
    pto_block("Fri Jul 31 [ PTO · +Kat ]",
              ["Fire pit + forest bathing with Kat (at home)"])

    # ══════════════════════════════════════════════════════════════════════
    # AUGUST 2026
    # ══════════════════════════════════════════════════════════════════════
    month("AUGUST 2026")
    inline_ev("■  Sat Aug 1 — Golf (morning)")
    pto_block("Fri Aug 7 [ PTO · +Kat ]",
              ["Fire pit + forest bathing with Kat (at home)"])
    inline_ev("■  Sat Aug 8 — Golf (morning)")
    pto_block("Fri Aug 14 [ PTO · +Kat ]",
              ["Prime IV + pedicure + dinner with Kat"])
    inline_ev("✈  Sat Aug 15 – Sat Aug 22 — FLORIDA (travel) — no golf")
    pto_block("Fri Aug 28 [ PTO · +Kat ]",
              ["Bom Dia — couples massage + red light therapy"])
    inline_ev("■  Sat Aug 29 — Golf (morning)")

    # ══════════════════════════════════════════════════════════════════════
    # SEPTEMBER 2026
    # ══════════════════════════════════════════════════════════════════════
    month("SEPTEMBER 2026")
    inline_ev("■  Fri Sep 4 + Sat Sep 5 — Birthday / Anniversary week (9/2–9/8): "
              "KEEP OPEN, no booking (no golf 9/5)")
    pto_block("Fri Sep 11 [ PTO · +Kat ]",
              ["Fire pit + forest bathing with Kat (at home)"])
    inline_ev("■  Sat Sep 12 — Golf (morning)")
    pto_block(
        "Fri Sep 18 [ PTO · +Kat · PIZZA ]",
        ["12:45pm — Hoxworth blood donation (NKY)",
         "after — Prime IV + pedicure",
         "then — pizza to-go + chill night"],
    )
    inline_ev("■  Sat Sep 19 — Golf (morning) — after donation (locked)")
    pto_block(
        "Tue Sep 22",
        ["~8:15am — fasting labs, Dr. Burgher"],
        prep="prep: sober Sunday + Monday beforehand for a clean draw",
    )
    pto_block("Fri Sep 25 [ PTO · +Kat ]",
              ["Fire pit + forest bathing with Kat (at home)"])
    inline_ev("■  Sat Sep 26 — Golf (morning)")

    # ══════════════════════════════════════════════════════════════════════
    # OCTOBER 2026
    # ══════════════════════════════════════════════════════════════════════
    month("OCTOBER 2026")
    inline_ev("✈  Thu Oct 1 – Fri Oct 9 — FLORIDA (travel)")
    pto_block("Fri Oct 16 [ PTO · +Kat ]",
              ["Prime IV + pedicure + dinner with Kat"])
    inline_ev("■  Thu Oct 22 — LIV Healthy Hydrate — IV at work, HHour Advisor event")
    pto_block("Fri Oct 23 [ PTO · +Kat ]",
              ["Fire pit + forest bathing with Kat (at home)"])
    pto_block("Fri Oct 30 [ PTO ]",
              ["Elite Medspa — head spa + men’s facial + IV"])

    # ══════════════════════════════════════════════════════════════════════
    # NOVEMBER 2026
    # ══════════════════════════════════════════════════════════════════════
    month("NOVEMBER 2026")
    inline_ev("❤  Fri Nov 6 [ PTO · +Kat ] — Date night with Kat")
    pto_block("Fri Nov 13 [ PTO · +Kat ]",
              ["Prime IV + pedicure + dinner with Kat"])
    inline_ev("■  Wed Nov 18 — Massage chair day (at the office)")
    pto_block("Fri Nov 20 [ PTO · +Kat ]",
              ["Fire pit + forest bathing with Kat (at home)"])
    pto_block("Fri Nov 27 [ PTO · +Kat ]",
              ["Bom Dia — couples massage + red light therapy"])

    # ══════════════════════════════════════════════════════════════════════
    # DECEMBER 2026
    # ══════════════════════════════════════════════════════════════════════
    month("DECEMBER 2026")
    inline_ev("✈  Wed Dec 9 – Sun Dec 13 — FORT LAUDERDALE, boat parade (travel)")
    pto_block("Fri Dec 11 [ +Kat ]",
              ["Prime IV — Fort Lauderdale (during the trip; add-on)"])
    pto_block(
        "Fri Dec 18 [ PTO · +Kat · PIZZA ]",
        ["12:45pm — Hoxworth blood donation (NKY)",
         "after — Prime IV + pedicure",
         "then — pizza to-go + chill night"],
    )
    inline_ev("■  Sat Dec 19 — Golf (morning) — after donation (locked, for certain)")
    pto_block(
        "Tue Dec 22",
        ["~8:15am — fasting labs, Dr. Burgher"],
        prep="prep: sober Sunday + Monday beforehand. Tight against Christmas week.",
    )

    # ══════════════════════════════════════════════════════════════════════
    # JANUARY 2027
    # ══════════════════════════════════════════════════════════════════════
    month("JANUARY 2027")
    inline_ev("■  Fri Jan 1 — Poker tournament (heavy day): blackout, plan recovery around it")
    inline_ev("■  Tue Jan 5 — LIV Healthy Hydrate — IV at work, recovery (repeats yearly)")
    pto_block("Fri Jan 15 [ PTO · +Kat ]",
              ["Prime IV + pedicure + dinner with Kat"])
    pto_block("Fri Jan 29 [ PTO ]",
              ["Elite Medspa — head spa + men’s facial + IV"])

    # ══════════════════════════════════════════════════════════════════════
    # FEBRUARY 2027
    # ══════════════════════════════════════════════════════════════════════
    month("FEBRUARY 2027")
    inline_ev("■  Thu Feb 4 — LIV Healthy Hydrate — IV at work, HHour Advisor event")
    pto_block("Fri Feb 12 [ PTO · +Kat ]",
              ["Prime IV + pedicure + dinner with Kat (12th &amp; final local IV)"])
    inline_ev("✈  Sat Feb 13 – Sat Feb 20 — FORT LAUDERDALE spa trip, "
              "custom spa (Presidents’ Day Mon 2/15)")
    pto_block("Fri Feb 26 [ PTO · +Kat ]",
              ["Bom Dia — couples massage + red light therapy"])

    # ══════════════════════════════════════════════════════════════════════
    # MARCH 2027
    # ══════════════════════════════════════════════════════════════════════
    month("MARCH 2027")
    pto_block(
        "Fri Mar 19 [ PTO · +Kat · PIZZA ]",
        ["12:45pm — Hoxworth blood donation (NKY)",
         "after — Prime IV + pedicure",
         "then — pizza to-go + chill night"],
    )
    inline_ev("■  Sat Mar 20 — Golf (morning) — after donation (locked, for certain)")
    pto_block(
        "Tue Mar 23",
        ["~8:15am — fasting labs, Dr. Burgher"],
        prep="prep: sober Sunday + Monday beforehand for a clean draw",
    )

    # ══════════════════════════════════════════════════════════════════════
    # APRIL 2027
    # ══════════════════════════════════════════════════════════════════════
    month("APRIL 2027")
    pto_block("Fri Apr 9 [ PTO · +Kat ]",
              ["Prime IV + pedicure + dinner with Kat"])
    pto_block("Fri Apr 16 [ PTO · +Kat ]",
              ["Fire pit + forest bathing with Kat (at home)"])
    pto_block("Fri Apr 23 [ PTO ]",
              ["Elite Medspa — head spa + men’s facial + IV"])

    # ══════════════════════════════════════════════════════════════════════
    # MAY 2027
    # ══════════════════════════════════════════════════════════════════════
    month("MAY 2027")
    inline_ev("■  Sat May 1 — Golf (morning)")
    inline_ev("❤  Fri May 7 [ PTO · +Kat ] — Date night with Kat")
    inline_ev("■  Sat May 8 — Golf (morning)")
    pto_block("Fri May 14 [ PTO · +Kat ]",
              ["Prime IV + pedicure + dinner with Kat"])
    inline_ev("■  Sat May 15 — Golf (morning)")
    pto_block("Fri May 21 [ PTO · +Kat ]",
              ["Fire pit + forest bathing with Kat (at home)"])
    inline_ev("■  Sat May 22 — Golf (morning)")
    pto_block("Fri May 28 [ PTO · +Kat ]",
              ["Bom Dia — couples massage + red light therapy"])
    inline_ev("■  Sat May 29 — Golf (morning)")

    # ══════════════════════════════════════════════════════════════════════
    # 2027 SCREENINGS  ← THE CHANGED SECTION
    # ══════════════════════════════════════════════════════════════════════
    story.append(HRFlowable(width=W, thickness=0.5, color=colors.HexColor("#aaaaaa"),
                             spaceBefore=10, spaceAfter=6))
    story.append(Paragraph(
        "2027 SCREENINGS (date TBD — schedule on a Friday, PTO)", scr_hd))

    story.append(Paragraph("Skin check + Dental — same day [ PTO ]", scr_ev))
    # UPDATED LINE:
    story.append(Paragraph(
        "Skin + dental — both every 3 yrs, start 2027", scr_det))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Colonoscopy [ PTO ]", scr_ev))
    story.append(Paragraph("Every 3 yrs, starting 2027", scr_det))
    story.append(Paragraph(
        "note: St. E chart lists it due ~Nov 2026; pushed to 2027 by choice", note_st))

    story.append(HRFlowable(width=W, thickness=0.5, color=colors.HexColor("#aaaaaa"),
                             spaceBefore=8, spaceAfter=6))
    story.append(Paragraph(
        "Items can be moved or skipped occasionally — this is the default cadence so nothing "
        "slips for months. Nothing local is booked inside a travel band. Golf is weekend, not PTO.",
        foot_st))

    doc.build(story)
    print(f"PDF written to {OUT}")

if __name__ == "__main__":
    build()
