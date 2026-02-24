
import { useState, useEffect } from "react";

// ── Supabase config ──────────────────────────────────────────
const SUPABASE_URL = "https://gsrctkddyxustjsmqnzm.supabase.co";
const SUPABASE_KEY = "sb_publishable_B5-3N5Kw-ZJbdOaM402otA_cvCOjkgZ";

async function sbFetch(path: string, options: any = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function getLinks() {
  return await sbFetch("portfolio_links?order=created_at.desc") || [];
}
async function insertLink(link: any) {
  return await sbFetch("portfolio_links", { method: "POST", prefer: "return=representation", body: JSON.stringify(link) });
}
async function updateLink(token: string, data: any) {
  return await sbFetch(`portfolio_links?token=eq.${token}`, { method: "PATCH", prefer: "return=representation", body: JSON.stringify(data) });
}
async function deleteLink(token: string) {
  return await sbFetch(`portfolio_links?token=eq.${token}`, { method: "DELETE" });
}
async function findLink(token: string) {
  const rows = await sbFetch(`portfolio_links?token=eq.${token}&limit=1`) || [];
  return rows[0] || null;
}

const CATEGORIES = ["All", "Full Stack", "Frontend", "Mobile", "Backend", "Tool", "CMS"];
const DEFAULT_PASSWORD = "portfolio2026";

const PROJECTS = [
  { id: 1, title: "Ecu-consultores", category: "CMS", year: "2022", description: "Plataforma de comercio electrónico con carrito, pagos y panel admin.", tech: ["WordPress", "PHP", "Bootstrap", "MySQL"], color: "#6992ED", link: "https://ecuconsultores.org.pe/" },
  { id: 2, title: "Atria Miraflores", category: "CMS", year: "2025", description: "Dashboard interactivo con gráficos en tiempo real y KPIs clave.", tech: ["WordPress", "Elementor Pro", "Crocoblock", "css", "js"], color: "#4DFFB4", link: "https://atriamiraflores.pe/" },
  { id: 3, title: "Inmgenio - Inmobiliaria", category: "CMS", year: "2025", description: "Plataforma inmobiliaria integral con buscador avanzado, gestión de propiedades y panel administrativo para agentes.", tech: ["WordPress", "Elementor Pro", "Crocoblock", "css", "js"], color: "#ffffff", link: "https://www.inmgenio.pe/" },
  { id: 4, title: "Vinatea y Toyama", category: "CMS", year: "2024", description: "Ecosistema de consultoría legal y laboral con gestión de procesos, soluciones educativas y panel de servicios estratégicos.", tech: ["WordPress", "Elementor Pro", "Crocoblock", "css", "js", "Polyglan"], color: "#e63326", link: "https://www.vinateatoyama.com/" },
  { id: 5, title: "Landing Inmobiliaria", category: "CMS", year: "2024", description: "Landing inmobiliaria con catálogo de lanzamientos, reserva de unidades y panel de amenidades.", tech: ["WordPress", "Elementor Pro", "Crocoblock", "css", "js"], color: "#ffc72c", link: "https://www.vibrant.com.pe/" },
  { id: 6, title: "Agencia Estratégica", category: "CMS", year: "2025", description: "Plataforma creativa con servicios de branding, desarrollo web y panel de posicionamiento de marca", tech: ["WordPress", "Elementor Pro", "Crocoblock", "css", "js", "php"], color: "#A1CDE6", link: "https://www.innamorati.ch/" },
];

function ls(key: string, fallback: any) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: any) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function getPassword() { return ls("portfolio_password", DEFAULT_PASSWORD); }

export default function App() {
  const [view, setView] = useState("loading");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pw, setPw] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [links, setLinks] = useState<any[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [hovered, setHovered] = useState<number | null>(null);
  const [selectedCat, setSelectedCat] = useState("All");
  const [adminTab, setAdminTab] = useState("links");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { init(); }, []);

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      try {
        const found = await findLink(token);
        if (found && found.active) { setFilter(found.category || "All"); setView("portfolio"); }
        else setView("denied");
      } catch { setView("denied"); }
      return;
    }
    const savedSession = ls("portfolio_session", false);
    if (savedSession) { setIsAdmin(true); await loadLinks(); setView("admin"); }
    else setView("login");
  }

  async function loadLinks() {
    setLoadingLinks(true);
    try { const data = await getLinks(); setLinks(data); }
    catch (e: any) { setError("Error conectando con la base de datos: " + e.message); }
    finally { setLoadingLinks(false); }
  }

  function tryLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pw === getPassword()) {
      setIsAdmin(true); lsSet("portfolio_session", true); loadLinks(); setView("admin"); setLoginError(false); setPw("");
    } else {
      setLoginError(true); setPw(""); setTimeout(() => setLoginError(false), 2000);
    }
  }

  function logout() {
    setIsAdmin(false); lsSet("portfolio_session", false);
    window.history.pushState({}, "", window.location.pathname); setView("login"); setPw("");
  }

  async function genLink() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const token = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const catParam = selectedCat !== "All" ? `&cat=${encodeURIComponent(selectedCat)}` : "";
    const url = `${window.location.origin}${window.location.pathname}?token=${token}${catParam}`;
    try { await insertLink({ token, url, category: selectedCat, active: true }); await loadLinks(); setNewLink(url); setCopied(null); }
    catch (e: any) { setError("Error generando link: " + e.message); }
  }

  async function toggleLinkActive(token: string, current: boolean) {
    try { await updateLink(token, { active: !current }); setLinks(prev => prev.map(l => l.token === token ? { ...l, active: !current } : l)); }
    catch (e: any) { setError("Error actualizando link: " + e.message); }
  }

  async function removeLinkItem(token: string) {
    try { await deleteLink(token); setLinks(prev => prev.filter(l => l.token !== token)); }
    catch (e: any) { setError("Error borrando link: " + e.message); }
  }

  async function changeLinkCategory(token: string, newCat: string) {
    const catParam = newCat !== "All" ? `&cat=${encodeURIComponent(newCat)}` : "";
    const newUrl = `${window.location.origin}${window.location.pathname}?token=${token}${catParam}`;
    try { await updateLink(token, { category: newCat, url: newUrl }); setLinks(prev => prev.map(l => l.token === token ? { ...l, category: newCat, url: newUrl } : l)); }
    catch (e: any) { setError("Error cambiando categoría: " + e.message); }
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(url); setTimeout(() => setCopied(null), 2000);
  }

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (currentPw !== getPassword()) { setPwMsg({ type: "error", text: "La contraseña actual es incorrecta" }); return; }
    if (newPw.length < 6) { setPwMsg({ type: "error", text: "Mínimo 6 caracteres" }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: "error", text: "Las contraseñas no coinciden" }); return; }
    lsSet("portfolio_password", newPw); setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwMsg({ type: "ok", text: "✓ Contraseña actualizada" }); setTimeout(() => setPwMsg(null), 3000);
  }

  function goToPortfolio() { window.history.pushState({}, "", window.location.pathname); setFilter("All"); setView("portfolio"); }
  function goToAdmin() { window.history.pushState({}, "", window.location.pathname); setView("admin"); }

  const shown = filter === "All" ? PROJECTS : PROJECTS.filter(p => p.category === filter);

  const css = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    select { appearance: none; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #080808; }
    ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
  `;

  if (view === "loading") return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{css}</style>
      <div style={{ width: 28, height: 28, border: "2px solid #222", borderTopColor: "#4DFFB4", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  if (view === "denied") return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
      <style>{css}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: "#fff", fontSize: 20, marginBottom: 8 }}>Link inválido o revocado</h2>
        <p style={{ color: "#555", fontSize: 13 }}>Este link ya no tiene acceso al portfolio.</p>
      </div>
    </div>
  );

  if (view === "login") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif" }}>
      <style>{css}</style>
      <div style={{ width: 380, padding: "48px 44px", background: "#111", border: "1px solid #1e1e1e", borderRadius: 8, animation: "fadeUp 0.4s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4DFFB4" }} />
          <span style={{ fontSize: 10, letterSpacing: 3, color: "#cccccc", fontFamily: "monospace" }}>ACCESO PRIVADO</span>
        </div>
        <h1 style={{ fontSize: 44, fontWeight: 400, color: "#fff", marginBottom: 6, letterSpacing: -1 }}>Portfolio</h1>
        <p style={{ fontSize: 13, color: "#cccccc", marginBottom: 32, fontFamily: "monospace" }}>Panel de administración</p>
        <form onSubmit={tryLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Contraseña" autoFocus
            style={{ background: "#1a1a1a", border: `1px solid ${loginError ? "#FF4D4D" : "#2a2a2a"}`, borderRadius: 4, padding: "14px 16px", color: "#fff", fontSize: 15, fontFamily: "monospace", outline: "none", animation: loginError ? "shake 0.3s ease" : "none" }} />
          {loginError && <p style={{ color: "#FF4D4D", fontSize: 12, fontFamily: "monospace" }}>✗ Contraseña incorrecta</p>}
          <button type="submit" style={{ background: "#fff", color: "#000", border: "none", borderRadius: 4, padding: "14px", fontSize: 12, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "monospace", marginTop: 4 }}>ENTRAR →</button>
        </form>
      </div>
    </div>
  );

  if (view === "admin") return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "monospace", color: "#fff" }}>
      <style>{css}</style>
      <div style={{ width: 220, background: "#0e0e0e", borderRight: "1px solid #1a1a1a", padding: "28px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 20, marginBottom: 12, borderBottom: "1px solid #1a1a1a" }}>
          <div style={{ width: 34, height: 34, background: "linear-gradient(135deg,#4DFFB4,#4DC8FF)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#000" }}>PF</div>
          <span style={{ fontSize: 12, color: "#cccccc" }}>Admin Panel</span>
        </div>
        {[["🔗  Links", "links"], ["⚙️  Configuración", "settings"]].map(([label, tab]) => (
          <button key={tab} onClick={() => setAdminTab(tab)}
            style={{ background: adminTab === tab ? "#1a1a1a" : "transparent", border: "none", color: adminTab === tab ? "#fff" : "#555", textAlign: "left", padding: "10px 14px", cursor: "pointer", fontSize: 12, borderRadius: 4 }}>
            {label}
          </button>
        ))}
        <button onClick={goToPortfolio} style={{ background: "#1a1a1a", border: "none", color: "#aaa", textAlign: "left", padding: "10px 14px", cursor: "pointer", fontSize: 12, borderRadius: 4, marginTop: 8 }}>👁  Ver Portfolio</button>
        <button onClick={logout} style={{ background: "transparent", border: "none", color: "#444", textAlign: "left", padding: "10px 14px", cursor: "pointer", fontSize: 12, borderRadius: 4, marginTop: "auto" }}>← Cerrar sesión</button>
      </div>

      <div style={{ flex: 1, padding: "40px 48px", overflowY: "auto" }}>
        {error && (
          <div style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: 6, padding: "12px 16px", marginBottom: 20, color: "#FF4D4D", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: "transparent", border: "none", color: "#FF4D4D", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}

        {adminTab === "links" && <>
          <h2 style={{ fontSize: 26, fontWeight: 400, fontFamily: "Georgia,serif", marginBottom: 32 }}>Links de Acceso</h2>
          <div style={{ background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: 8, padding: "24px", marginBottom: 24 }}>
            <p style={{ fontSize: 10, color: "#cccccc", letterSpacing: 2, marginBottom: 16 }}>GENERAR NUEVO LINK</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 10, color: "#cccccc", marginBottom: 8 }}>Categoría inicial:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setSelectedCat(c)}
                      style={{ background: selectedCat === c ? "#4DFFB4" : "#1a1a1a", color: selectedCat === c ? "#000" : "#666", border: `1px solid ${selectedCat === c ? "#4DFFB4" : "#2a2a2a"}`, padding: "5px 12px", fontSize: 11, cursor: "pointer", borderRadius: 20, transition: "all 0.15s" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={genLink} style={{ background: "#4DFFB4", color: "#000", border: "none", padding: "12px 24px", fontSize: 12, fontWeight: 800, cursor: "pointer", borderRadius: 4, letterSpacing: 1, whiteSpace: "nowrap" }}>+ GENERAR LINK</button>
            </div>
          </div>

          {newLink && (
            <div style={{ background: "rgba(77,255,180,0.05)", border: "1px solid rgba(77,255,180,0.2)", borderRadius: 6, padding: "18px 22px", marginBottom: 24 }}>
              <p style={{ fontSize: 10, color: "#4DFFB4", letterSpacing: 2, marginBottom: 10 }}>✨ LINK GENERADO · Categoría: <strong>{selectedCat}</strong></p>
              <div style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(0,0,0,0.3)", borderRadius: 3, padding: "10px 14px" }}>
                <code style={{ flex: 1, fontSize: 11, color: "#aaa", wordBreak: "break-all" }}>{newLink}</code>
                <button onClick={() => copy(newLink)} style={{ background: "#4DFFB4", color: "#000", border: "none", padding: "8px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer", borderRadius: 3, whiteSpace: "nowrap" }}>
                  {copied === newLink ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
            {([["Total", links.length, "#eee"], ["Activos", links.filter(l => l.active).length, "#4DFFB4"], ["Inactivos", links.filter(l => !l.active).length, "#FF4D4D"]] as [string, number, string][]).map(([label, n, color]) => (
              <div key={label} style={{ flex: 1, background: "#111", border: "1px solid #1e1e1e", borderRadius: 6, padding: "18px", textAlign: "center" }}>
                <div style={{ fontSize: 32, fontWeight: 300, color, fontFamily: "Georgia,serif" }}>{n}</div>
                <div style={{ fontSize: 10, color: "#cccccc", letterSpacing: 1, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#0e0e0e", border: "1px solid #1a1a1a", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 80px 80px 230px", padding: "10px 18px", background: "#111", fontSize: 9, color: "#cccccc", letterSpacing: 2, borderBottom: "1px solid #1a1a1a" }}>
              <span>TOKEN</span><span>CATEGORÍA</span><span>FECHA</span><span>ESTADO</span><span>ACCIONES</span>
            </div>
            {loadingLinks && <div style={{ padding: "36px", textAlign: "center", color: "#444", fontSize: 13 }}>Cargando...</div>}
            {!loadingLinks && links.length === 0 && <div style={{ padding: "36px", textAlign: "center", color: "#cccccc", fontSize: 13 }}>Aún no hay links — genera el primero ↑</div>}
            {!loadingLinks && links.map((l: any) => (
              <div key={l.token} style={{ display: "grid", gridTemplateColumns: "1fr 150px 80px 80px 230px", padding: "13px 18px", borderBottom: "1px solid #141414", alignItems: "center" }}>
                <code style={{ fontSize: 11, color: "#555" }}>···{l.token.slice(-10)}</code>
                <select value={l.category || "All"} onChange={e => changeLinkCategory(l.token, e.target.value)}
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#4DFFB4", padding: "4px 8px", fontSize: 10, cursor: "pointer", borderRadius: 3, outline: "none", fontFamily: "monospace" }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span style={{ fontSize: 11, color: "#444" }}>{l.created_at ? new Date(l.created_at).toLocaleDateString("es-ES") : "-"}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, width: "fit-content", background: l.active ? "rgba(77,255,180,0.1)" : "rgba(255,77,77,0.1)", color: l.active ? "#4DFFB4" : "#FF4D4D" }}>
                  {l.active ? "Activo" : "Inactivo"}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => copy(l.url)} style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#666", padding: "4px 8px", fontSize: 10, cursor: "pointer", borderRadius: 3 }}>
                    {copied === l.url ? "✓" : "Copiar"}
                  </button>
                  <button onClick={() => toggleLinkActive(l.token, l.active)}
                    style={{ background: "transparent", border: `1px solid ${l.active ? "rgba(255,77,77,0.3)" : "rgba(77,255,180,0.3)"}`, color: l.active ? "#FF4D4D" : "#4DFFB4", padding: "4px 8px", fontSize: 10, cursor: "pointer", borderRadius: 3 }}>
                    {l.active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => removeLinkItem(l.token)} style={{ background: "transparent", border: "1px solid rgba(255,77,77,0.2)", color: "#663333", padding: "4px 8px", fontSize: 12, cursor: "pointer", borderRadius: 3 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </>}

        {adminTab === "settings" && <>
          <h2 style={{ fontSize: 26, fontWeight: 400, fontFamily: "Georgia,serif", marginBottom: 32 }}>Configuración</h2>
          <div style={{ maxWidth: 440, background: "#0e0e0e", border: "1px solid #1e1e1e", borderRadius: 8, padding: "28px" }}>
            <p style={{ fontSize: 10, color: "#cccccc", letterSpacing: 2, marginBottom: 24 }}>CAMBIAR CONTRASEÑA</p>
            <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {([[currentPw, setCurrentPw, "Contraseña actual"], [newPw, setNewPw, "Nueva contraseña"], [confirmPw, setConfirmPw, "Confirmar nueva contraseña"]] as [string, React.Dispatch<React.SetStateAction<string>>, string][]).map(([val, setter, label]) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: "#cccccc", marginBottom: 6 }}>{label}</p>
                  <input type="password" value={val} onChange={e => setter(e.target.value)} placeholder="••••••••"
                    style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4, padding: "12px 14px", color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none" }} />
                </div>
              ))}
              {pwMsg && <p style={{ fontSize: 12, color: pwMsg.type === "ok" ? "#4DFFB4" : "#FF4D4D", fontFamily: "monospace" }}>{pwMsg.text}</p>}
              <button type="submit" style={{ background: "#fff", color: "#000", border: "none", borderRadius: 4, padding: "12px", fontSize: 12, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "monospace" }}>GUARDAR CONTRASEÑA</button>
            </form>
          </div>
        </>}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#070707", color: "#fff", fontFamily: "Georgia,serif" }}>
      <style>{css}</style>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid #141414", position: "sticky", top: 0, background: "rgba(7,7,7,0.97)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, background: "linear-gradient(135deg,#4DFFB4,#4DC8FF)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#000", fontFamily: "monospace" }}>JD</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Jesus Dev</div>
            <div style={{ fontSize: 10, color: "#919191", fontFamily: "monospace" }}>Full Developer</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <nav style={{ display: "flex", gap: 4 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFilter(c)}
                style={{ background: filter === c ? "#1a1a1a" : "transparent", border: `1px solid ${filter === c ? "#333" : "transparent"}`, color: filter === c ? "#fff" : "#cccccc", padding: "5px 12px", fontSize: 11, cursor: "pointer", borderRadius: 20, fontFamily: "monospace", transition: "all 0.15s" }}>
                {c}
              </button>
            ))}
          </nav>
          {isAdmin && (
            <button onClick={goToAdmin} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#4DFFB4", padding: "6px 14px", fontSize: 11, cursor: "pointer", borderRadius: 4, fontFamily: "monospace", whiteSpace: "nowrap" }}>← Admin</button>
          )}
        </div>
      </header>

      <section style={{ padding: "72px 48px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4DFFB4", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 9, letterSpacing: 3, color: "#4DFFB4", fontFamily: "monospace" }}>DISPONIBLE PARA PROYECTOS</span>
        </div>
        <h1 style={{ fontSize: "clamp(44px,8vw,88px)", fontWeight: 400, lineHeight: 1.0, letterSpacing: -2, marginBottom: 16 }}>
          Construyo<br /><em style={{ color: "#646464", fontStyle: "italic" }}>experiencias</em><br />digitales
        </h1>
        <p style={{ fontSize: 13, color: "#cccccc", fontFamily: "monospace" }}>
          {shown.length} proyecto{shown.length !== 1 ? "s" : ""}{filter !== "All" && <> · <span style={{ color: "#4DFFB4" }}>{filter}</span></>}
        </p>
      </section>

      <main style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 2, padding: "0 2px 2px" }}>
        {shown.map((p, i) => (
          <div key={p.id}
            style={{ background: "#0d0d0d", padding: "28px", position: "relative", overflow: "hidden", transition: "transform 0.25s,box-shadow 0.25s", transform: hovered === p.id ? "translateY(-4px)" : "translateY(0)", boxShadow: hovered === p.id ? `0 20px 50px ${p.color}20` : "none", animation: "fadeUp 0.4s ease backwards", animationDelay: `${i * 0.06}s` }}
            onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: p.color }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontFamily: "monospace" }}>
              <span style={{ fontSize: 9, letterSpacing: 2, color: "#cccccc" }}>{p.category.toUpperCase()}</span>
              <span style={{ fontSize: 9, color: "#cccccc" }}>{p.year}</span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 400, margin: "0 0 8px", letterSpacing: -0.3 }}>{p.title}</h3>
            <p style={{ fontSize: 12, color: "#646464", margin: "0 0 18px", lineHeight: 1.7, fontFamily: "monospace" }}>{p.description}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 20 }}>
              {p.tech.map(t => <span key={t} style={{ fontSize: 9, border: `1px solid ${p.color}35`, color: p.color, padding: "2px 8px", borderRadius: 20, fontFamily: "monospace" }}>{t}</span>)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <a href={p.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: "7px 14px", borderRadius: 3, fontFamily: "monospace", background: `${p.color}12`, color: p.color, textDecoration: "none" }}>Ver proyecto →</a>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
            </div>
          </div>
        ))}
      </main>

      <footer style={{ padding: "28px 48px", borderTop: "1px solid #141414", display: "flex", justifyContent: "space-between", fontFamily: "monospace" }}>
        <span style={{ fontSize: 11, color: "#646464" }}>© 2026 Jesus Dev</span>
        <a href="mailto:albejes12@gmail.com" style={{ fontSize: 11, color: "#4DFFB4", textDecoration: "none" }}>albejes12@gmail.com</a>
      </footer>
    </div>
  );
}