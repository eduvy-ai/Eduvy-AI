# 💡 Ideas Research Vault

> **For internal use only.** Drop your raw idea in a new `.md` file here.  
> Copilot will read it, search the internet, map out competitors, and write a full competitive beat-down strategy back into this folder.

---

## How to Use

1. **Copy `_template.md`** → rename it to your idea (e.g., `ai-doubt-solver.md`)
2. **Fill in the "Your Idea" section** — just a few lines is enough
3. **Ask Copilot:**
   > "Research my idea in `.ideas/ai-doubt-solver.md` and fill in the competitive analysis"
4. Copilot will:
   - Search the web for real competitors
   - Summarize what each competitor does
   - Identify their weaknesses
   - Write a step-by-step strategy to beat them
   - Save everything back into the same file

---

## Folder Structure

```
.ideas/
  README.md              ← this file (workflow guide)
  _template.md           ← copy this for each new idea
  [your-idea-name].md    ← filled idea files (gitignored by default)
  research/
    [your-idea-name]-research.md   ← auto-generated competitor research
```

---

## Rules for This Folder

- Files starting with `_` are templates — do not delete them
- Never commit API keys or sensitive data here
- Each idea gets its own file — don't mix ideas in one file
- The `research/` subfolder is auto-populated by Copilot — do not manually edit research files

---

## Gitignore Status

This entire folder is **gitignored** by default (see `.gitignore`).  
Other devs on the team will NOT see your ideas unless you explicitly share the files.  
To share a specific idea with the team, move it out of `.ideas/` into the main docs.
