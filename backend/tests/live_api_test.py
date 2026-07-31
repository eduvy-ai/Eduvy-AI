"""
live_api_test.py
================
Comprehensive LIVE API test with real credentials.
Tests all major endpoints and generates a detailed report.

Usage: python tests/live_api_test.py
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass, field

# ═══════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════

BASE_URL = "http://localhost:8000/api"
TEST_EMAIL = "pradip@gmail.com"
TEST_PASSWORD = "Pradip@123"

# ═══════════════════════════════════════════════════════════════
# Test Result Tracking
# ═══════════════════════════════════════════════════════════════

@dataclass
class TestResult:
    name: str
    endpoint: str
    method: str
    status: str  # "PASS", "FAIL", "SKIP"
    status_code: int = 0
    response_time_ms: float = 0
    error: str = ""
    details: str = ""

@dataclass
class TestReport:
    start_time: datetime = field(default_factory=datetime.now)
    end_time: datetime = None
    results: List[TestResult] = field(default_factory=list)
    user_data: Dict = field(default_factory=dict)
    
    def add(self, result: TestResult):
        self.results.append(result)
    
    @property
    def passed(self) -> int:
        return sum(1 for r in self.results if r.status == "PASS")
    
    @property
    def failed(self) -> int:
        return sum(1 for r in self.results if r.status == "FAIL")
    
    @property
    def skipped(self) -> int:
        return sum(1 for r in self.results if r.status == "SKIP")
    
    def print_report(self):
        self.end_time = datetime.now()
        duration = (self.end_time - self.start_time).total_seconds()
        
        print("\n" + "="*80)
        print("  EDUVY-AI LIVE API TEST REPORT")
        print("="*80)
        print(f"\n  Start Time:  {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  End Time:    {self.end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Duration:    {duration:.2f} seconds")
        print(f"\n  Test User:   {self.user_data.get('email', 'N/A')}")
        print(f"  User ID:     {self.user_data.get('id', 'N/A')}")
        print(f"  Plan:        {self.user_data.get('plan', 'N/A')}")
        
        print("\n" + "-"*80)
        print(f"  SUMMARY: {self.passed} PASSED | {self.failed} FAILED | {self.skipped} SKIPPED")
        print("-"*80)
        
        # Group by module
        modules = {}
        for r in self.results:
            module = r.endpoint.split("/")[1] if "/" in r.endpoint else "root"
            if module not in modules:
                modules[module] = []
            modules[module].append(r)
        
        for module, tests in modules.items():
            print(f"\n  [{module.upper()}]")
            for r in tests:
                status_icon = "✓" if r.status == "PASS" else "✗" if r.status == "FAIL" else "○"
                print(f"    {status_icon} {r.name}")
                print(f"      {r.method} {r.endpoint} → {r.status_code} ({r.response_time_ms:.0f}ms)")
                if r.error:
                    print(f"      ERROR: {r.error[:100]}")
                if r.details:
                    print(f"      {r.details}")
        
        print("\n" + "="*80)
        if self.failed == 0:
            print("  🎉 ALL TESTS PASSED!")
        else:
            print(f"  ⚠️  {self.failed} TEST(S) FAILED - Review above for details")
        print("="*80 + "\n")

# ═══════════════════════════════════════════════════════════════
# HTTP Helpers
# ═══════════════════════════════════════════════════════════════

def make_request(method: str, endpoint: str, token: str = None, data: dict = None, params: dict = None) -> Tuple[int, Any, float]:
    """Make HTTP request and return (status_code, response_data, time_ms)"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    start = time.time()
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=30)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=data, timeout=30)
        elif method == "PUT":
            resp = requests.put(url, headers=headers, json=data, timeout=30)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=30)
        elif method == "PATCH":
            resp = requests.patch(url, headers=headers, json=data, timeout=30)
        else:
            return 0, {"error": f"Unknown method: {method}"}, 0
        
        elapsed = (time.time() - start) * 1000
        try:
            return resp.status_code, resp.json(), elapsed
        except:
            return resp.status_code, resp.text, elapsed
    except Exception as e:
        return 0, {"error": str(e)}, (time.time() - start) * 1000

# ═══════════════════════════════════════════════════════════════
# Test Functions
# ═══════════════════════════════════════════════════════════════

def test_health(report: TestReport) -> bool:
    """Test health endpoint"""
    status, data, ms = make_request("GET", "/health")
    result = TestResult(
        name="Health Check",
        endpoint="/health",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"AI Providers: {data.get('ai_providers', 'N/A')}" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)
    return status == 200

def test_auth_login(report: TestReport) -> str:
    """Test login and return token"""
    status, data, ms = make_request("POST", "/auth/login", data={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    token = data.get("token") if status == 200 else None
    result = TestResult(
        name="User Login",
        endpoint="/auth/login",
        method="POST",
        status="PASS" if token else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Token received: {'Yes' if token else 'No'}",
        error=data.get("detail", "") if not token else ""
    )
    report.add(result)
    
    if token:
        report.user_data = {
            "id": data.get("user", {}).get("id"),
            "email": data.get("user", {}).get("email"),
            "name": data.get("user", {}).get("name"),
            "plan": data.get("user", {}).get("plan"),
        }
    
    return token

def test_auth_me(report: TestReport, token: str) -> dict:
    """Test /auth/me endpoint"""
    status, data, ms = make_request("GET", "/auth/me", token=token)
    result = TestResult(
        name="Get Current User",
        endpoint="/auth/me",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"User: {data.get('name', 'N/A')} ({data.get('email', 'N/A')})" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)
    return data if status == 200 else {}

def test_profile(report: TestReport, token: str, user_id: str):
    """Test profile endpoints"""
    # GET profile
    status, data, ms = make_request("GET", f"/profile/{user_id}", token=token)
    result = TestResult(
        name="Get Profile",
        endpoint=f"/profile/{user_id}",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Board: {data.get('board', 'N/A')}, Standard: {data.get('standard', 'N/A')}, Language: {data.get('language', 'N/A')}" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)

def test_curriculum(report: TestReport):
    """Test curriculum endpoints (public)"""
    # Boards
    status, data, ms = make_request("GET", "/curriculum/boards")
    result = TestResult(
        name="Get Boards",
        endpoint="/curriculum/boards",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data) if isinstance(data, list) else 0} boards" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)
    
    # Standards
    status, data, ms = make_request("GET", "/curriculum/standards")
    result = TestResult(
        name="Get Standards",
        endpoint="/curriculum/standards",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data) if isinstance(data, list) else 0} standards" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)
    
    # Mediums
    status, data, ms = make_request("GET", "/curriculum/mediums")
    result = TestResult(
        name="Get Mediums",
        endpoint="/curriculum/mediums",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data) if isinstance(data, list) else 0} mediums" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)

def test_notebook(report: TestReport, token: str, user_id: str):
    """Test notebook endpoints"""
    # Get sources - correct path is /{user_id}/sources
    status, data, ms = make_request("GET", f"/notebook/{user_id}/sources", token=token)
    result = TestResult(
        name="Get Notebook Sources",
        endpoint=f"/notebook/{user_id}/sources",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data) if isinstance(data, list) else 0} sources" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)
    
    # Get chat - correct path is /{user_id}/chat
    status, data, ms = make_request("GET", f"/notebook/{user_id}/chat", token=token)
    result = TestResult(
        name="Get Notebook Chat",
        endpoint=f"/notebook/{user_id}/chat",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data) if isinstance(data, list) else 0} messages" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)

def test_squads(report: TestReport, token: str):
    """Test squads endpoints"""
    # My squad
    status, data, ms = make_request("GET", "/squads/my", token=token)
    result = TestResult(
        name="Get My Squad",
        endpoint="/squads/my",
        method="GET",
        status="PASS" if status in [200, 404] else "FAIL",  # 404 is OK if not in squad
        status_code=status,
        response_time_ms=ms,
        details=f"Squad: {data.get('name', 'Not in a squad')}" if status == 200 else "Not in a squad" if status == 404 else "",
        error=str(data) if status not in [200, 404] else ""
    )
    report.add(result)
    return data if status == 200 else None

def test_bhool(report: TestReport, token: str):
    """Test bhool endpoints"""
    # My cards - correct endpoint is /cards/mine
    status, data, ms = make_request("GET", "/bhool/cards/mine", token=token)
    result = TestResult(
        name="Get My Bhool Cards",
        endpoint="/bhool/cards/mine",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data.get('cards', [])) if isinstance(data, dict) else 0} cards" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)
    
    # Marketplace
    status, data, ms = make_request("GET", "/bhool/marketplace", token=token)
    result = TestResult(
        name="Get Bhool Marketplace",
        endpoint="/bhool/marketplace",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data.get('cards', [])) if isinstance(data, dict) else 0} marketplace cards" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)

def test_muqabla(report: TestReport, token: str):
    """Test muqabla endpoints"""
    # Leaderboard
    status, data, ms = make_request("GET", "/muqabla/leaderboard", token=token)
    result = TestResult(
        name="Get Muqabla Leaderboard",
        endpoint="/muqabla/leaderboard",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data.get('leaderboard', [])) if isinstance(data, dict) else 0} entries" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)
    
    # My battles history - correct endpoint is /history
    status, data, ms = make_request("GET", "/muqabla/history", token=token)
    result = TestResult(
        name="Get My Battles History",
        endpoint="/muqabla/history",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data.get('battles', [])) if isinstance(data, dict) else 0} battles" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)
    
    # Open battles
    status, data, ms = make_request("GET", "/muqabla/open", token=token)
    result = TestResult(
        name="Get Open Battles",
        endpoint="/muqabla/open",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data.get('battles', [])) if isinstance(data, dict) else 0} open battles" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)

def test_mastery(report: TestReport, token: str, user_id: str):
    """Test mastery endpoints"""
    status, data, ms = make_request("GET", f"/mastery/{user_id}", token=token)
    result = TestResult(
        name="Get Mastery Scores",
        endpoint=f"/mastery/{user_id}",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Subjects: {len(data) if isinstance(data, dict) else 0}" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)

def test_sessions(report: TestReport, token: str, user_id: str):
    """Test sessions endpoints - chat sessions are keyed by session name"""
    # Try getting a draft (this tests the sessions router)
    status, data, ms = make_request("GET", f"/draft/{user_id}/video_lesson", token=token)
    result = TestResult(
        name="Get Draft (Sessions)",
        endpoint=f"/draft/{user_id}/video_lesson",
        method="GET",
        status="PASS" if status in [200, 404] else "FAIL",  # 404 OK if no draft
        status_code=status,
        response_time_ms=ms,
        details=f"Draft found: {bool(data.get('content'))}" if status == 200 else "No draft saved" if status == 404 else "",
        error=str(data) if status not in [200, 404] else ""
    )
    report.add(result)

def test_quiz_stats(report: TestReport, token: str, user_id: str):
    """Test quiz stats endpoints"""
    # Correct path is /{user_id}/stats
    status, data, ms = make_request("GET", f"/quiz/{user_id}/stats", token=token)
    result = TestResult(
        name="Get Quiz Stats",
        endpoint=f"/quiz/{user_id}/stats",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Total quizzes: {data.get('total_quizzes', 0)}, Avg score: {data.get('avg_score', 0):.1f}%" if status == 200 and isinstance(data, dict) else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)

def test_parent(report: TestReport, token: str):
    """Test parent endpoints"""
    status, data, ms = make_request("GET", "/parent/pin", token=token)
    result = TestResult(
        name="Get Parent PIN",
        endpoint="/parent/pin",
        method="GET",
        status="PASS" if status in [200, 404] else "FAIL",  # 404 OK if no PIN set
        status_code=status,
        response_time_ms=ms,
        details=f"PIN: {data.get('pin', 'Not set')}" if status == 200 else "No PIN set" if status == 404 else "",
        error=str(data) if status not in [200, 404] else ""
    )
    report.add(result)

def test_referrals(report: TestReport, token: str):
    """Test referrals endpoints"""
    # Correct endpoint is /code
    status, data, ms = make_request("GET", "/referrals/code", token=token)
    result = TestResult(
        name="Get Referral Code",
        endpoint="/referrals/code",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Code: {data.get('code', 'N/A')}" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)

def test_home(report: TestReport, token: str):
    """Test home endpoints"""
    # Daily content - actual endpoint with valid content_type
    status, data, ms = make_request("GET", "/home/daily-content/brief", token=token)
    result = TestResult(
        name="Get Daily Content (Brief)",
        endpoint="/home/daily-content/brief",
        method="GET",
        status="PASS" if status in [200, 404] else "FAIL",  # 404 OK if no content saved
        status_code=status,
        response_time_ms=ms,
        details=f"Content: {str(data.get('content', ''))[:50]}..." if status == 200 and isinstance(data, dict) else "No daily content" if status == 404 else "",
        error=str(data) if status not in [200, 404] else ""
    )
    report.add(result)

def test_ai(report: TestReport, token: str):
    """Test AI endpoint (simple chat)"""
    status, data, ms = make_request("POST", "/ai/chat", token=token, data={
        "prompt": "What is 2+2? Reply in one word.",
        "system_prompt": "",
        "history": [],
        "max_tokens": 50,
        "mode": ""
    })
    result = TestResult(
        name="AI Chat (Simple Math)",
        endpoint="/ai/chat",
        method="POST",
        status="PASS" if status == 200 and data.get("response") else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Response: {str(data.get('response', ''))[:50]}..." if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)

def test_video(report: TestReport, token: str, user_id: str):
    """Test video endpoints"""
    # Get video library
    status, data, ms = make_request("GET", "/video/library", token=token)
    result = TestResult(
        name="Get Video Library",
        endpoint="/video/library",
        method="GET",
        status="PASS" if status == 200 else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data.get('videos', [])) if isinstance(data, dict) else 0} videos" if status == 200 else "",
        error=str(data) if status != 200 else ""
    )
    report.add(result)

def test_storage(report: TestReport, token: str, user_id: str):
    """Test storage endpoints"""
    status, data, ms = make_request("GET", f"/storage/files/{user_id}", token=token)
    result = TestResult(
        name="Get Storage Files",
        endpoint=f"/storage/files/{user_id}",
        method="GET",
        status="PASS" if status in [200, 404] else "FAIL",
        status_code=status,
        response_time_ms=ms,
        details=f"Found {len(data.get('files', [])) if isinstance(data, dict) else 0} files" if status == 200 else "No files" if status == 404 else "",
        error=str(data) if status not in [200, 404] else ""
    )
    report.add(result)

# ═══════════════════════════════════════════════════════════════
# Main Test Runner
# ═══════════════════════════════════════════════════════════════

def run_all_tests():
    print("\n🔬 Starting Eduvy-AI Live API Tests...")
    print(f"   Base URL: {BASE_URL}")
    print(f"   Test User: {TEST_EMAIL}\n")
    
    report = TestReport()
    
    # 1. Health Check
    print("  [1/15] Testing Health...")
    if not test_health(report):
        print("  ❌ Server not responding! Aborting tests.")
        report.print_report()
        return
    
    # 2. Authentication
    print("  [2/15] Testing Authentication...")
    token = test_auth_login(report)
    if not token:
        print("  ❌ Login failed! Aborting tests.")
        report.print_report()
        return
    
    # 3. Auth Me
    print("  [3/15] Testing Auth Me...")
    user = test_auth_me(report, token)
    user_id = user.get("id", report.user_data.get("id"))
    
    # 4. Profile
    print("  [4/15] Testing Profile...")
    test_profile(report, token, user_id)
    
    # 5. Curriculum (public)
    print("  [5/15] Testing Curriculum...")
    test_curriculum(report)
    
    # 6. Notebook
    print("  [6/15] Testing Notebook...")
    test_notebook(report, token, user_id)
    
    # 7. Squads
    print("  [7/15] Testing Squads...")
    test_squads(report, token)
    
    # 8. Bhool
    print("  [8/15] Testing Bhool...")
    test_bhool(report, token)
    
    # 9. Muqabla
    print("  [9/15] Testing Muqabla...")
    test_muqabla(report, token)
    
    # 10. Mastery
    print("  [10/15] Testing Mastery...")
    test_mastery(report, token, user_id)
    
    # 11. Sessions
    print("  [11/15] Testing Sessions...")
    test_sessions(report, token, user_id)
    
    # 12. Quiz Stats
    print("  [12/15] Testing Quiz Stats...")
    test_quiz_stats(report, token, user_id)
    
    # 13. Parent
    print("  [13/15] Testing Parent...")
    test_parent(report, token)
    
    # 14. Referrals
    print("  [14/15] Testing Referrals...")
    test_referrals(report, token)
    
    # 15. Home
    print("  [15/15] Testing Home...")
    test_home(report, token)
    
    # AI Test (optional - may be slow)
    print("  [BONUS] Testing AI Chat...")
    test_ai(report, token)
    
    # Video
    print("  [BONUS] Testing Video...")
    test_video(report, token, user_id)
    
    # Storage
    print("  [BONUS] Testing Storage...")
    test_storage(report, token, user_id)
    
    # Print final report
    report.print_report()

if __name__ == "__main__":
    run_all_tests()
