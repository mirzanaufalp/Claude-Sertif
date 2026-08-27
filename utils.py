"""
utils.py
Modul utilitas SIM-K3 MINING: export data ke Excel/CSV/PDF, import dari Excel,
serta helper badge status sertifikasi.
"""

import io
import pandas as pd
from datetime import datetime, date


def get_status_badge_html(status: str, exp_date_str: str = "") -> str:
    """Menghasilkan HTML badge status sertifikasi."""
    if status == "Belum Ada":
        return '<span style="background-color: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">Belum Ada</span>'
    elif status == "Dalam Proses":
        return '<span style="background-color: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">Dalam Proses</span>'
    elif status == "Expired":
        return '<span style="background-color: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">🚫 Expired</span>'
    elif status == "Akan Expired":
        return '<span style="background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">⚠️ Akan Expired</span>'
    else:  # Aktif
        return '<span style="background-color: #d1fae5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">✅ Aktif</span>'


def export_to_excel(df: pd.DataFrame) -> bytes:
    """Mengonversi DataFrame pegawai menjadi file Excel (bytes)."""
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        df_export = df.copy()
        df_export.to_excel(writer, index=False, sheet_name="Sertifikasi Pegawai")
        workbook = writer.book
        worksheet = writer.sheets["Sertifikasi Pegawai"]

        header_format = workbook.add_format({
            "bold": True, "bg_color": "#1e293b", "font_color": "white",
            "border": 1, "align": "center", "valign": "vcenter"
        })
        for col_num, value in enumerate(df_export.columns.values):
            worksheet.write(0, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, 18)

    return output.getvalue()


def export_to_csv(df: pd.DataFrame) -> bytes:
    """Mengonversi DataFrame pegawai menjadi file CSV (bytes)."""
    return df.to_csv(index=False).encode("utf-8-sig")


def export_to_pdf(df: pd.DataFrame, title: str = "Laporan Sertifikasi Pegawai Pertambangan (POP, POM, POU, SMPKP)") -> bytes:
    """Mengonversi DataFrame menjadi file PDF sederhana menggunakan reportlab."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4),
                             topMargin=1.2 * cm, bottomMargin=1.2 * cm)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(title, styles["Title"]))
    elements.append(Paragraph(
        f"Dicetak pada: {datetime.now().strftime('%d-%m-%Y %H:%M')}", styles["Normal"]))
    elements.append(Spacer(1, 0.5 * cm))

    df_display = df.copy()
    keep_cols = [c for c in [
        "nik", "nama", "jabatan", "departemen", "site",
        "pop_status", "pom_status", "pou_status", "smpkp_status"
    ] if c in df_display.columns]

    if keep_cols:
        df_display = df_display[keep_cols]
        df_display.columns = [c.upper().replace("_", " ") for c in df_display.columns]

    data = [list(df_display.columns)] + df_display.astype(str).values.tolist()
    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(table)
    doc.build(elements)
    return buffer.getvalue()


def import_from_excel(uploaded_file) -> pd.DataFrame:
    """Membaca file Excel yang diupload menjadi DataFrame."""
    return pd.read_excel(uploaded_file)
