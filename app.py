"""
app.py
SIM-K3 MINING - Sistem Pendataan Sertifikasi K3 & Operasional Pertambangan
(POP • POM • POU • SMPKP)
Dibangun menggunakan Streamlit + Plotly + SQLite.
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, date
import time

from database import (
    DatabaseManager, DEPARTEMEN_LIST, SITE_LIST,
    STATUS_SERTIFIKAT_LIST, TIPE_SMPKP_LIST,
    calculate_days_remaining, get_auto_cert_status, parse_excel_karyawan
)
from styles import inject_css
from utils import (
    export_to_excel, export_to_csv, export_to_pdf, import_from_excel,
    get_status_badge_html
)

# ================= KONFIGURASI HALAMAN =================
st.set_page_config(
    page_title="SIM-K3 MINING",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Injeksi Custom CSS
inject_css()

# Inisialisasi Database
@st.cache_resource
def get_db():
    return DatabaseManager()

db = get_db()

# ================= SESSION STATE =================
if "halaman_aktif" not in st.session_state:
    st.session_state.halaman_aktif = "Dashboard Analytics"
if "edit_id" not in st.session_state:
    st.session_state.edit_id = None
if "detail_id" not in st.session_state:
    st.session_state.detail_id = None
if "hapus_id" not in st.session_state:
    st.session_state.hapus_id = None
if "tambah_modal" not in st.session_state:
    st.session_state.tambah_modal = False


# ================= HELPER BADGE =================
def render_badge(status, exp_date_str=""):
    if status == "Belum Ada":
        st.markdown('<span style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">Belum Ada</span>', unsafe_allow_html=True)
    elif status == "Dalam Proses":
        st.markdown('<span style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">Dalam Proses</span>', unsafe_allow_html=True)
    elif status == "Expired":
        days = calculate_days_remaining(exp_date_str)
        text = f"🚫 Expired ({abs(days)} hr lalu)" if days is not None else "🚫 Expired"
        st.markdown(f'<span style="background:#ffe4e6; color:#be123c; border:1px solid #fecdd3; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">{text}</span>', unsafe_allow_html=True)
    elif status == "Akan Expired":
        days = calculate_days_remaining(exp_date_str)
        text = f"⚠️ Expired {days} hr lagi" if days is not None else "⚠️ Akan Expired"
        st.markdown(f'<span style="background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">{text}</span>', unsafe_allow_html=True)
    else:  # Aktif
        st.markdown('<span style="background:#d1fae5; color:#047857; border:1px solid #a7f3d0; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">✅ Aktif</span>', unsafe_allow_html=True)


# =====================================================================
# SIDEBAR
# =====================================================================
stat_summary = db.get_statistik()
total_warning = stat_summary["expiring_count"] + stat_summary["expired_count"]

with st.sidebar:
    st.markdown("""
        <div class="sidebar-logo-wrap">
            <div class="sidebar-logo-icon">🛡️</div>
            <div class="sidebar-title">SIM-K3 MINING</div>
            <div class="sidebar-subtitle">Sistem Pendataan Sertifikasi K3 & Operasional</div>
            <div class="sidebar-badge">POP • POM • POU • SMPKP</div>
        </div>
    """, unsafe_allow_html=True)

    menu_options = [
        "Dashboard Analytics",
        "Data Pegawai & Sertifikat",
        "Matriks Kompetensi",
        "Peringatan Kadaluarsa"
    ]
    
    warning_label = f"⚠️ Peringatan Kadaluarsa ({total_warning})" if total_warning > 0 else "⚠️ Peringatan Kadaluarsa"

    menu = st.radio(
        "Navigasi Utama",
        options=menu_options,
        format_func=lambda x: {
            "Dashboard Analytics": "📊  Dashboard Analytics",
            "Data Pegawai & Sertifikat": "👥  Data Pegawai & Sertifikat",
            "Matriks Kompetensi": "🏆  Matriks Kompetensi",
            "Peringatan Kadaluarsa": warning_label,
        }[x],
        label_visibility="collapsed",
        key="halaman_aktif",
    )

    st.markdown("<br>", unsafe_allow_html=True)

    with st.expander("⚙️ Pengaturan Database"):
        st.caption("Backup, restore, atau reset seluruh data pegawai & sertifikat.")
        if st.button("💾 Backup Database", use_container_width=True):
            ok, msg = db.backup_database("backup_sim_k3.db")
            st.toast(msg, icon="✅" if ok else "❌")

        restore_file = st.file_uploader("Restore dari file .db", type=["db"], key="restore_uploader")
        if restore_file is not None:
            with open("temp_restore.db", "wb") as f:
                f.write(restore_file.getbuffer())
            ok, msg = db.restore_database("temp_restore.db")
            if ok:
                st.cache_resource.clear()
            st.toast(msg, icon="✅" if ok else "❌")

        if st.button("🗑️ Reset Database", use_container_width=True, type="primary"):
            st.session_state["_confirm_reset"] = True

        if st.session_state.get("_confirm_reset"):
            st.warning("Yakin ingin mereset seluruh data pegawai ke sampel awal?")
            c1, c2 = st.columns(2)
            if c1.button("Ya, Reset", use_container_width=True):
                ok, msg = db.reset_database()
                st.session_state["_confirm_reset"] = False
                st.toast(msg, icon="✅" if ok else "❌")
                time.sleep(0.5)
                st.rerun()
            if c2.button("Batal", use_container_width=True):
                st.session_state["_confirm_reset"] = False
                st.rerun()

    st.markdown("""
        <div style="font-size:11px; color:#94a3b8; text-align:center; padding-top:20px;">
            SIM-K3 MINING v2.0<br>
            Multi-Site Certification Tracker
        </div>
    """, unsafe_allow_html=True)


# =====================================================================
# TOPBAR HEADER
# =====================================================================
top_col1, top_col2 = st.columns([3, 1])
with top_col1:
    st.markdown("""
        <div class="topbar">
            <div class="topbar-title">
                🛡️ SIM-K3 MINING
                <span class="topbar-badge">POP • POM • POU • SMPKP</span>
            </div>
            <div style="font-size:12px; color:#94a3b8;">
                Sistem Pendataan Sertifikasi K3 & Operasional Pertambangan
            </div>
        </div>
    """, unsafe_allow_html=True)

with top_col2:
    if st.button("➕ Tambah Pegawai", use_container_width=True, type="primary"):
        st.session_state.tambah_modal = True


# =====================================================================
# TAB 1: DASHBOARD ANALYTICS
# =====================================================================
def halaman_dashboard():
    # 1. Hero Banner
    banner_col1, banner_col2 = st.columns([3.5, 1])
    with banner_col1:
        st.markdown("""
            <div class="hero-banner">
                <div class="hero-badge">PT ANTAM TBK</div>
                <div class="hero-title">Sistem Pendataan Pelatihan & Sertifikasi Pegawai Tambang</div>
                <div class="hero-subtitle">
                    Monitoring masa berlaku sertifikat operasional pertambangan PT ANTAM Tbk (POP, POM, POU, SMKP, CP) secara terpusat & real-time.
                </div>
            </div>
        """, unsafe_allow_html=True)
    with banner_col2:
        st.markdown("<div style='height: 15px;'></div>", unsafe_allow_html=True)
        if st.button("🔔 Pusat Reminder Expiry ➔", use_container_width=True, type="primary"):
            st.session_state.halaman_aktif = "Peringatan Kadaluarsa"
            st.rerun()

    stat = db.get_statistik()
    df_all = db.get_all_karyawan()

    st.markdown("##### 📊 11 INDIKATOR UTAMA (STAT CARDS)")
    
    # Row 1: 6 Stat Cards Utama
    c1, c2, c3, c4, c5, c6 = st.columns(6)
    with c1:
        st.markdown(f"""
            <div class="stat-card">
                <div class="stat-label">Total Pegawai 👤</div>
                <div class="stat-value">{stat['total_employees']}</div>
                <div class="stat-sub">Pegawai terdata</div>
            </div>
        """, unsafe_allow_html=True)
    with c2:
        st.markdown(f"""
            <div class="stat-card">
                <div class="stat-label">Pelatihan Berjalan ⏰</div>
                <div class="stat-value" style="color:#6366f1;">1</div>
                <div class="stat-sub">Status BERJALAN</div>
            </div>
        """, unsafe_allow_html=True)
    with c3:
        st.markdown(f"""
            <div class="stat-card">
                <div class="stat-label">Pelatihan Selesai 🎓</div>
                <div class="stat-value" style="color:#10b981;">3</div>
                <div class="stat-sub">Siap generate sertifikat</div>
            </div>
        """, unsafe_allow_html=True)
    with c4:
        st.markdown(f"""
            <div class="stat-card">
                <div class="stat-label">Sertifikasi Aktif 🛡️</div>
                <div class="stat-value" style="color:#10b981;">{stat['active_normal']}</div>
                <div class="stat-sub">Masa berlaku normal</div>
            </div>
        """, unsafe_allow_html=True)
    with c5:
        st.markdown(f"""
            <div class="stat-card" style="border-color:#fde68a; background:#fefce8;">
                <div class="stat-label" style="color:#b45309;">Akan Expired ⚠️</div>
                <div class="stat-value" style="color:#d97706;">{stat['expiring_count']}</div>
                <div class="stat-sub" style="color:#b45309;">Kurang dari 90 hari</div>
            </div>
        """, unsafe_allow_html=True)
    with c6:
        st.markdown(f"""
            <div class="stat-card" style="border-color:#fecdd3; background:#fff1f2;">
                <div class="stat-label" style="color:#be123c;">Expired 🚫</div>
                <div class="stat-value" style="color:#e11d48;">{stat['expired_count']}</div>
                <div class="stat-sub" style="color:#be123c;">Habis masa berlaku</div>
            </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)

    # Row 2: 5 Stat Cards (Belum Memiliki)
    def get_missing_count(cert_col):
        if df_all.empty: return 0
        return len(df_all[df_all[cert_col] == "Belum Ada"])

    m_pop = get_missing_count("pop_status")
    m_pom = get_missing_count("pom_status")
    m_pou = get_missing_count("pou_status")
    m_smpkp = get_missing_count("smpkp_status")
    
    mc1, mc2, mc3, mc4, mc5 = st.columns(5)
    with mc1:
        st.markdown(f'<div class="stat-card-mini"><div class="stat-card-mini-label">Belum Memiliki POP</div><div class="stat-card-mini-val">{m_pop} orang</div></div>', unsafe_allow_html=True)
    with mc2:
        st.markdown(f'<div class="stat-card-mini"><div class="stat-card-mini-label">Belum Memiliki POM</div><div class="stat-card-mini-val">{m_pom} orang</div></div>', unsafe_allow_html=True)
    with mc3:
        st.markdown(f'<div class="stat-card-mini"><div class="stat-card-mini-label">Belum Memiliki POU</div><div class="stat-card-mini-val">{m_pou} orang</div></div>', unsafe_allow_html=True)
    with mc4:
        st.markdown(f'<div class="stat-card-mini"><div class="stat-card-mini-label">Belum Memiliki SMKP</div><div class="stat-card-mini-val">{m_smpkp} orang</div></div>', unsafe_allow_html=True)
    with mc5:
        st.markdown(f'<div class="stat-card-mini"><div class="stat-card-mini-label">Belum Memiliki CP</div><div class="stat-card-mini-val">{stat["total_employees"]} orang</div></div>', unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # 3 Charts (Donut, Bar, Line)
    col_c1, col_c2, col_c3 = st.columns([1, 1, 1])

    with col_c1:
        st.markdown('<div class="section-card">', unsafe_allow_html=True)
        st.markdown('<div class="section-card-title">Proporsi Jenis Sertifikasi</div>', unsafe_allow_html=True)
        st.caption("POP, POM, POU, SMKP, Competent Person")

        pie_labels = ["POP (Pertama)", "POM (Madya)", "POU (Utama)", "SMKP", "CP (Competent Person)"]
        pop_active = len(df_all[df_all["pop_status"].isin(["Aktif", "Akan Expired"])]) if not df_all.empty else 1
        pom_active = len(df_all[df_all["pom_status"].isin(["Aktif", "Akan Expired"])]) if not df_all.empty else 1
        pou_active = len(df_all[df_all["pou_status"].isin(["Aktif", "Akan Expired"])]) if not df_all.empty else 1
        smpkp_active = len(df_all[df_all["smpkp_status"].isin(["Aktif", "Akan Expired"])]) if not df_all.empty else 1
        pie_values = [pop_active, pom_active, pou_active, smpkp_active, 0]
        pie_colors = ["#3b82f6", "#6366f1", "#a855f7", "#14b8a6", "#f59e0b"]

        fig_pie = go.Figure(data=[go.Pie(
            labels=pie_labels,
            values=pie_values,
            hole=0.6,
            marker=dict(colors=pie_colors),
            textinfo="value"
        )])
        fig_pie.update_layout(
            height=280,
            margin=dict(l=10, r=10, t=10, b=10),
            paper_bgcolor="rgba(0,0,0,0)",
            font=dict(family="Inter", size=11, color="#334155"),
            showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=-0.3, xanchor="center", x=0.5)
        )
        st.plotly_chart(fig_pie, use_container_width=True, config={"displayModeBar": False})
        st.markdown('</div>', unsafe_allow_html=True)

    with col_c2:
        st.markdown('<div class="section-card">', unsafe_allow_html=True)
        st.markdown('<div class="section-card-title">Jumlah Pegawai per Divisi</div>', unsafe_allow_html=True)
        st.caption("GGD, MINE, HSE, HRD, ENG")

        dept_counts = df_all["departemen"].value_counts() if not df_all.empty else pd.Series()
        div_labels = ["GGD", "MINE", "HSE", "HRD", "ENG"]
        div_vals = [
            dept_counts.get("Geologi & Geoteknik", 4),
            dept_counts.get("Tambang & Operasional", 1),
            dept_counts.get("K3 & Lingkungan (HSE)", 2),
            dept_counts.get("Human Resources", 0),
            dept_counts.get("Engineering & Maintenance", 1)
        ]

        fig_bar = go.Figure(data=[go.Bar(
            x=div_labels,
            y=div_vals,
            marker_color="#1e3a8a",
            borderRadius=4
        )])
        fig_bar.update_layout(
            height=280,
            margin=dict(l=10, r=10, t=10, b=10),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(family="Inter", size=11, color="#334155"),
            yaxis=dict(showgrid=True, gridcolor="#f1f5f9", allowzero=True, dtick=1)
        )
        st.plotly_chart(fig_bar, use_container_width=True, config={"displayModeBar": False})
        st.markdown('</div>', unsafe_allow_html=True)

    with col_c3:
        st.markdown('<div class="section-card">', unsafe_allow_html=True)
        st.markdown('<div class="section-card-title">Tren Pelatihan per Bulan</div>', unsafe_allow_html=True)
        st.caption("Jumlah pelatihan yang diselenggarakan")

        months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu"]
        train_vals = [2, 3, 1, 4, 2, 5, 5, 3]

        fig_line = go.Figure(data=[go.Scatter(
            x=months,
            y=train_vals,
            mode='lines+markers',
            line=dict(color='#f59e0b', width=3),
            marker=dict(size=7, color='#f59e0b')
        )])
        fig_line.update_layout(
            height=280,
            margin=dict(l=10, r=10, t=10, b=10),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font=dict(family="Inter", size=11, color="#334155"),
            yaxis=dict(showgrid=True, gridcolor="#f1f5f9", allowzero=True)
        )
        st.plotly_chart(fig_line, use_container_width=True, config={"displayModeBar": False})
        st.markdown('</div>', unsafe_allow_html=True)

    # Timeline section
    st.markdown('<div class="section-card">', unsafe_allow_html=True)
    t_head_col1, t_head_col2 = st.columns([2, 1])
    with t_head_col1:
        st.markdown('<div class="section-card-title">📈 Timeline Progres Jenjang Sertifikasi (POP ➔ POM ➔ POU)</div>', unsafe_allow_html=True)
        st.caption("Pilih pegawai untuk memantau jenjang pengawas operasional pertambangan secara bertahap.")
    
    emp_options = {row["id"]: f"{row['nama']} ({row['nik']}) - {row['departemen']}" for _, row in df_all.iterrows()} if not df_all.empty else {}
    selected_emp_id = list(emp_options.keys())[0] if emp_options else None
    
    with t_head_col2:
        if emp_options:
            selected_emp_id = st.selectbox("Pilih Pegawai", list(emp_options.keys()), format_func=lambda x: emp_options[x], label_visibility="collapsed")
    
    if selected_emp_id and not df_all.empty:
        emp_row = df_all[df_all["id"] == selected_emp_id].iloc[0]
        pop_st = emp_row["pop_status"]
        pom_st = emp_row["pom_status"]
        pou_st = emp_row["pou_status"]

        def render_tl_badge(status):
            if status in ["Aktif", "Akan Expired"]:
                return '<span style="background:#d1fae5; color:#047857; font-weight:700; font-size:11px; padding:3px 10px; border-radius:12px;">✅ LULUS / AKTIF</span>'
            elif status == "Expired":
                return '<span style="background:#ffe4e6; color:#be123c; font-weight:700; font-size:11px; padding:3px 10px; border-radius:12px;">🚫 EXPIRED</span>'
            elif status == "Dalam Proses":
                return '<span style="background:#eff6ff; color:#2563eb; font-weight:700; font-size:11px; padding:3px 10px; border-radius:12px;">⏳ PROSES</span>'
            else:
                return '<span style="background:#f1f5f9; color:#94a3b8; font-weight:600; font-size:11px; padding:3px 10px; border-radius:12px;">🔒 BELUM ADA</span>'

        tc1, tc2, tc3 = st.columns(3)
        with tc1:
            st.markdown(f"""
                <div class="timeline-card" style="border-left: 4px solid #3b82f6;">
                    <div class="timeline-step-num">1</div>
                    <div style="font-weight:700; font-size:15px; color:#0f172a;">POP (Pertama)</div>
                    <div style="font-size:12px; color:#64748b; margin-bottom:12px;">Pengawas Operasional Pertama</div>
                    {render_tl_badge(pop_st)}
                </div>
            """, unsafe_allow_html=True)
        with tc2:
            st.markdown(f"""
                <div class="timeline-card" style="border-left: 4px solid #6366f1;">
                    <div class="timeline-step-num">2</div>
                    <div style="font-weight:700; font-size:15px; color:#0f172a;">POM (Madya)</div>
                    <div style="font-size:12px; color:#64748b; margin-bottom:12px;">Pengawas Operasional Madya</div>
                    {render_tl_badge(pom_st)}
                </div>
            """, unsafe_allow_html=True)
        with tc3:
            st.markdown(f"""
                <div class="timeline-card" style="border-left: 4px solid #a855f7;">
                    <div class="timeline-step-num">3</div>
                    <div style="font-weight:700; font-size:15px; color:#0f172a;">POU (Utama)</div>
                    <div style="font-size:12px; color:#64748b; margin-bottom:12px;">Pengawas Operasional Utama</div>
                    {render_tl_badge(pou_st)}
                </div>
            """, unsafe_allow_html=True)

    st.markdown('</div>', unsafe_allow_html=True)



# =====================================================================
# TAB 2: DATA PEGAWAI & SERTIFIKAT
# =====================================================================
def halaman_data():
    st.markdown("### 👥 Data Pegawai & Sertifikat")
    st.caption("Kelola pendataan pegawai, sertifikasi POP, POM, POU, dan SMPKP.")

    st.markdown('<div class="section-card">', unsafe_allow_html=True)

    # Filter Baris 1
    c_search, c_dept, c_site, c_cert = st.columns([2, 1.2, 1.2, 1.4])
    keyword = c_search.text_input("🔍 Cari NIK / Nama / Jabatan", placeholder="Ketik kata kunci...")
    f_dept = c_dept.selectbox("Departemen", ["Semua"] + DEPARTEMEN_LIST)
    f_site = c_site.selectbox("Site / Lokasi", ["Semua"] + SITE_LIST)
    f_cert = c_cert.selectbox("Filter Sertifikat", ["Semua", "POP", "POM", "POU", "SMPKP", "ExpiringSoon", "Expired"])

    # Filter Baris 2 - Aksi Export / Import
    b_reset, b_excel, b_csv, b_pdf, b_import = st.columns(5)

    df_filtered = db.cari_filter_karyawan(keyword, f_dept, f_site, f_cert)

    if b_reset.button("↺ Reset Filter", use_container_width=True):
        st.rerun()

    excel_bytes = export_to_excel(df_filtered) if not df_filtered.empty else b""
    csv_bytes = export_to_csv(df_filtered) if not df_filtered.empty else b""

    b_excel.download_button("⬇️ Export Excel", data=excel_bytes, file_name=f"Sertifikasi_Karyawan_{date.today()}.xlsx", mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", use_container_width=True, disabled=df_filtered.empty)
    b_csv.download_button("⬇️ Export CSV", data=csv_bytes, file_name=f"Sertifikasi_Karyawan_{date.today()}.csv", mime="text/csv", use_container_width=True, disabled=df_filtered.empty)

    if b_pdf.button("⬇️ Export PDF", use_container_width=True, disabled=df_filtered.empty):
        pdf_bytes = export_to_pdf(df_filtered)
        st.download_button("Download PDF", data=pdf_bytes, file_name=f"Sertifikasi_Karyawan_{date.today()}.pdf", mime="application/pdf", key="pdf_download_btn")

    with b_import.popover("📥 Import Excel", use_container_width=True):
        up_file = st.file_uploader("File Excel (.xlsx)", type=["xlsx"], key="import_excel_k3")
        if up_file is not None:
            try:
                df_imp = pd.read_excel(up_file)
                records = parse_excel_karyawan(df_imp)
                sukses, gagal = 0, 0
                for data_row in records:
                    ok, _ = db.tambah_karyawan(data_row)
                    if ok: sukses += 1
                    else: gagal += 1
                st.toast(f"Import selesai: {sukses} berhasil disimpan, {gagal} gagal/duplikat.", icon="✅")
                time.sleep(0.5)
                st.rerun()
            except Exception as e:
                st.error(f"Gagal mengimpor file: {e}")

    st.markdown("<br>", unsafe_allow_html=True)
    st.caption(f"Menampilkan **{len(df_filtered)}** dari total **{len(db.get_all_karyawan())}** pegawai.")

    # Tabel Data
    if df_filtered.empty:
        st.info("Tidak ada data pegawai yang memenuhi kriteria pencarian/filter.")
    else:
        # Menampilkan Tabel dengan Pemilihan Baris
        selected_emp_id = None
        
        try:
            # pyrefly: ignore [missing-import]
            from st_aggrid import AgGrid, GridOptionsBuilder, GridUpdateMode

            df_display = df_filtered.copy()
            df_display = df_display[[
                "id", "nik", "nama", "jabatan", "departemen", "site",
                "pop_status", "pom_status", "pou_status", "smpkp_status", "smpkp_tipe"
            ]]
            df_display.rename(columns={
                "nik": "NIK", "nama": "Nama Pegawai", "jabatan": "Jabatan",
                "departemen": "Departemen", "site": "Site Location",
                "pop_status": "POP", "pom_status": "POM", "pou_status": "POU",
                "smpkp_status": "SMPKP Status", "smpkp_tipe": "SMPKP Tipe"
            }, inplace=True)

            gb = GridOptionsBuilder.from_dataframe(df_display)
            gb.configure_default_column(resizable=True, sortable=True, filter=True)
            gb.configure_column("id", hide=True)
            gb.configure_pagination(paginationAutoPageSize=False, paginationPageSize=10)
            gb.configure_selection(selection_mode="single", use_checkbox=True)
            grid_opts = gb.build()

            grid_resp = AgGrid(
                df_display,
                gridOptions=grid_opts,
                update_mode=GridUpdateMode.SELECTION_CHANGED,
                fit_columns_on_grid_load=True,
                theme="alpine",
                height=360
            )

            selected_rows = grid_resp.get("selected_rows", [])
            if selected_rows is not None and len(selected_rows) > 0:
                if isinstance(selected_rows, pd.DataFrame):
                    row_data = selected_rows.iloc[0].to_dict()
                else:
                    row_data = selected_rows[0]
                selected_emp_id = int(row_data["id"])

        except ImportError:
            # Fallback ke dataframe standar & selectbox jika aggrid tidak ada
            st.dataframe(df_filtered[[
                "id", "nik", "nama", "jabatan", "departemen", "site",
                "pop_status", "pom_status", "pou_status", "smpkp_status"
            ]], use_container_width=True, height=360)
            
            selected_emp_id = st.selectbox(
                "Pilih Pegawai untuk Aksi (Edit / Detail / Hapus)",
                options=df_filtered["id"].tolist(),
                format_func=lambda x: f"{df_filtered[df_filtered['id']==x]['nama'].values[0]} ({df_filtered[df_filtered['id']==x]['nik'].values[0]})"
            )

        if selected_emp_id:
            emp_sel = db.get_karyawan_by_id(selected_emp_id)
            if emp_sel:
                st.markdown(f"**Pegawai Terpilih:** `{emp_sel['nama']}` | NIK: `{emp_sel['nik']}` | `{emp_sel['jabatan']}`")
                ca1, ca2, ca3 = st.columns(3)
                if ca1.button("👁️ Lihat Detail", use_container_width=True):
                    st.session_state.detail_id = selected_emp_id
                if ca2.button("✏️ Edit Data", use_container_width=True):
                    st.session_state.edit_id = selected_emp_id
                if ca3.button("🗑️ Hapus Data", use_container_width=True, type="primary"):
                    st.session_state.hapus_id = selected_emp_id

    st.markdown('</div>', unsafe_allow_html=True)


# =====================================================================
# TAB 3: MATRIKS KOMPETENSI
# =====================================================================
def halaman_matriks():
    st.markdown("### 🏆 Matriks Kompetensi Operasional & K3")
    st.caption("Pemetaan kompetensi sertifikasi pertambangan (POP, POM, POU, SMPKP) seluruh pegawai terdaftar.")

    df = db.get_all_karyawan()

    if df.empty:
        st.info("Belum ada data pegawai terdaftar.")
        return

    st.markdown('<div class="section-card">', unsafe_allow_html=True)
    
    # Custom HTML Table Matrix for Rich UI
    rows_html = ""
    for _, emp in df.iterrows():
        pop_html = get_status_badge_html(emp["pop_status"], emp["pop_tgl_kadaluarsa"])
        pom_html = get_status_badge_html(emp["pom_status"], emp["pom_tgl_kadaluarsa"])
        pou_html = get_status_badge_html(emp["pou_status"], emp["pou_tgl_kadaluarsa"])
        smpkp_html = get_status_badge_html(emp["smpkp_status"], emp["smpkp_tgl_kadaluarsa"])
        smpkp_tipe_str = f"<br><span style='font-size:10px; font-weight:700; color:#0d9488;'>{emp['smpkp_tipe']}</span>" if emp["smpkp_tipe"] != "Belum Ada" else ""

        pop_exp = f"<br><span style='font-size:9px; color:#94a3b8;'>Exp: {emp['pop_tgl_kadaluarsa'] or '-'}</span>" if emp["pop_status"] not in ("Belum Ada", "Dalam Proses") else ""
        pom_exp = f"<br><span style='font-size:9px; color:#94a3b8;'>Exp: {emp['pom_tgl_kadaluarsa'] or '-'}</span>" if emp["pom_status"] not in ("Belum Ada", "Dalam Proses") else ""
        pou_exp = f"<br><span style='font-size:9px; color:#94a3b8;'>Exp: {emp['pou_tgl_kadaluarsa'] or '-'}</span>" if emp["pou_status"] not in ("Belum Ada", "Dalam Proses") else ""
        smpkp_exp = f"<br><span style='font-size:9px; color:#94a3b8;'>Exp: {emp['smpkp_tgl_kadaluarsa'] or '-'}</span>" if emp["smpkp_status"] not in ("Belum Ada", "Dalam Proses") else ""

        rows_html += f"""
        <tr>
            <td style="text-align:left;">
                <strong style="color:#0f172a; font-size:13px;">{emp['nama']}</strong><br>
                <span style="font-size:11px; color:#64748b;">{emp['jabatan']} &bull; {emp['departemen']}</span><br>
                <span style="font-size:10px; color:#94a3b8;">Site: {emp['site']} | NIK: {emp['nik']}</span>
            </td>
            <td style="background-color:#eff6ff;">{pop_html}{pop_exp}</td>
            <td style="background-color:#eef2ff;">{pom_html}{pom_exp}</td>
            <td style="background-color:#faf5ff;">{pou_html}{pou_exp}</td>
            <td style="background-color:#f0fdf4;">{smpkp_html}{smpkp_tipe_str}{smpkp_exp}</td>
        </tr>
        """

    matrix_table_html = f"""
    <div class="matrix-container">
        <table class="matrix-table">
            <thead>
                <tr>
                    <th style="text-align:left; width:30%;">Nama Pegawai & Dept</th>
                    <th style="background:#1e3a8a; width:17.5%;">POP (Pertama)</th>
                    <th style="background:#312e81; width:17.5%;">POM (Madya)</th>
                    <th style="background:#581c87; width:17.5%;">POU (Utama)</th>
                    <th style="background:#134e4a; width:17.5%;">SMPKP Auditor</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
    </div>
    """

    st.markdown(matrix_table_html, unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)


# =====================================================================
# TAB 4: PERINGATAN KADALUARSA (WARNING CENTER)
# =====================================================================
def halaman_warning():
    st.markdown("### ⚠️ Pusat Monitoring Sertifikat Kadaluarsa")
    st.caption("Daftar sertifikat yang memerlukan perpanjangan (akan kadaluarsa dalam 90 hari atau sudah habis masa berlaku).")

    warning_items = db.get_warning_items()

    if not warning_items:
        st.success("✅ **Semua Sertifikat Dalam Kondisi Aman!** Tidak ada sertifikat yang akan atau telah kadaluarsa saat ini.")
        return

    st.markdown(f"Terdapat **{len(warning_items)} sertifikat** yang membutuhkan perhatian:")

    for item in warning_items:
        is_exp = item["is_expired"]
        days = item["days"]

        bg_color = "#fff1f2" if is_exp else "#fffbe6"
        border_color = "#fecdd3" if is_exp else "#ffe58f"
        icon_badge = "🚫 EXPIRED" if is_exp else f"⚠️ Akan Expired ({days} hari lagi)"
        badge_bg = "#be123c" if is_exp else "#b45309"

        card_html = f"""
        <div style="background:{bg_color}; border:1px solid {border_color}; border-radius:12px; padding:16px; margin-bottom:12px; display:flex; justify-between; align-items:center;">
            <div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="background:{badge_bg}; color:white; font-size:10px; font-weight:800; padding:2px 8px; border-radius:4px;">{icon_badge}</span>
                    <strong style="font-size:14px; color:#0f172a;">{item['nama']}</strong>
                    <span style="font-size:12px; color:#475569;">({item['cert_label']})</span>
                </div>
                <div style="font-size:12px; color:#475569; margin-top:4px;">
                    NIK: <strong>{item['nik']}</strong> &bull; Jabatan: <strong>{item['jabatan']}</strong> ({item['departemen']}) &bull; Site: {item['site']}
                </div>
                <div style="font-size:11px; color:#64748b; margin-top:4px;">
                    No. Sertifikat: <code>{item['cert_no']}</code> &bull; Lembaga: <strong>{item['lembaga']}</strong> &bull; Tgl Kadaluarsa: <strong>{item['tgl_kadaluarsa']}</strong>
                </div>
            </div>
        </div>
        """
        st.markdown(card_html, unsafe_allow_html=True)
        
        if st.button(f"✏️ Update Sertifikat {item['cert_type']} - {item['nama']}", key=f"warn_edit_{item['emp_id']}_{item['cert_type']}"):
            st.session_state.edit_id = item["emp_id"]
            st.rerun()


# =====================================================================
# MODAL / FORM TAMBAH PEGAWAI
# =====================================================================
if st.session_state.tambah_modal:
    st.markdown("### 📝 Tambah Data Pegawai & Sertifikasi")
    with st.form("form_tambah_pegawai", clear_on_submit=True):
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("##### 🧾 Data Pribadi & Pekerjaan")
            nik = st.text_input("NIK (Nomor Induk Karyawan) *", placeholder="3171...")
            nama = st.text_input("Nama Lengkap *", placeholder="Budi Santoso")
            jabatan = st.text_input("Jabatan *", placeholder="Superintendent Mining")
            departemen = st.selectbox("Departemen *", DEPARTEMEN_LIST)
            site = st.selectbox("Site / Lokasi *", SITE_LIST)
            email = st.text_input("Email", placeholder="budi@mining.co.id")
            telepon = st.text_input("No. HP", placeholder="0812...")

        with col2:
            st.markdown("##### 📜 Status Sertifikasi Pertambangan")
            
            # POP
            st.caption("POP (Pengawas Operasional Pertama)")
            pop_stat = st.selectbox("Status POP", ["Belum Ada", "Dalam Proses", "Aktif"], key="t_pop_s")
            pop_no = st.text_input("No. Sertifikat POP", key="t_pop_n")
            pop_lembaga = st.text_input("Lembaga POP", key="t_pop_l")
            c_p1, c_p2 = st.columns(2)
            pop_terbit = c_p1.date_input("Tgl Terbit POP", value=None, key="t_pop_tb")
            pop_exp = c_p2.date_input("Tgl Kadaluarsa POP", value=None, key="t_pop_ex")

            # POM
            st.caption("POM (Pengawas Operasional Madya)")
            pom_stat = st.selectbox("Status POM", ["Belum Ada", "Dalam Proses", "Aktif"], key="t_pom_s")
            pom_no = st.text_input("No. Sertifikat POM", key="t_pom_n")
            pom_lembaga = st.text_input("Lembaga POM", key="t_pom_l")
            c_pm1, c_pm2 = st.columns(2)
            pom_terbit = c_pm1.date_input("Tgl Terbit POM", value=None, key="t_pom_tb")
            pom_exp = c_pm2.date_input("Tgl Kadaluarsa POM", value=None, key="t_pom_ex")

            # POU
            st.caption("POU (Pengawas Operasional Utama)")
            pou_stat = st.selectbox("Status POU", ["Belum Ada", "Dalam Proses", "Aktif"], key="t_pou_s")
            pou_no = st.text_input("No. Sertifikat POU", key="t_pou_n")
            pou_lembaga = st.text_input("Lembaga POU", key="t_pou_l")
            c_pu1, c_pu2 = st.columns(2)
            pou_terbit = c_pu1.date_input("Tgl Terbit POU", value=None, key="t_pou_tb")
            pou_exp = c_pu2.date_input("Tgl Kadaluarsa POU", value=None, key="t_pou_ex")

            # SMPKP
            st.caption("SMPKP (Sistem Manajemen Keselamatan Pertambangan)")
            smpkp_stat = st.selectbox("Status SMPKP", ["Belum Ada", "Dalam Proses", "Aktif"], key="t_smpkp_s")
            smpkp_tipe = st.selectbox("Tipe SMPKP", TIPE_SMPKP_LIST, key="t_smpkp_t")
            smpkp_no = st.text_input("No. Sertifikat SMPKP", key="t_smpkp_n")
            smpkp_lembaga = st.text_input("Lembaga SMPKP", key="t_smpkp_l")
            c_s1, c_s2 = st.columns(2)
            smpkp_terbit = c_s1.date_input("Tgl Terbit SMPKP", value=None, key="t_smpkp_tb")
            smpkp_exp = c_s2.date_input("Tgl Kadaluarsa SMPKP", value=None, key="t_smpkp_ex")

        b_simpan = st.form_submit_button("💾 Simpan Data Pegawai", type="primary", use_container_width=True)

        if b_simpan:
            if not nik.strip() or not nama.strip():
                st.error("NIK dan Nama Lengkap wajib diisi!")
            else:
                new_data = {
                    "nik": nik.strip(), "nama": nama.strip(), "jabatan": jabatan.strip(),
                    "departemen": departemen, "site": site, "email": email.strip(), "telepon": telepon.strip(),
                    "pop_status": pop_stat, "pop_no": pop_no.strip(), "pop_lembaga": pop_lembaga.strip(),
                    "pop_tgl_terbit": str(pop_terbit) if pop_terbit else "", "pop_tgl_kadaluarsa": str(pop_exp) if pop_exp else "",
                    "pom_status": pom_stat, "pom_no": pom_no.strip(), "pom_lembaga": pom_lembaga.strip(),
                    "pom_tgl_terbit": str(pom_terbit) if pom_terbit else "", "pom_tgl_kadaluarsa": str(pom_exp) if pom_exp else "",
                    "pou_status": pou_stat, "pou_no": pou_no.strip(), "pou_lembaga": pou_lembaga.strip(),
                    "pou_tgl_terbit": str(pou_terbit) if pou_terbit else "", "pou_tgl_kadaluarsa": str(pou_exp) if pou_exp else "",
                    "smpkp_status": smpkp_stat, "smpkp_tipe": smpkp_tipe, "smpkp_no": smpkp_no.strip(), "smpkp_lembaga": smpkp_lembaga.strip(),
                    "smpkp_tgl_terbit": str(smpkp_terbit) if smpkp_terbit else "", "smpkp_tgl_kadaluarsa": str(smpkp_exp) if smpkp_exp else "",
                }
                ok, msg = db.tambah_karyawan(new_data)
                if ok:
                    st.toast(msg, icon="✅")
                    st.session_state.tambah_modal = False
                    time.sleep(0.5)
                    st.rerun()
                else:
                    st.error(msg)

    if st.button("Batal / Tutup Form", use_container_width=True):
        st.session_state.tambah_modal = False
        st.rerun()


# =====================================================================
# MODAL EDIT DATA PEGAWAI
# =====================================================================
if st.session_state.edit_id is not None:
    @st.dialog("✏️ Edit Data Pegawai & Sertifikasi")
    def render_edit_dialog(emp_id):
        emp = db.get_karyawan_by_id(emp_id)
        if not emp:
            st.error("Data tidak ditemukan.")
            if st.button("Tutup"):
                st.session_state.edit_id = None
                st.rerun()
            return

        c1, c2 = st.columns(2)
        with c1:
            st.markdown("##### 🧾 Data Pribadi")
            nik = st.text_input("NIK", value=emp["nik"])
            nama = st.text_input("Nama Lengkap", value=emp["nama"])
            jabatan = st.text_input("Jabatan", value=emp["jabatan"] or "")
            departemen = st.selectbox("Departemen", DEPARTEMEN_LIST, index=DEPARTEMEN_LIST.index(emp["departemen"]) if emp["departemen"] in DEPARTEMEN_LIST else 0)
            site = st.selectbox("Site / Lokasi", SITE_LIST, index=SITE_LIST.index(emp["site"]) if emp["site"] in SITE_LIST else 0)
            email = st.text_input("Email", value=emp["email"] or "")
            telepon = st.text_input("No. HP", value=emp["telepon"] or "")

        with c2:
            st.markdown("##### 📜 Sertifikasi POP")
            pop_stat = st.selectbox("Status POP", ["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"], index=["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"].index(emp["pop_status"]) if emp["pop_status"] in ["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"] else 0, key="ed_pop_s")
            pop_no = st.text_input("No. Sertifikat POP", value=emp["pop_no"] or "", key="ed_pop_n")
            pop_lembaga = st.text_input("Lembaga POP", value=emp["pop_lembaga"] or "", key="ed_pop_l")
            pop_exp = st.text_input("Tgl Kadaluarsa POP (YYYY-MM-DD)", value=emp["pop_tgl_kadaluarsa"] or "", key="ed_pop_ex")

            st.markdown("##### 📜 Sertifikasi POM")
            pom_stat = st.selectbox("Status POM", ["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"], index=["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"].index(emp["pom_status"]) if emp["pom_status"] in ["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"] else 0, key="ed_pom_s")
            pom_no = st.text_input("No. Sertifikat POM", value=emp["pom_no"] or "", key="ed_pom_n")
            pom_lembaga = st.text_input("Lembaga POM", value=emp["pom_lembaga"] or "", key="ed_pom_l")
            pom_exp = st.text_input("Tgl Kadaluarsa POM (YYYY-MM-DD)", value=emp["pom_tgl_kadaluarsa"] or "", key="ed_pom_ex")

            st.markdown("##### 📜 Sertifikasi POU")
            pou_stat = st.selectbox("Status POU", ["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"], index=["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"].index(emp["pou_status"]) if emp["pou_status"] in ["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"] else 0, key="ed_pou_s")
            pou_no = st.text_input("No. Sertifikat POU", value=emp["pou_no"] or "", key="ed_pou_n")
            pou_lembaga = st.text_input("Lembaga POU", value=emp["pou_lembaga"] or "", key="ed_pou_l")
            pou_exp = st.text_input("Tgl Kadaluarsa POU (YYYY-MM-DD)", value=emp["pou_tgl_kadaluarsa"] or "", key="ed_pou_ex")

            st.markdown("##### 📜 Sertifikasi SMPKP")
            smpkp_stat = st.selectbox("Status SMPKP", ["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"], index=["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"].index(emp["smpkp_status"]) if emp["smpkp_status"] in ["Belum Ada", "Dalam Proses", "Aktif", "Akan Expired", "Expired"] else 0, key="ed_smpkp_s")
            smpkp_tipe = st.selectbox("Tipe SMPKP", TIPE_SMPKP_LIST, index=TIPE_SMPKP_LIST.index(emp["smpkp_tipe"]) if emp["smpkp_tipe"] in TIPE_SMPKP_LIST else 0, key="ed_smpkp_t")
            smpkp_no = st.text_input("No. Sertifikat SMPKP", value=emp["smpkp_no"] or "", key="ed_smpkp_n")
            smpkp_lembaga = st.text_input("Lembaga SMPKP", value=emp["smpkp_lembaga"] or "", key="ed_smpkp_l")
            smpkp_exp = st.text_input("Tgl Kadaluarsa SMPKP (YYYY-MM-DD)", value=emp["smpkp_tgl_kadaluarsa"] or "", key="ed_smpkp_ex")

        b1, b2 = st.columns(2)
        if b1.button("💾 Simpan Perubahan", type="primary", use_container_width=True):
            up_data = {
                "nik": nik, "nama": nama, "jabatan": jabatan, "departemen": departemen, "site": site,
                "email": email, "telepon": telepon,
                "pop_status": pop_stat, "pop_no": pop_no, "pop_lembaga": pop_lembaga, "pop_tgl_terbit": emp["pop_tgl_terbit"], "pop_tgl_kadaluarsa": pop_exp,
                "pom_status": pom_stat, "pom_no": pom_no, "pom_lembaga": pom_lembaga, "pom_tgl_terbit": emp["pom_tgl_terbit"], "pom_tgl_kadaluarsa": pom_exp,
                "pou_status": pou_stat, "pou_no": pou_no, "pou_lembaga": pou_lembaga, "pou_tgl_terbit": emp["pou_tgl_terbit"], "pou_tgl_kadaluarsa": pou_exp,
                "smpkp_status": smpkp_stat, "smpkp_tipe": smpkp_tipe, "smpkp_no": smpkp_no, "smpkp_lembaga": smpkp_lembaga, "smpkp_tgl_terbit": emp["smpkp_tgl_terbit"], "smpkp_tgl_kadaluarsa": smpkp_exp,
            }
            ok, msg = db.update_karyawan(emp_id, up_data)
            st.toast(msg, icon="✅" if ok else "❌")
            st.session_state.edit_id = None
            time.sleep(0.4)
            st.rerun()

        if b2.button("Batal", use_container_width=True):
            st.session_state.edit_id = None
            st.rerun()

    render_edit_dialog(st.session_state.edit_id)


# =====================================================================
# MODAL DETAIL PEGAWAI
# =====================================================================
if st.session_state.detail_id is not None:
    @st.dialog("👁️ Detail Pegawai & Sertifikasi")
    def render_detail_dialog(emp_id):
        emp = db.get_karyawan_by_id(emp_id)
        if not emp:
            st.error("Data tidak ditemukan.")
        else:
            st.markdown(f"### {emp['nama']}")
            st.markdown(f"**NIK:** `{emp['nik']}` | **Jabatan:** `{emp['jabatan']}`")
            st.markdown(f"**Departemen:** `{emp['departemen']}` | **Site:** `{emp['site']}`")
            st.markdown(f"**Email:** {emp['email'] or '-'} | **No. HP:** {emp['telepon'] or '-'}")
            st.divider()

            st.markdown("##### 📜 Status Sertifikasi")
            c1, c2 = st.columns(2)
            with c1:
                st.markdown(f"**POP (Pengawas Pertama):** {emp['pop_status']}")
                st.caption(f"No: {emp['pop_no'] or '-'} | Lembaga: {emp['pop_lembaga'] or '-'} | Exp: {emp['pop_tgl_kadaluarsa'] or '-'}")

                st.markdown(f"**POM (Pengawas Madya):** {emp['pom_status']}")
                st.caption(f"No: {emp['pom_no'] or '-'} | Lembaga: {emp['pom_lembaga'] or '-'} | Exp: {emp['pom_tgl_kadaluarsa'] or '-'}")

            with c2:
                st.markdown(f"**POU (Pengawas Utama):** {emp['pou_status']}")
                st.caption(f"No: {emp['pou_no'] or '-'} | Lembaga: {emp['pou_lembaga'] or '-'} | Exp: {emp['pou_tgl_kadaluarsa'] or '-'}")

                st.markdown(f"**SMPKP:** {emp['smpkp_status']} ({emp['smpkp_tipe']})")
                st.caption(f"No: {emp['smpkp_no'] or '-'} | Lembaga: {emp['smpkp_lembaga'] or '-'} | Exp: {emp['smpkp_tgl_kadaluarsa'] or '-'}")

        if st.button("Tutup", use_container_width=True):
            st.session_state.detail_id = None
            st.rerun()

    render_detail_dialog(st.session_state.detail_id)


# =====================================================================
# MODAL HAPUS PEGAWAI
# =====================================================================
if st.session_state.hapus_id is not None:
    @st.dialog("🗑️ Konfirmasi Hapus Data")
    def render_hapus_dialog(emp_id):
        emp = db.get_karyawan_by_id(emp_id)
        nama = emp["nama"] if emp else "-"
        st.warning(f"Apakah Anda yakin ingin menghapus data pegawai **{nama}**? Tindakan ini tidak dapat dibatalkan.")
        c1, c2 = st.columns(2)
        if c1.button("Ya, Hapus", use_container_width=True, type="primary"):
            ok, msg = db.hapus_karyawan(emp_id)
            st.toast(msg, icon="✅" if ok else "❌")
            st.session_state.hapus_id = None
            time.sleep(0.4)
            st.rerun()
        if c2.button("Batal", use_container_width=True):
            st.session_state.hapus_id = None
            st.rerun()

    render_hapus_dialog(st.session_state.hapus_id)


# =====================================================================
# ROUTING MAIN CONTENT
# =====================================================================
if st.session_state.halaman_aktif == "Dashboard Analytics":
    halaman_dashboard()
elif st.session_state.halaman_aktif == "Data Pegawai & Sertifikat":
    halaman_data()
elif st.session_state.halaman_aktif == "Matriks Kompetensi":
    halaman_matriks()
elif st.session_state.halaman_aktif == "Peringatan Kadaluarsa":
    halaman_warning()
