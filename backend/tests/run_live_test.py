"""Live API test — run against deployed backend."""
import requests
import json
import sys

BASE = "https://eduvyai-api.onrender.com"
EMAIL = "pb.pawar2111@gmail.com"
PASSWORD = "Pradip@123"
T = 60
T_AI = 180

results = []

def report(name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    results.append((name, passed, detail))
    print("  [%s] %s%s" % (status, name, (" -- " + detail if detail else "")))

def hdr(token):
    return {"Authorization": "Bearer " + token, "Content-Type": "application/json"}

def main():
    print("=" * 60)
    print("EDUVY-AI LIVE API TEST REPORT")
    print("=" * 60)

    # 1. Health
    print("\n--- 1. Health Check ---")
    try:
        r = requests.get(BASE + "/api/health", timeout=T)
        report("Health", r.status_code == 200, str(r.status_code))
    except Exception as e:
        report("Health", False, str(e)[:80])

    # 2. Login
    print("\n--- 2. Login ---")
    token = None
    try:
        r = requests.post(BASE + "/api/auth/login",
                          json={"email": EMAIL, "password": PASSWORD}, timeout=T)
        if r.status_code == 200:
            d = r.json()
            token = d.get("token")
            p = d.get("profile", {})
            plan = p.get("plan", "?")
            lang = p.get("language", "?")
            name = p.get("name", "?")
            report("Login", True, "name=%s plan=%s lang=%s" % (name, plan, lang))
        else:
            report("Login", False, "%d: %s" % (r.status_code, r.text[:150]))
    except Exception as e:
        report("Login", False, str(e)[:80])

    if not token:
        print("CANNOT CONTINUE -- no token")
        return 1

    # 3. /auth/me
    print("\n--- 3. Auth/Me ---")
    try:
        r = requests.get(BASE + "/api/auth/me", headers=hdr(token), timeout=T)
        report("/auth/me", r.status_code == 200, str(r.status_code))
    except Exception as e:
        report("/auth/me", False, str(e)[:80])

    # 4. Invalid token
    try:
        r = requests.get(BASE + "/api/auth/me", headers=hdr("bad-token"), timeout=T)
        report("Invalid token=401", r.status_code == 401, str(r.status_code))
    except Exception as e:
        report("Invalid token=401", False, str(e)[:80])

    # 5. AI Usage
    print("\n--- 4. AI Usage ---")
    try:
        r = requests.get(BASE + "/api/ai/usage", headers=hdr(token), timeout=T)
        if r.status_code == 200:
            u = r.json()
            report("AI Usage", True, "today=%s/%s" % (u.get("today_calls"), u.get("daily_limit")))
        else:
            report("AI Usage", False, str(r.status_code))
    except Exception as e:
        report("AI Usage", False, str(e)[:80])

    # 6. AI Chat
    print("\n--- 5. AI Chat ---")
    try:
        r = requests.post(BASE + "/api/ai/chat", headers=hdr(token), json={
            "prompt": "What is photosynthesis? 2 sentences only.",
            "mode": "chapter_tutor",
            "history": [],
            "max_tokens": 300,
        }, timeout=T_AI)
        if r.status_code == 200:
            body = r.json()
            resp = body.get("response", "")
            err = resp.startswith("\u26a0\ufe0f")
            usage = body.get("usage", {})
            report("AI Chat", not err,
                   "len=%d, calls=%s" % (len(resp), usage.get("calls_today")))
            if err:
                report("  error detail", False, resp[:150])
        elif r.status_code == 429:
            report("AI Chat", True, "quota reached (expected)")
        elif r.status_code == 502:
            report("AI Chat", False, "502: AI unavailable")
        else:
            report("AI Chat", False, "%d: %s" % (r.status_code, r.text[:100]))
    except Exception as e:
        report("AI Chat", False, str(e)[:80])

    # 7. Study Coach
    print("\n--- 6. Study Coach ---")
    try:
        r = requests.post(BASE + "/api/ai/study-coach", headers=hdr(token), json={
            "question": "Explain gravity in simple terms",
            "mode": "study_coach",
        }, timeout=T_AI)
        if r.status_code == 200:
            b = r.json()
            title = str(b.get("title", ""))[:50]
            report("Study Coach", bool(b.get("title")), "title=" + title)
        elif r.status_code == 429:
            report("Study Coach", True, "quota reached")
        else:
            report("Study Coach", False, "%d: %s" % (r.status_code, r.text[:100]))
    except Exception as e:
        report("Study Coach", False, str(e)[:80])

    # 8. Profile
    print("\n--- 7. Profile ---")
    try:
        r = requests.get(BASE + "/api/profile", headers=hdr(token), timeout=T)
        report("Profile", r.status_code == 200, str(r.status_code))
    except Exception as e:
        report("Profile", False, str(e)[:80])

    # 9. Curriculum
    print("\n--- 8. Curriculum ---")
    try:
        r = requests.get(BASE + "/api/curriculum/boards", timeout=T)
        cnt = len(r.json()) if r.status_code == 200 else 0
        report("Boards", r.status_code == 200, "count=%d" % cnt)
    except Exception as e:
        report("Boards", False, str(e)[:80])

    # 10. Feature endpoints
    print("\n--- 9. Feature Endpoints ---")
    endpoints = [
        ("Notebook Sources", "/api/notebook/sources"),
        ("Squads", "/api/squads/me"),
        ("Mastery", "/api/mastery"),
        ("Quiz Stats", "/api/quiz/stats"),
        ("Bhool Cards", "/api/bhool/cards"),
        ("Muqabla LB", "/api/muqabla/leaderboard"),
        ("Parent PIN", "/api/parent/pin"),
        ("Chat Sessions", "/api/chat-session/list"),
        ("Chapters", "/api/chapters"),
    ]
    for name, path in endpoints:
        try:
            r = requests.get(BASE + path, headers=hdr(token), timeout=T)
            report(name, r.status_code in (200, 404), str(r.status_code))
        except Exception as e:
            report(name, False, str(e)[:60])

    # 11. AI modes
    print("\n--- 10. AI Chat Modes ---")
    for mode in ["quiz_generate", "mental_wellness", "samjhao"]:
        try:
            r = requests.post(BASE + "/api/ai/chat", headers=hdr(token), json={
                "prompt": "What is gravity?",
                "mode": mode,
                "history": [],
                "max_tokens": 300,
            }, timeout=T_AI)
            if r.status_code == 200:
                resp = r.json().get("response", "")
                err = resp.startswith("\u26a0\ufe0f")
                report("mode:" + mode, not err, "len=%d" % len(resp))
            elif r.status_code == 429:
                report("mode:" + mode, True, "quota reached")
            else:
                report("mode:" + mode, False, "%d" % r.status_code)
        except Exception as e:
            report("mode:" + mode, False, str(e)[:60])

    # Summary
    print("\n" + "=" * 60)
    p = sum(1 for _, ok, _ in results if ok)
    f = sum(1 for _, ok, _ in results if not ok)
    print("RESULTS: %d passed, %d failed, %d total" % (p, f, len(results)))
    print("=" * 60)
    if f:
        print("\nFAILED:")
        for n, ok, d in results:
            if not ok:
                print("  - %s: %s" % (n, d))
    return 0 if f == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
