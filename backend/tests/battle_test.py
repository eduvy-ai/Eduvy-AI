#!/usr/bin/env python3
"""
Two-Player Battle Test for Muqabla (Eduvy-AI)
Tests the complete battle flow with two real users.
"""
import requests
import time

BASE_URL = "http://localhost:8000/api"

# Test users
USER1 = {"email": "pradip@gmail.com", "password": "Pradip@123"}
USER2 = {"email": "krishna@gmail.com", "password": "krishna@123"}

def login(email: str, password: str) -> tuple[str, str, str]:
    """Login and return (token, user_id, name)"""
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=30)
    if r.status_code != 200:
        print(f"❌ Login failed for {email}: {r.text}")
        return None, None, None
    data = r.json()
    token = data.get("token") or data.get("access_token")
    # Response uses 'profile' not 'user'
    profile = data.get("profile") or data.get("user", {})
    return token, profile.get("id"), profile.get("name", email.split("@")[0])

def api_get(endpoint: str, token: str):
    """GET request with auth"""
    r = requests.get(f"{BASE_URL}{endpoint}", headers={"Authorization": f"Bearer {token}"}, timeout=30)
    return r.status_code, r.json() if r.text else {}

def api_post(endpoint: str, token: str, data: dict = None):
    """POST request with auth"""
    r = requests.post(f"{BASE_URL}{endpoint}", json=data or {}, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    return r.status_code, r.json() if r.text else {}

def api_delete(endpoint: str, token: str):
    """DELETE request with auth"""
    r = requests.delete(f"{BASE_URL}{endpoint}", headers={"Authorization": f"Bearer {token}"}, timeout=30)
    return r.status_code, r.json() if r.text else {}

def main():
    print("\n" + "="*70)
    print("  MUQABLA TWO-PLAYER BATTLE TEST")
    print("="*70)
    
    # Step 1: Login both users
    print("\n📌 Step 1: Logging in both users...")
    
    token1, user1_id, name1 = login(USER1["email"], USER1["password"])
    if not token1:
        print("❌ Cannot proceed without User 1")
        return
    print(f"   ✓ User 1: {name1} ({user1_id[:8]}...)")
    
    token2, user2_id, name2 = login(USER2["email"], USER2["password"])
    if not token2:
        print("❌ Cannot proceed without User 2")
        return
    print(f"   ✓ User 2: {name2} ({user2_id[:8]}...)")
    
    # Step 2: Check current state
    print("\n📌 Step 2: Checking current battle state...")
    
    status, data = api_get("/muqabla/open", token2)
    open_battles = data.get("battles", [])
    print(f"   Open battles visible to {name2}: {len(open_battles)}")
    
    status, data = api_get("/muqabla/active", token1)
    active1 = data.get("battles", [])
    print(f"   Active battles for {name1}: {len(active1)}")
    
    status, data = api_get("/muqabla/active", token2)
    active2 = data.get("battles", [])
    print(f"   Active battles for {name2}: {len(active2)}")
    
    # Step 3: User 1 creates a challenge
    print(f"\n📌 Step 3: {name1} creates a battle challenge...")
    
    status, data = api_post("/muqabla/challenge", token1, {
        "subject": "Mathematics",
        "difficulty": "Easy"
    })
    
    if status != 201:
        print(f"   ❌ Failed to create challenge: {data}")
        # Try to use existing open battle
        if open_battles:
            battle_id = open_battles[0]["id"]
            print(f"   → Using existing open battle #{battle_id}")
        else:
            return
    else:
        battle_id = data.get("id")
        print(f"   ✓ Battle #{battle_id} created ({data.get('question_count', 5)} questions)")
    
    # Step 4: User 2 sees the open battle
    print(f"\n📌 Step 4: {name2} checks open battles...")
    time.sleep(1)  # Small delay for DB
    
    status, data = api_get("/muqabla/open", token2)
    open_battles = data.get("battles", [])
    print(f"   Found {len(open_battles)} open battles")
    
    target_battle = None
    for b in open_battles:
        if b["id"] == battle_id:
            target_battle = b
            print(f"   ✓ Found battle #{battle_id}: {b['subject']} ({b['difficulty']}) by {b['challenger_name']}")
            break
    
    if not target_battle:
        print(f"   ⚠️ Battle #{battle_id} not in open list (may be wrong standard)")
        # Check if standards match
        status, p1 = api_get(f"/profile/{user1_id}", token1)
        status, p2 = api_get(f"/profile/{user2_id}", token2)
        print(f"   {name1}'s standard: {p1.get('standard')}")
        print(f"   {name2}'s standard: {p2.get('standard')}")
        if p1.get("standard") != p2.get("standard"):
            print("   ❌ Standards don't match! Battles are standard-specific.")
            return
    
    # Step 5: User 2 joins the battle
    print(f"\n📌 Step 5: {name2} joins battle #{battle_id}...")
    
    status, data = api_post(f"/muqabla/battles/{battle_id}/join", token2)
    
    if status != 200:
        print(f"   ❌ Failed to join: {data}")
        return
    
    questions = data.get("questions", [])
    print(f"   ✓ Joined! Got {len(questions)} questions")
    for i, q in enumerate(questions[:2], 1):  # Show first 2
        print(f"      Q{i}: {q.get('q', '')[:50]}...")
    
    # Step 6: User 1 submits answers (challenger)
    print(f"\n📌 Step 6: {name1} (challenger) submits answers...")
    
    # Answer all with option 0 for testing
    answers1 = [0] * len(questions)
    status, data = api_post(f"/muqabla/battles/{battle_id}/answer", token1, {
        "answers": answers1,
        "time_seconds": 45
    })
    
    if status != 200:
        print(f"   ❌ Failed to submit: {data}")
        return
    
    print(f"   ✓ Score: {data.get('score', 0)}/{data.get('total', 5)} | Status: {data.get('status')}")
    
    # Step 7: User 2 submits answers (opponent)
    print(f"\n📌 Step 7: {name2} (opponent) submits answers...")
    
    # Answer all with option 1 for different results
    answers2 = [1] * len(questions)
    status, data = api_post(f"/muqabla/battles/{battle_id}/answer", token2, {
        "answers": answers2,
        "time_seconds": 60
    })
    
    if status != 200:
        print(f"   ❌ Failed to submit: {data}")
        return
    
    print(f"   ✓ Score: {data.get('score', 0)}/{data.get('total', 5)}")
    print(f"   Challenger score: {data.get('challenger_score', 0)}")
    print(f"   Winner: {data.get('winner_id', 'unknown')}")
    print(f"   XP earned: {data.get('xp_earned', 0)}")
    
    # Step 8: Check battle result
    print(f"\n📌 Step 8: Checking final battle result...")
    
    status, battle = api_get(f"/muqabla/battles/{battle_id}", token1)
    if status == 200:
        print(f"   Battle #{battle['id']}: {battle['subject']}")
        print(f"   {battle['challenger_name']}: {battle.get('challenger_score', 0)}")
        print(f"   {battle['opponent_name']}: {battle.get('opponent_score', 0)}")
        print(f"   Status: {battle['status']}")
        if battle.get('winner_id') == 'draw':
            print(f"   Result: 🤝 DRAW")
        elif battle.get('winner_id') == user1_id:
            print(f"   Result: 🏆 {name1} WINS!")
        elif battle.get('winner_id') == user2_id:
            print(f"   Result: 🏆 {name2} WINS!")
    
    # Step 9: Check history
    print(f"\n📌 Step 9: Checking battle history...")
    
    status, data = api_get("/muqabla/history", token1)
    history = data.get("battles", [])
    print(f"   {name1}'s completed battles: {len(history)}")
    
    status, data = api_get("/muqabla/history", token2)
    history = data.get("battles", [])
    print(f"   {name2}'s completed battles: {len(history)}")
    
    # Step 10: Check leaderboard
    print(f"\n📌 Step 10: Checking leaderboard...")
    
    status, data = api_get("/muqabla/leaderboard", token1)
    leaders = data.get("leaderboard", [])
    print(f"   Top {len(leaders)} on leaderboard:")
    for i, l in enumerate(leaders[:5], 1):
        me = " ← YOU" if l.get("is_me") else ""
        print(f"      {i}. {l.get('name', 'Unknown')} - {l.get('wins', 0)} wins{me}")
    
    print("\n" + "="*70)
    print("  ✅ BATTLE TEST COMPLETE!")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
