# AP Research Digital Portfolio

**Project Title:** *Curriculum Learning via Simulation-to-Reality Discrepancy for Budget-Constrained Autonomous Racing*  
**Researcher:** Siddharth Tirumalareddi (Grade 12, AP Research 2026-27)  
**Category:** Robotics and Intelligent Machines (ROBO)  

---

## 🏎️ Overview
This repository contains the showcase website for Siddharth Tirumalareddi's AP Research project. The project explores Automated Curriculum Learning (ACL) for physical F1TENTH autonomous racing under severe hardware, battery, and safety constraints.

The website has six sections:
1. **Home**: bold title plus an animated sim-vs-real lap on the actual F1TENTH Gym training track
2. **01 About** (Personal): bio, skills, coursework, past work, fun facts
3. **02 Process**: research question, hypothesis, ideation, methodology loop, variables, literature, timeline
4. **03 Build** (Product): interactive 3D exploded CAD model, power/data wiring diagram, UART pinout, bill of materials
5. **04 Data** (Product): real PPO baseline results from `APRes_F1TENTH/checkpoints/ppo_baseline/logs`, plus the pending physical-study metrics
6. **05 Perspective**: reflection, inspiration, impact, safety; then contact and references

To add a headshot: save it as `assets/headshot.jpg`, uncomment the `<img>` in the About section, and add `has-photo` to the `.portrait` div.

---

## 🚀 How to Preview Locally

No heavy node dependencies or build steps are required. You can preview the website immediately:

### Option A: Python Built-in Server
```bash
cd APRes_Digital_Portfolio
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in any web browser.

### Option B: VS Code Live Server
Right-click on `index.html` and choose **"Open with Live Server"**.

---

## 🌐 Deploying to GitHub Pages

1. Initialize git in this folder:
   ```bash
   cd APRes_Digital_Portfolio
   git init
   git add .
   git commit -m "Initial commit of AP Research Portfolio"
   ```
2. Create a repository on GitHub (e.g. `ap-research-portfolio`) and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<username>/ap-research-portfolio.git
   git push -u origin main
   ```
3. In your GitHub repo settings, navigate to **Settings > Pages** and set source to `main` branch root `/`. Your portfolio will be live at `https://<username>.github.io/ap-research-portfolio/`.

---

## 🤖 AI Context & Multi-Root Workspace

This portfolio is configured inside `APRes_F1TENTH.code-workspace` alongside the research code:
```json
{
  "folders": [
    { "name": "F1TENTH Research Code", "path": "." },
    { "name": "Digital Portfolio", "path": "../APRes_Digital_Portfolio" }
  ]
}
```
Whenever you update code, run new simulation epochs, or log physical test runs in `APRes_F1TENTH`, you can simply ask the AI agent in this workspace to sync the latest results, plots, or pinouts directly to the portfolio!
