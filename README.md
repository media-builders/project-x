# 🧠 AI-Powered Real Estate CRM Automation Platform

An intelligent CRM automation web app for Real Estate agents built with **Next.js**, **Supabase**, and **Drizzle ORM**, integrating **ElevenLabs conversational AI agents**, **Twilio**, and **Follow Up Boss** CRM to streamline lead management and client communication.

---

## 🚀 Features (MVP - Iteration 1)

This version represents the **first iteration (MVP)** of the platform that focuses on building the **core functionality** that connects CRM, AI voice automation, and call routing.

- **CRM Lead Import:**  
  Securely import contacts from the Follow Up Boss CRM using your API key.
- **AI Voice Agents (ElevenLabs):**  
  Automatically create and assign a personalized ElevenLabs conversational AI agent for each user.
- **Twilio Integration:**  
  Automatically generate Twilio subaccounts per user to enable isolated and secure call routing.
- **AI-Powered Outbound Calls:**  
  Make voice calls through your ElevenLabs agent using Twilio by combining real-time AI voice with telephony infrastructure.
- **Lead Management Dashboard:**  
  View, select, and manage leads in an intuitive React-based UI.
- **Secure Authentication & Storage:**  
  Powered by Supabase authentication and Postgres, using Drizzle ORM for database operations.

---

## 🧠 How It Works

1. User signs in via Supabase authentication.  
2. User enters their **CRM API key** in the settings panel.  
3. The app imports leads from **Follow Up Boss** and stores them in **PostgreSQL**.  
4. When the user clicks “**ElevenLabs Agent**”, a personalized AI agent is created via the **ElevenLabs API**.  
5. “**Twilio Setup**” creates a Twilio subaccount to manage the user’s call flow.  
6. The user can select leads and initiate **AI-driven outbound calls** handled by ElevenLabs through Twilio.  

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | Next.js (React, TypeScript) |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **ORM** | Drizzle ORM |
| **AI Voice** | ElevenLabs Conversational AI API |
| **Telephony** | Twilio Voice API |
| **CRM Integration** | Follow Up Boss API |

---

## 🔄 Phased Agile Development Approach

This project adopts a phased agile methodology, where each release builds upon the previous one to deliver incremental functionality and continuous product improvement.

### ✅ **Current Phase (Iteration 1 - MVP)**
- Core integrations with **Follow Up Boss**, **ElevenLabs**, and **Twilio**  
- Lead import and management UI  
- Individual agent setup and Twilio subaccount creation  
- AI-powered outbound call initiation  
- Persistent user settings via Supabase

### 🧭 **Next Phase (Iteration 2 - Upcoming Features)**

The next major iteration will focus on improving user experience, automation, and analytics.
#### 🔹 **1. Onboarding Wizard**
- A guided multi-step onboarding flow that simplifies initial setup.  
- Combines:  
  - Saving the CRM API key  
  - ElevenLabs agent setup  
  - Twilio subaccount configuration  
- Streamlines user activation with visual feedback and automated background processes.

#### 🔹 **2. Batch Calling**
- Enable users to trigger **batch calls** through the ElevenLabs batch endpoint.  
- Supports sequential or parallel outbound calling for selected leads.  
- Adds progress tracking and error handling in the dashboard UI.

#### 🔹 **3. Call History & Transcripts**
- Introduce a **Call History page** to display:  
  - Outbound call logs  
  - Conversation transcripts  
  - Agent notes and summaries  
  - Lead response context and timestamps  
- Data stored in Supabase using Drizzle ORM schema for conversations.

#### 🔹 **4. Enhanced Analytics (Future Extension)**
- Post-call metrics such as success rate, call duration, and sentiment tracking.  
- Dashboard visualizations for team-level insights.

## 🧰 Tools & Integrations

- 🧩 **Supabase** — Authentication, Postgres database hosting  
- 🧠 **ElevenLabs API** — Conversational voice AI generation  
- ☎️ **Twilio API** — Voice call automation  
- 🔗 **Follow Up Boss API** — CRM contact import  
- 🧱 **Drizzle ORM** — Type-safe database schema and migrations  
- ⚡ **Next.js (App Router)** — API endpoints and frontend integration

---

## 🔒 Security & Data Isolation

- Each user has isolated **Twilio subaccounts** and **ElevenLabs agents**.  
- Authentication and session management handled through Supabase.  
- Row-Level Security (RLS) can be configured in Supabase for strict per-user data access.  

---

## 👩‍💻 Development Philosophy

This project follows an **phased agile development model** focused on:
- Rapid prototyping and validation  
- Continuous integration of user feedback  
- Delivering functional increments over perfection  
- Scalable architecture enabling new features with minimal refactoring  

---

## 👤 Author

**Nadeem Imani**
🔗 [LinkedIn](https://www.linkedin.com/in/nadeem-imani)

**Rania Alvi**  
📍 Software Engineer | Full-Stack Development  
🔗 [LinkedIn](https://www.linkedin.com/in/alvirania)  
💻 [GitHub](https://github.com/alvirania)





