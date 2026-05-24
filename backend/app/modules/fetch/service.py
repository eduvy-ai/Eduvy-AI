"""
Fetch Service - Business logic for web fetching and YouTube.
"""
import re
import asyncio
import concurrent.futures
from typing import Dict, List
import httpx

_YOUTUBE_RE = re.compile(r"youtube\.com|youtu\.be", re.IGNORECASE)
_MAX_CHARS = 10_000

# Educational YouTube channels
_YT_EDU_CHANNELS = {
    "physics": "PhysicsWallah OR Vedantu OR Khan Academy",
    "chemistry": "PhysicsWallah OR Unacademy OR Khan Academy",
    "mathematics": "Cuemath OR Khan Academy OR Vedantu",
    "biology": "Unacademy OR Vedantu OR Khan Academy",
    "science": "PhysicsWallah OR Khan Academy OR Vedantu",
}


def _yt_search(query: str, limit: int = 10) -> List[Dict]:
    """Run yt-dlp search synchronously."""
    try:
        import yt_dlp
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'extract_flat': True,
            'default_search': f'ytsearch{limit}',
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            r = ydl.extract_info(f'ytsearch{limit}:{query}', download=False)
            entries = r.get('entries') or []
            results = []
            for e in entries:
                results.append({
                    'id': e.get('id', ''),
                    'title': e.get('title', ''),
                    'channel': e.get('channel') or e.get('uploader') or '',
                    'thumbnail': e.get('thumbnail') or f"https://i.ytimg.com/vi/{e.get('id', '')}/hqdefault.jpg",
                    'duration': int(e.get('duration') or 0),
                    'views': int(e.get('view_count') or 0),
                    'uploaded': e.get('upload_date') or '',
                })
            return results
    except Exception:
        return []


class FetchService:
    """Fetch business logic."""
    
    @staticmethod
    async def fetch_url(url: str) -> Dict:
        """Fetch content from URL."""
        is_youtube = bool(_YOUTUBE_RE.search(url))
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                content = resp.text[:_MAX_CHARS]
                return {"content": content, "isYouTube": is_youtube}
        except Exception as e:
            return {"content": f"Error: {e}", "isYouTube": is_youtube}
    
    @staticmethod
    async def youtube_search(query: str, limit: int = 10) -> List[Dict]:
        """Search YouTube videos."""
        loop = asyncio.get_event_loop()
        try:
            results = await asyncio.wait_for(
                loop.run_in_executor(None, _yt_search, query, limit),
                timeout=25.0
            )
            return results
        except asyncio.TimeoutError:
            return []
    
    @staticmethod
    async def youtube_smart_search(
        query: str,
        limit: int = 12,
        max_duration: int = 180
    ) -> List[Dict]:
        """Smart topic-aware YouTube search."""
        q_lower = query.lower().strip()
        
        # Build search queries
        queries = [
            f"{query} explained short",
            f"{query} quick revision",
            f"{query} concepts important",
        ]
        
        all_results = []
        seen_ids = set()
        
        loop = asyncio.get_event_loop()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(_yt_search, q, 8): q for q in queries}
            for future in concurrent.futures.as_completed(futures, timeout=28):
                try:
                    for r in future.result():
                        vid_id = r.get("id", "")
                        if not vid_id or vid_id in seen_ids:
                            continue
                        seen_ids.add(vid_id)
                        all_results.append(r)
                except Exception:
                    pass
        
        # Prefer short videos
        short = [r for r in all_results if 0 < r["duration"] <= max_duration]
        if len(short) >= 4:
            return short[:limit]
        return all_results[:limit]
