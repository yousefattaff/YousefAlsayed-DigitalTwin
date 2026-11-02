"""Build a one-page, single-column ATS resume in Harvard style."""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

OUT = Path(__file__).resolve().parents[1] / "public" / "Yousef-Alsayed-Resume.docx"
FONT = "Calibri"
INK = RGBColor(0, 0, 0)
CONTENT_WIDTH = Inches(7.0)  # 8.5in page with 0.75in margins


def set_run(run, size, bold=False):
    run.font.name = FONT
    run._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = INK
    run.italic = False


def paragraph(doc, space_before=0, space_after=0, align="left"):
    p = doc.add_paragraph()
    fmt = p.paragraph_format
    fmt.space_before = Pt(space_before)
    fmt.space_after = Pt(space_after)
    fmt.line_spacing_rule = WD_LINE_SPACING.SINGLE
    fmt.line_spacing = 1.0
    align_map = {
        "left": WD_ALIGN_PARAGRAPH.LEFT,
        "center": WD_ALIGN_PARAGRAPH.CENTER,
    }
    p.alignment = align_map[align]
    return p


def add_text(p, text, size=10.5, bold=False):
    run = p.add_run(text)
    set_run(run, size, bold)
    return run


def add_tabbed(p):
    p.paragraph_format.tab_stops.add_tab_stop(CONTENT_WIDTH, WD_TAB_ALIGNMENT.RIGHT)


def section_heading(doc, text):
    p = paragraph(doc, space_before=8, space_after=2)
    add_text(p, text.upper(), 11, bold=True)
    p_pr = p._p.get_or_add_pPr()
    p_bdr = p_pr.makeelement(qn("w:pBdr"), {})
    bottom = p_bdr.makeelement(
        qn("w:bottom"),
        {
            qn("w:val"): "single",
            qn("w:sz"): "6",
            qn("w:space"): "1",
            qn("w:color"): "000000",
        },
    )
    p_bdr.append(bottom)
    p_pr.append(p_bdr)
    return p


def role_line(doc, left, right):
    p = paragraph(doc, space_before=4, space_after=0)
    add_tabbed(p)
    add_text(p, left, 10.5, bold=True)
    add_text(p, "\t" + right, 10.5, bold=False)
    return p


def sub_line(doc, left, right=""):
    p = paragraph(doc, space_before=0, space_after=0)
    add_tabbed(p)
    add_text(p, left, 10.5, bold=False)
    if right:
        add_text(p, "\t" + right, 10.5)
    return p


def bullet(doc, text):
    p = paragraph(doc, space_before=1, space_after=0)
    p.paragraph_format.left_indent = Inches(0.15)
    add_text(p, "• " + text, 10.5)
    return p


def build():
    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    for edge in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
        setattr(section, edge, Inches(0.75))
    section.header.is_linked_to_previous = True
    section.footer.is_linked_to_previous = True

    normal = doc.styles["Normal"]
    normal.font.name = FONT
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = INK

    name = paragraph(doc, align="center")
    add_text(name, "YOUSEF ALSAYED ABDELFATTAH", 16, bold=True)

    contact = paragraph(doc, space_before=1, align="center")
    add_text(
        contact,
        "Cairo, Egypt  |  +20 115 382 6643  |  yousefabuelkhear@gmail.com",
        10.5,
    )
    links = paragraph(doc, space_before=0, space_after=1, align="center")
    add_text(
        links,
        "linkedin.com/in/yousef-alsayed-abdelfattah  |  github.com/yousefattaff  |  yousefalsayed.me",
        10.5,
    )
    target = paragraph(doc, space_before=1, space_after=0, align="center")
    add_text(target, "AI Engineer  |  AI Automation", 11, bold=True)

    section_heading(doc, "Experience")
    role_line(doc, "AI Engineer, Arche Robotics", "July 2026 – Present")
    sub_line(doc, "Remote")
    bullet(
        doc,
        "Cut fleet-log capture from 30 minutes to about 0.3 seconds by replacing polling with DynamoDB Streams on AWS Lambda, a reduction of more than 99%.",
    )
    bullet(
        doc,
        "Added a six-stage skip ladder so Groq runs only when a robot log needs a model, and shipped fixes for nine production issues, including a nested MCP payload and battery watchdogs.",
    )
    bullet(
        doc,
        "Validated the agent with 265 Pytest unit tests and 13 live-stream smoke tests.",
    )

    role_line(doc, "Programming Instructor, iSchool", "May 2026 – Present")
    sub_line(doc, "Cairo, Egypt")
    bullet(
        doc,
        "Teach Python, artificial intelligence, JavaScript, and interface design in English to 30+ students in Grades 1–12.",
    )

    role_line(doc, "AI Software Engineer, Contractor, Outlier", "November 2024 – January 2025")
    sub_line(doc, "Remote")
    bullet(
        doc,
        "Evaluated 50+ large language model answers a day across 6+ domains, wrote 20+ prompt variants to expose weak reasoning, and reviewed 50+ analyst submissions for a human-feedback workflow.",
    )

    section_heading(doc, "Projects")
    role_line(doc, "SDR Multi-Agent", "Python, OpenAI Agents SDK, Tavily, SendGrid")
    bullet(
        doc,
        "Built a sales pipeline that stops on a personal name, runs 3 company searches in parallel, writes 3 email styles, and sends the chosen email through SendGrid.",
    )
    role_line(doc, "Advanced Engineering Team", "CrewAI, Groq, Docker, Langfuse")
    bullet(
        doc,
        "Built a 4-agent crew that turns one software request into a design, Python, a Gradio demo, and tests, and can run the generated code in Docker.",
    )
    role_line(doc, "RAG-AI-Agent", "LangChain, ChromaDB, Groq")
    bullet(
        doc,
        "Built a document assistant that stores each PDF set in its own Chroma collection and cites the file and page. Search keeps the top 4 of 24 candidate chunks.",
    )

    section_heading(doc, "Skills")
    skills = paragraph(doc, space_before=2, space_after=0)
    add_text(
        skills,
        "Python, large language models (LLMs), retrieval-augmented generation (RAG), multi-agent systems, CrewAI, OpenAI Agents SDK, Groq, LangChain, ChromaDB, FastAPI, Docker, AWS Lambda, DynamoDB Streams, Model Context Protocol (MCP), Pytest, Langfuse, prompt engineering, reinforcement learning from human feedback (RLHF), Git",
        10.5,
    )

    section_heading(doc, "Education")
    role_line(
        doc,
        "Bachelor of Science, Mechatronics, Robotics, and Automation Engineering",
        "CGPA 3.34",
    )
    sub_line(doc, "Misr University for Science and Technology, Cairo", "September 2019 – June 2024")
    bullet(
        doc,
        "Graduation project: built the operator interface that sent ROS navigation goals so a restaurant robot moved from table to table. Team of six. Third place, International Gathering of Artificial Intelligence in Egypt.",
    )

    section_heading(doc, "Additional")
    extra = paragraph(doc, space_before=2, space_after=0)
    add_text(extra, "Languages: ", 10.5, bold=True)
    add_text(extra, "Arabic (native), English (professional).", 10.5)
    service = paragraph(doc, space_before=1, space_after=0)
    add_text(service, "National service: ", 10.5, bold=True)
    add_text(
        service,
        "IT Help Desk, Egyptian Armed Forces Engineering Authority, Giza, January 2025 – March 2026.",
        10.5,
    )
    certs = paragraph(doc, space_before=1, space_after=0)
    add_text(certs, "Certifications: ", 10.5, bold=True)
    add_text(
        certs,
        "Proficient AI Engineer, Ed Donner (2026); Machine Learning Specialization, Stanford Online and DeepLearning.AI; CS50's Introduction to Artificial Intelligence with Python, Harvard.",
        10.5,
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()
