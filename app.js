/* =========================
   Feen Full (Static + Supabase)
   1) حط SUPABASE_URL و SUPABASE_ANON_KEY تحت
   2) فعل Providers من Supabase (Google/Email)
   3) ارفع على Vercel/Netlify (HTTPS) عشان Location يشتغل
========================= */

/* ====== Supabase Config (EDIT ME) ====== */
const SUPABASE_URL = "https://eiggrwybypwblwhlzoes.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpZ2dyd3lieXB3Ymx3aGx6b2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzA4NDYsImV4cCI6MjA4Njc0Njg0Nn0.MJz1roXHeW6N1jsk1S4QHZdMmZSepq1iE05J5sYdwSU";

/* ====== Init Supabase ====== */
let supabase = null;
function canInitSupabase(){
  return SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;
}
function initSupabase(){
  if (!window.supabase){
    setStatus("Supabase library مش متحملة");
    return;
  }
  if (!canInitSupabase()){
    setStatus("حط مفاتيح Supabase في app.js");
    return;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/* ========= Theme ========= */
const themeButtons = Array.from(document.querySelectorAll("[data-theme]"));
function setTheme(t){
  document.body.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
  themeButtons.forEach(b => b.classList.toggle("active", b.dataset.theme === t));
}
setTheme(localStorage.getItem("theme") || "light");
themeButtons.forEach(b => b.addEventListener("click", () => setTheme(b.dataset.theme)));

/* ========= UI refs ========= */
const statusEl = document.getElementById("status");
const coordsEl = document.getElementById("coords");
const accEl = document.getElementById("acc");
const lastEl = document.getElementById("last");
const permEl = document.getElementById("perm");
const gpsChip = document.getElementById("gpsChip");

const btnLocate = document.getElementById("btnLocate");
const btnLive = document.getElementById("btnLive");
const btnStopLive = document.getElementById("btnStopLive");
const btnCopy = document.getElementById("btnCopyCoords");

const authLocked = document.getElementById("authLocked");
const authOpen = document.getElementById("authOpen");
const userEmailEl = document.getElementById("userEmail");
const sessionStatusEl = document.getElementById("sessionStatus");

const btnGoogle = document.getElementById("btnGoogle");
const btnSignUp = document.getElementById("btnSignUp");
const btnSignIn = document.getElementById("btnSignIn");
const btnLogout = document.getElementById("btnLogout");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");

/* ========= Helpers ========= */
function nowStr(){
  return new Date().toLocaleString("ar-EG");
}
function setStatus(msg){
  statusEl.textContent = msg;
}
function setPermission(msg){
  permEl.textContent = msg;
}
function showLoggedOut(){
  authLocked.classList.remove("hidden");
  authOpen.classList.add("hidden");
  userEmailEl.textContent = "—";
  sessionStatusEl.textContent = "Logged out";
}
function showLoggedIn(email){
  authLocked.classList.add("hidden");
  authOpen.classList.remove("hidden");
  userEmailEl.textContent = email || "—";
  sessionStatusEl.textContent = "Logged in";
}

/* ========= Permission (geo) ========= */
async function checkPermission(){
  if (!navigator.permissions) {
    setPermission("غير مدعوم");
    return;
  }
  try{
    const p = await navigator.permissions.query({ name: "geolocation" });
    setPermission(p.state);
    p.onchange = () => setPermission(p.state);
  }catch{
    setPermission("غير متاح");
  }
}
checkPermission();

/* ========= Map (Leaflet) ========= */
let watchId = null;
let lastCoords = null;

const map = L.map("map", { zoomControl: true }).setView([31.2001, 29.9187], 12); // Alexandria default
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

let userMarker = null;
let accuracyCircle = null;

function updateMap(lat, lng, accuracy){
  lastCoords = { lat, lng, accuracy };

  coordsEl.textContent = `Lat: ${lat.toFixed(6)}  |  Lng: ${lng.toFixed(6)}`;
  accEl.textContent = accuracy ? `${Math.round(accuracy)} متر` : "—";
  lastEl.textContent = nowStr();
  btnCopy.disabled = false;

  if (!userMarker){
    userMarker = L.marker([lat, lng]).addTo(map).bindPopup("موقعك الحالي").openPopup();
  } else {
    userMarker.setLatLng([lat, lng]);
  }

  if (accuracy){
    if (!accuracyCircle){
      accuracyCircle = L.circle([lat, lng], { radius: accuracy }).addTo(map);
    } else {
      accuracyCircle.setLatLng([lat, lng]);
      accuracyCircle.setRadius(accuracy);
    }
  }

  map.setView([lat, lng], Math.max(map.getZoom(), 16));
}

function geoError(err){
  const msg = err?.message || "تعذر تحديد الموقع";
  setStatus("خطأ: " + msg);
  gpsChip.textContent = "GPS: OFF";
}

function ensureGeoAvailable(){
  if (!navigator.geolocation){
    setStatus("المتصفح لا يدعم تحديد الموقع");
    return false;
  }
  return true;
}

btnLocate.addEventListener("click", () => {
  if (!ensureGeoAvailable()) return;
  setStatus("جاري تحديد موقعك...");
  gpsChip.textContent = "GPS: ON";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setStatus("تم تحديد موقعك");
      updateMap(latitude, longitude, accuracy);
      gpsChip.textContent = "GPS: ON";
    },
    geoError,
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
});

btnLive.addEventListener("click", () => {
  if (!ensureGeoAvailable()) return;
  if (watchId !== null) return;

  setStatus("تشغيل لايف لوكيشن...");
  gpsChip.textContent = "GPS: LIVE";

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setStatus("لايف لوكيشن شغال");
      updateMap(latitude, longitude, accuracy);
      btnStopLive.disabled = false;
    },
    (err) => {
      geoError(err);
      stopLive();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});

function stopLive(){
  if (watchId !== null){
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  btnStopLive.disabled = true;
  gpsChip.textContent = "GPS: OFF";
  setStatus("تم إيقاف اللايف");
}
btnStopLive.addEventListener("click", stopLive);

btnCopy.addEventListener("click", async () => {
  if (!lastCoords) return;
  const text = `${lastCoords.lat},${lastCoords.lng}`;
  try{
    await navigator.clipboard.writeText(text);
    setStatus("تم نسخ الإحداثيات");
  }catch{
    setStatus("النسخ محتاج HTTPS غالبًا");
  }
});

/* ========= WhatsApp ========= */
const WA_PHONE = "201278214028"; // +20 Egypt
document.getElementById("btnWhatsApp").addEventListener("click", () => {
  const name = (document.getElementById("name").value || "").trim();
  const msg = (document.getElementById("msg").value || "").trim();

  const coords = lastCoords ? `\n\nموقعي: https://maps.google.com/?q=${lastCoords.lat},${lastCoords.lng}` : "";
  const finalMsg = `مرحبًا، أنا ${name || "—"}.\n${msg || "عايز أستفسر عن حاجة."}${coords}`;

  const url = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(finalMsg)}`;
  window.open(url, "_blank", "noopener,noreferrer");
});

/* ========= Auth (Supabase) ========= */
initSupabase();

async function refreshAuthUI(){
  if (!supabase){
    showLoggedOut();
    return;
  }
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  if (session?.user){
    showLoggedIn(session.user.email);
  } else {
    showLoggedOut();
  }
}

btnGoogle.addEventListener("click", async () => {
  if (!supabase){ setStatus("حط مفاتيح Supabase الأول"); return; }
  setStatus("جاري فتح Google...");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }
  });
  if (error) setStatus("خطأ: " + error.message);
});

btnSignUp.addEventListener("click", async () => {
  if (!supabase){ setStatus("حط مفاتيح Supabase الأول"); return; }
  const email = (emailEl.value || "").trim();
  const password = (passEl.value || "").trim();
  if (!email || !password){ setStatus("اكتب الإيميل والباسورد"); return; }

  setStatus("جاري إنشاء الحساب...");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return setStatus("خطأ: " + error.message);
  setStatus("اتعمل حساب ✅ لو طلب تأكيد إيميل هتلاقيه في البريد");
  await refreshAuthUI();
});

btnSignIn.addEventListener("click", async () => {
  if (!supabase){ setStatus("حط مفاتيح Supabase الأول"); return; }
  const email = (emailEl.value || "").trim();
  const password = (passEl.value || "").trim();
  if (!email || !password){ setStatus("اكتب الإيميل والباسورد"); return; }

  setStatus("جاري تسجيل الدخول...");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return setStatus("خطأ: " + error.message);
  setStatus("تم تسجيل الدخول ✅");
  await refreshAuthUI();
});

btnLogout.addEventListener("click", async () => {
  if (!supabase) return;
  setStatus("جاري تسجيل الخروج...");
  await supabase.auth.signOut();
  setStatus("تم تسجيل الخروج");
  await refreshAuthUI();
});

/* Listen for auth changes */
if (supabase){
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) showLoggedIn(session.user.email);
    else showLoggedOut();
  });
}
refreshAuthUI();
