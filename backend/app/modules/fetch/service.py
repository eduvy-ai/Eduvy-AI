"""
Fetch Service - Business logic for web fetching and YouTube.
"""
import re
import asyncio
import concurrent.futures
from typing import Dict, List
import httpx

_YOUTUBE_RE = re.compile(r"youtube\.com|youtu\.be", re.IGNORECASE)
_YT_VIDEO_ID_RE = re.compile(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})")
_MAX_CHARS = 10_000

# Educational YouTube channels
_YT_EDU_CHANNELS = {
    "physics": "PhysicsWallah OR Vedantu OR Khan Academy",
    "chemistry": "PhysicsWallah OR Unacademy OR Khan Academy",
    "mathematics": "Cuemath OR Khan Academy OR Vedantu",
    "biology": "Unacademy OR Vedantu OR Khan Academy",
    "science": "PhysicsWallah OR Khan Academy OR Vedantu",
}


def _yt_get_video_info(url: str) -> Dict:
    """Get video info (title, description, channel) from YouTube URL."""
    try:
        import yt_dlp
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            title = info.get('title', '')
            channel = info.get('channel') or info.get('uploader') or ''
            description = (info.get('description') or '')[:2000]
            duration = info.get('duration') or 0
            
            # Build content string
            content = f"📺 Video: {title}\n"
            content += f"📺 Channel: {channel}\n"
            if duration:
                mins = duration // 60
                secs = duration % 60
                content += f"⏱️ Duration: {mins}:{secs:02d}\n"
            content += f"\n📝 Description:\n{description}"
            
            return {
                "content": content.strip(),
                "title": title,
                "channel": channel,
                "isYouTube": True
            }
    except Exception as e:
        return {"content": f"YouTube video (could not fetch details: {e})", "isYouTube": True}


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
        
        # For YouTube URLs, extract video info using yt-dlp
        if is_youtube:
            loop = asyncio.get_event_loop()
            try:
                result = await asyncio.wait_for(
                    loop.run_in_executor(None, _yt_get_video_info, url),
                    timeout=20.0
                )
                return result
            except asyncio.TimeoutError:
                return {"content": "YouTube video (timeout fetching details)", "isYouTube": True}
            except Exception as e:
                return {"content": f"YouTube video (error: {e})", "isYouTube": True}
        
        # For non-YouTube URLs, fetch HTML content
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url)
                content = resp.text[:_MAX_CHARS]
                return {"content": content, "isYouTube": False}
        except Exception as e:
            return {"content": f"Error: {e}", "isYouTube": False}
    
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

    @staticmethod
    async def youtube_edu_reels(query: str, limit: int = 16) -> List[Dict]:
        """Fetch educational YouTube Shorts (<=90 seconds)."""
        # Build creator-targeted + concept-targeted queries for Indian educators
        queries = [
            f"{query} short PhysicsWallah OR Vedantu OR Unacademy",
            f"{query} shorts educational",
            f"{query} quick concept",
        ]

        all_results: List[Dict] = []
        seen_ids: set = set()

        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(_yt_search, q, 10) for q in queries]
            for future in concurrent.futures.as_completed(futures, timeout=35):
                try:
                    for r in future.result():
                        vid_id = r.get("id", "")
                        if not vid_id or vid_id in seen_ids:
                            continue
                        # Only keep short videos (<=90s)
                        if 0 < r.get("duration", 0) <= 90:
                            seen_ids.add(vid_id)
                            all_results.append(r)
                except Exception:
                    pass

        # If not enough shorts, relax to <=120s
        if len(all_results) < 4:
            seen_ids_2: set = set(r["id"] for r in all_results)
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                futures2 = [executor.submit(_yt_search, f"{query} short", 10)]
                for future in concurrent.futures.as_completed(futures2, timeout=20):
                    try:
                        for r in future.result():
                            vid_id = r.get("id", "")
                            if not vid_id or vid_id in seen_ids_2:
                                continue
                            if 0 < r.get("duration", 0) <= 120:
                                seen_ids_2.add(vid_id)
                                all_results.append(r)
                    except Exception:
                        pass

        return all_results[:limit]

    @staticmethod
    async def youtube_video_info(video_id: str) -> Dict:
        """Get info for a specific YouTube video by ID."""
        def _get_info(vid_id: str) -> Dict:
            try:
                import yt_dlp
                ydl_opts = {
                    'quiet': True,
                    'skip_download': True,
                    'no_warnings': True,
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    r = ydl.extract_info(f'https://www.youtube.com/watch?v={vid_id}', download=False)
                    if not r:
                        return {}
                    return {
                        'id': r.get('id', vid_id),
                        'title': r.get('title', ''),
                        'channel': r.get('channel') or r.get('uploader') or '',
                        'thumbnail': r.get('thumbnail') or f'https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg',
                        'duration': int(r.get('duration') or 0),
                        'views': int(r.get('view_count') or 0),
                        'description': (r.get('description') or '')[:500],
                        'uploaded': r.get('upload_date') or '',
                    }
            except Exception:
                return {'id': video_id, 'thumbnail': f'https://i.ytimg.com/vi/{video_id}/hqdefault.jpg'}

        loop = asyncio.get_event_loop()
        try:
            return await asyncio.wait_for(
                loop.run_in_executor(None, _get_info, video_id),
                timeout=25.0
            )
        except asyncio.TimeoutError:
            return {'id': video_id, 'thumbnail': f'https://i.ytimg.com/vi/{video_id}/hqdefault.jpg'}
