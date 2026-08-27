"""
styles.py
Berisi custom CSS untuk SIM-K3 MINING agar tampilan Streamlit terlihat seperti
dashboard enterprise modern (seperti UI React / Tailwind).
"""

CUSTOM_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@500;600;700&display=swap');

:root {
    --brand-amber: #f59e0b;
    --brand-dark: #0f172a;
    --brand-blue: #3b82f6;
    --brand-teal: #14b8a6;
    --brand-purple: #a855f7;
    --brand-indigo: #6366f1;
    --bg-light: #f8fafc;
    --card-white: #ffffff;
    --text-dark: #0f172a;
    --text-muted: #64748b;
    --border-soft: #e2e8f0;
    --radius-lg: 14px;
    --radius-md: 10px;
    --shadow-soft: 0 2px 8px rgba(15, 23, 42, 0.05);
    --shadow-hover: 0 6px 18px rgba(15, 23, 42, 0.1);
}

/* GLOBAL RESET */
html, body, [class*="css"] {
    font-family: 'Inter', 'Poppins', -apple-system, sans-serif !important;
    color: var(--text-dark);
}

.stApp {
    background: var(--bg-light);
}

#MainMenu, header[data-testid="stHeader"], footer {
    visibility: hidden;
    height: 0;
}

.block-container {
    padding-top: 1rem !important;
    padding-bottom: 2rem !important;
    max-width: 1400px;
}

div[data-testid="stDecoration"] { display: none; }

/* SIDEBAR */
section[data-testid="stSidebar"] {
    background: #0f172a;
    border-right: 1px solid #1e293b;
    min-width: 280px !important;
    max-width: 280px !important;
}

section[data-testid="stSidebar"] * {
    color: #f8fafc !important;
}

.sidebar-logo-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 12px;
    border-bottom: 1px solid #1e293b;
    margin-bottom: 16px;
    text-align: center;
}

.sidebar-logo-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: linear-gradient(135deg, #f59e0b, #d97706);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    margin-bottom: 10px;
    font-size: 24px;
    color: #0f172a !important;
    font-weight: 800;
}

.sidebar-title {
    font-weight: 800;
    font-size: 16px;
    letter-spacing: 0.5px;
    color: #ffffff !important;
}

.sidebar-subtitle {
    font-size: 11px;
    color: #94a3b8 !important;
    margin-top: 4px;
}

.sidebar-badge {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24 !important;
    border: 1px solid rgba(245, 158, 11, 0.4);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 700;
    margin-top: 6px;
    display: inline-block;
}

/* TOPBAR */
.topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0f172a;
    color: #ffffff;
    border-radius: var(--radius-md);
    padding: 12px 20px;
    margin-bottom: 20px;
    box-shadow: var(--shadow-soft);
}

.topbar-title {
    font-size: 16px;
    font-weight: 800;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 8px;
}

.topbar-badge {
    font-size: 11px;
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid rgba(245, 158, 11, 0.4);
    font-weight: 700;
}

/* CARDS */
.stat-card {
    background: var(--card-white);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
    box-shadow: var(--shadow-soft);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    height: 100%;
}
.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-hover);
}
.stat-label {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}
.stat-value {
    font-size: 28px;
    font-weight: 800;
    color: var(--text-dark);
    margin-top: 6px;
    line-height: 1.1;
}
.stat-sub {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 4px;
}

/* HERO BANNER STYLING */
.hero-banner {
    background: linear-gradient(135deg, #1e1b4b 0%, #1e293b 60%, #0f172a 100%);
    border-radius: 16px;
    padding: 24px 28px;
    color: #ffffff;
    margin-bottom: 24px;
    position: relative;
    box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
}
.hero-badge {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.4);
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 11px;
    font-weight: 700;
    display: inline-block;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
}
.hero-title {
    font-size: 22px;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 8px;
    letter-spacing: -0.5px;
}
.hero-subtitle {
    font-size: 13px;
    color: #cbd5e1;
    max-width: 800px;
    line-height: 1.5;
}

/* MINI STAT CARDS */
.stat-card-mini {
    background: var(--card-white);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    padding: 12px 14px;
    text-align: center;
    box-shadow: var(--shadow-soft);
}
.stat-card-mini-label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 600;
}
.stat-card-mini-val {
    font-size: 18px;
    font-weight: 800;
    color: var(--text-dark);
    margin-top: 4px;
}

/* TIMELINE CARD */
.timeline-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 20px;
    text-align: center;
    position: relative;
}
.timeline-step-num {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #1e1b4b;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    margin: 0 auto 12px auto;
}

.section-card {
    background: var(--card-white);
    border: 1px solid var(--border-soft);
    border-radius: var(--radius-lg);
    padding: 20px 24px;
    box-shadow: var(--shadow-soft);
    margin-bottom: 20px;
}
.section-card-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-dark);
    margin-bottom: 12px;
}

/* WARNING ALERT BOX */
.warning-alert-box {
    background: #fffbe6;
    border: 1px solid #ffe58f;
    border-radius: 12px;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
}

/* MATRIX TABLE STYLING */
.matrix-container {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid var(--border-soft);
}
.matrix-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}
.matrix-table th {
    background-color: #0f172a;
    color: white;
    padding: 10px 14px;
    text-align: center;
    font-weight: 700;
}
.matrix-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #f1f5f9;
    text-align: center;
}
.matrix-table tr:hover {
    background-color: #f8fafc;
}

/* CUSTOM BUTTONS */
.stButton > button {
    border-radius: 8px;
    font-weight: 600;
    padding: 0.5rem 1rem;
    transition: all 0.2s ease;
}

/* TABS STYLING */
.stTabs [data-baseweb="tab-list"] {
    gap: 8px;
    border-bottom: 1px solid var(--border-soft);
    margin-bottom: 20px;
}
.stTabs [data-baseweb="tab"] {
    padding: 10px 18px;
    font-weight: 600;
    font-size: 13px;
    border-radius: 8px 8px 0 0;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
</style>
"""


def inject_css():
    """Menyuntikkan custom CSS ke halaman Streamlit."""
    import streamlit as st
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)
