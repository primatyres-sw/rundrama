# Project Proposal: RunToUnlock (Web-based AI Drama Treasure Hunt)

## 1. Project Overview
**RunDrama** คือ Mobile-Responsive Web Application ที่เปลี่ยนระยะทางการวิ่ง/เดินของผู้ใช้ให้กลายเป็นการปลดล็อกซีรีส์ AI ดราม่าสั้น (DramaBox Style) ผ่านการเชื่อมต่อกับ **Strava API** เพื่อสร้างประสบการณ์ Gamification / Treasure Hunt 

ผู้ใช้ไม่จำเป็นต้องเปิดเว็บค้างไว้ขณะวิ่ง เพียงแค่ใช้แอป Strava/Garmin/Apple Watch วิ่งตามปกติ เมื่อบันทึกกิจกรรม ระยะทางจะถูกซิงค์มาปลดล็อกเนื้อเรื่องวิดีโอตอนถัดไปบน Web Application อัตโนมัติ

---

## 2. Target User & Core Experience
* **Target User:** คนที่ออกกำลังกายด้วยการวิ่ง/เดินอยู่แล้ว และชอบเสพ Content หรือต้องการแรงจูงใจ (Incentive) ในการวิ่ง
* **Core Flow:**
  1. User เข้าเว็บผ่าน Mobile Browser -> ล็อกอิน/ลงทะเบียน
  2. เชื่อมต่อบัญชีกับ Strava (Connect with Strava)
  3. ดูเป้าหมายระยะทาง (เช่น "วิ่งสะสมครบ 2.0 km เพื่อปลดล็อก Ep.2")
  4. ออกไปวิ่งแล้วกด Save ในแอป Strava
  5. กลับมาที่เว็บเพื่อรับชมวิดีโอตอนที่ปลดล็อก และดู Progress ของขุมทรัพย์ถัดไป

---

## 3. Tech Stack & Architecture

* **Frontend:** Next.js 14+ (App Router), React, Tailwind CSS, Lucide Icons, Framer Motion (สำหรับ UI Animation)
* **Backend & Database:** Supabase (PostgreSQL, Auth, Realtime Database)
* **API Integration:** Strava API v3 (OAuth 2.0 & Webhooks)
* **Video Player & Storage:** Cloudflare Stream หรือ Mux (หรือใช้ Direct Link MP4 Hosting สำหรับ MVP)
* **Deployment:** Vercel

---

## 4. Key Features & Data Model

### Key Features
1. **Strava Integration & OAuth:** ระบบเชื่อมต่อและจัดเก็บ Access Token / Refresh Token ของ Strava
2. **Strava Webhook Handler:** API Route สำหรับรับ Event เมื่อ User บันทึกกิจกรรมการวิ่ง
3. **Treasure Map / Episode Unlocking System:** ระบบคำนวณระยะทางสะสมเทียบกับ Threshold ของแต่ละ Episode
4. **Mobile-First Video Player:** UI การดูวิดีโอสั้นแนวตั้ง (TikTok/DramaBox Style) ล็อกการข้ามแทร็กถ้ายังไม่ Unlocked
5. **User Dashboard & Stats:** แสดงระยะทางรวม (Total Distance), จิ๊กซอว์/เหรียญรางวัลที่สะสมได้

### Database Schema (Supabase)

```sql
-- Users / Profiles Table
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  strava_athlete_id text unique,
  strava_access_token text,
  strava_refresh_token text,
  strava_token_expires_at timestamp,
  total_distance_meters float default 0,
  created_at timestamp default now()
);

-- Series Table
create table series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_image_url text,
  created_at timestamp default now()
);

-- Episodes Table
create table episodes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid references series(id),
  episode_number int not null,
  title text,
  video_url text not null,
  required_distance_meters float not null, -- ระยะทางสะสมที่ต้องใช้ในการปลดล็อก
  created_at timestamp default now()
);

-- User Progress Table
create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  episode_id uuid references episodes(id),
  is_unlocked boolean default false,
  unlocked_at timestamp,
  unique(user_id, episode_id)
);