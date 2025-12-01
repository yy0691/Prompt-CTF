
# 🚩 Prompt CTF // Protocol Omega

> **Gamified Prompt Engineering Learning Platform**
>
> Master the art of communicating with Large Language Models through Capture-The-Flag style challenges.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-React_Typescript_Tailwind-3178C6.svg)
![AI](https://img.shields.io/badge/AI-Gemini_Powered-8E44AD.svg)

## 📖 Introduction

**Prompt CTF** is an interactive, open-source educational platform designed to teach Prompt Engineering concepts—from basic persona design to advanced agentic patterns and security injection defense.

Unlike traditional text tutorials, Prompt CTF uses an **LLM-as-a-Judge** system. When you submit a prompt, a secondary AI evaluates your output against hidden win criteria, strictly checking logic, formatting, and semantic goals to award you the "Flag".

## ✨ Key Features

- **🎮 CTF Game Loop**: 6 Chapters ranging from "Foundations" to "Hardcore Labs".
- **🤖 Real-time AI Judging**: Instant feedback provided by Google Gemini models, evaluating not just keywords but semantic intent.
- **🌍 Internationalization**: Full support for English and Chinese (Simplified) interfaces and curriculum.
- **⚡ Vibe Coding UI**: Immersive, dark-mode "Hacker Terminal" aesthetic built with Tailwind CSS.
- **🏆 Leaderboard & Stats**: Track your progress, capture flags, and compete for the top rank (powered by Supabase).
- **🛡️ Security Challenges**: Learn Red Teaming by attempting prompt injection attacks in a controlled sandbox.
- **🛠️ Advanced Patterns**: Learn industry-standard techniques like *Chain of Density*, *Cognitive Verifier*, and *ReAct*.

## 🏗️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **AI Engine**: Google GenAI SDK (Gemini 2.5 Flash & Pro)
- **Backend / Auth**: Supabase (PostgreSQL, Auth, Realtime)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Google Gemini API Key
- A Supabase Project (Free Tier works great)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/prompt-ctf.git
   cd prompt-ctf
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   # Google Gemini API Key
   API_KEY=your_gemini_api_key_here

   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   ```

4. **Run Locally**
   ```bash
   npm start
   ```

## 📚 Curriculum Overview

The platform is divided into 6 distinct chapters:

1.  **Foundations**: Persona, Constraints, formatting (JSON/Markdown).
2.  **Core Skills**: CoT (Chain of Thought), Few-Shot Prompting, Fallacy detection.
3.  **Advanced Patterns**: Template Pattern, Reflection, Meta-Prompting.
4.  **Interaction Design**: Flipped Interaction, Socratic Tutor, Game Master.
5.  **Engineering & Security**: Hallucination Check, PII Redaction, Jailbreak Defense.
6.  **Labs**: Real-world scenarios (Text-to-SQL, Cold Emails, Bug Reports).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
