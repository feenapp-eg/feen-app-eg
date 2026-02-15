# Feen — Full (Static + Supabase)

## 1) حط مفاتيح Supabase
افتح `app.js` وبدّل:
- `PASTE_SUPABASE_URL_HERE`
- `PASTE_SUPABASE_ANON_KEY_HERE`

## 2) ظبط Supabase Auth
من Supabase:
- Authentication → Providers: فعّل Email و Google
- Authentication → URL Configuration:
  - Site URL = رابط Vercel بتاعك
  - Redirect URLs: ضيف نفس رابط Vercel

## 3) Deploy على Vercel
- ارفع فولدر المشروع زي ما هو (index.html / styles.css / app.js / assets)
- لازم HTTPS عشان Location يشتغل

## Features
- 3 Themes (Light/Dark/Midnight)
- Map (Leaflet + OpenStreetMap)
- One-time location + Live location
- Copy coordinates
- WhatsApp contact (01278214028)
- Supabase Auth: Google OAuth + Email/Password
