# ⚛️ Frontend Rules & Architecture (Next.js App Router)

ไฟล์นี้กำหนดมาตรฐานและกฎเกณฑ์ในการเขียนโค้ดสำหรับฝั่ง Frontend ทั้งหมด กรุณาอ่านและปฏิบัติตามอย่างเคร่งครัดทุกครั้งที่สร้างหรือแก้ไขโค้ด

## 1. 🛠️ Tech Stack & Core Libraries
- **Framework:** Next.js (App Router) + React
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui + Lucide Icons
- **State Management:** Zustand (Global) + React Hooks (Local)
- **HTTP Client:** Axios (ตั้งค่า Interceptors ไว้ที่ `src/lib/axios.ts`)
- **Authentication:** JWT (เก็บใน Cookie ผ่าน `js-cookie`)

## 2. 📂 Directory Structure (โครงสร้างโฟลเดอร์)
ให้ยึดโครงสร้างภายใต้โฟลเดอร์ `src/` ดังนี้:
- `src/app/`: จัดการ Routing ทั้งหมด (page.tsx, layout.tsx, loading.tsx)
- `src/components/ui/`: UI Components พื้นฐานที่ได้จาก shadcn/ui
- `src/components/shared/`: Components ที่ใช้ร่วมกันหลายหน้า (เช่น Navbar, Sidebar)
- `src/components/features/`: Components ที่แบ่งตามฟีเจอร์ (เช่น `auth/LoginForm.tsx`)
- `src/lib/`: Utility functions, Axios setup, และ Helpers ต่างๆ
- `src/services/`: API Service Layer (เช่น auth.service.ts, admin.service.ts) เพื่อหลีกเลี่ยงการใช้ Axios ใน Component โดยตรง
- `src/store/`: Zustand stores (เช่น `useAuthStore.ts`)
- `src/types/`: TypeScript Interfaces / Types ที่ใช้งานทั่วโปรเจกต์

## 3. 🖥️ Rendering Pattern (Server vs Client Components)
- **Default is Server Components:** ให้ใช้ Server Components เป็นค่าเริ่มต้นเสมอเพื่อ Performance และ SEO ที่ดี
- **Use `"use client"` wisely:** ใส่ Directive `"use client"` ไว้บรรทัดบนสุดของไฟล์ **เฉพาะเมื่อ** Component นั้นต้องการ:
  1. การจัดการ State (useState, useReducer)
  2. การจัดการ Lifecycle (useEffect)
  3. การรับ Event จากผู้ใช้ (onClick, onChange)
  4. การเรียกใช้ Browser APIs หรือ Zustand
- **Rule of Thumb:** พยายามผลัก `"use client"` ไปไว้ที่ Component ใบไม้ (Leaf Components) ให้มากที่สุด อย่าใส่ที่ระดับ Layout หรือ Page ถ้าไม่จำเป็น

## 4. 🔗 API Fetching & State Management
- **Axios Instance:** ห้ามใช้ `axios.get` หรือ `fetch` โดยตรง ให้ import `api` จาก `src/lib/axios.ts` เสมอ เพื่อให้แน่ใจว่ามีการแนบ JWT Token ไปด้วย
- **Global State:** ใช้ Zustand ในการเก็บ State ที่ต้องแชร์ข้าม Components (เช่น ข้อมูล User ที่ล็อกอินแล้ว) 
- **Error Handling:** จัดการ Error จาก API ด้วย `try...catch` เสมอ และแสดงผล Error ให้ผู้ใช้เห็นผ่าน Toast หรือ Error Message UI ที่เหมาะสม

## 5. 🎨 Styling & UI
- ใช้ **Tailwind CSS** ในการจัดการสไตล์ทั้งหมด ห้ามเขียน CSS แยก (ยกเว้น `globals.css`)
- การเขียน Class: ให้ใช้ Utility-first approach และจัดกลุ่ม class ให้เป็นระเบียบ
- หากต้องสร้าง UI พื้นฐาน (ปุ่ม, ฟอร์ม, Dialog) ให้เช็คก่อนว่ามีใน **shadcn/ui** หรือไม่ ถ้ามีให้ใช้ของ shadcn ก่อนสร้างใหม่เองเสมอ

## 6. 🔒 TypeScript Rules (Strictness)
- ห้ามใช้ `any` เด็ดขาด (ใช้ `unknown` แทนถ้าจำเป็นจริงๆ)
- ทุก Component หรือ Function ต้องมีการประกาศ Type ของ Props และ Return Value อย่างชัดเจน
- แนะนำให้แยก Interfaces/Types ออกมาไว้ด้านบนของไฟล์ หรือแยกโฟลเดอร์ `src/types/` หากใช้ร่วมกันหลายไฟล์

## 7. 🔑 Authentication Flow (Frontend)
- ตรวจสอบ Token: หากผู้ใช้ยังไม่ล็อกอิน ให้ Redirect ไปที่ `/login`
- การเข้าถึงหน้า Private: ใช้ Middleware ของ Next.js (`middleware.ts`) ในการเช็ค Cookie `access_token` เพื่อป้องกันการเข้าถึงหน้า Dashboard โดยไม่ได้รับอนุญาต
- **2FA Support:** รองรับการเปลี่ยนหน้าจอไปแสดงฟอร์มกรอก OTP หาก API ตอบกลับมาว่า `{ requires2FA: true }`

## 8. ⚙️ Environment & Tooling (Node Version Lock)
- **Node.js Version:** บังคับใช้เวอร์ชัน `24.15.0` เท่านั้น
- **Implementation Requirement:** 1. ต้องสร้างไฟล์ `.nvmrc` ไว้ที่ Root directory และระบุค่าเป็น `24.15.0`
  2. ต้องเพิ่มคีย์ `engines` ในไฟล์ `package.json` ดังนี้:
     ```json
     "engines": {
       "node": "24.15.0"
     }
     ```
- **Package Manager:** ให้ใช้ `npm` เป็นหลักในการจัดการ Dependencies

## 9. 🏛️ API & Service Layer Design Pattern (สถาปัตยกรรมบริการเชื่อมต่อข้อมูล)
- **Service Isolation Principle:** ห้ามเรียกใช้ `api` (Axios instance) หรือสั่งยิง HTTP Request (`axios.get`, `axios.post`, `fetch`) ภายใน React Pages หรือ UI Components โดยตรงเด็ดขาด
- **Centralized Service Logic:** โค้ดการเรียกใช้ API และจัดการ Payload จาก Backend ทั้งหมดจะต้องย้ายไปเขียนรวบรวมไว้ที่โฟลเดอร์ `src/services/` แยกไฟล์ตาม Features (เช่น `auth.service.ts`, `calendar.service.ts`, `admin.service.ts`)
- **Clean Component Rule:** React Components หน้าบ้านจะมีหน้าที่เพียงแค่จัดการการแสดงผล UI, การกรอกฟอร์ม, จัดการ UI State และส่งต่อข้อมูลไปยัง API Service เท่านั้น เพื่อให้โค้ดส่วนหน้าแสดงผลมีความกระชับ อ่านง่าย และทำการทดสอบ Unit Test ได้ง่ายขึ้น