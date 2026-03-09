# app/lastfm_client.py
"""
Last.fm API client for fetching artist genres/tags.
Used as fallback when artists aren't in our local database.
"""

import os
import httpx
from typing import List, Optional, Dict
from functools import lru_cache

# Get API key from environment
LASTFM_API_KEY = os.environ.get("LASTFM_API_KEY", "")

# Map Last.fm tags to our supported genres
TAG_TO_GENRE_MAP = {
    # Hip-Hop variants
    "hip-hop": "Hip-Hop",
    "hip hop": "Hip-Hop",
    "hiphop": "Hip-Hop",
    "rap": "Rap",
    "trap": "Rap",
    "drill": "Rap",
    "gangsta rap": "Rap",
    "conscious hip hop": "Hip-Hop",
    
    # Pop variants
    "pop": "Pop",
    "synthpop": "Pop",
    "dance pop": "Pop",
    "electropop": "Pop",
    "indie pop": "Indie",
    "art pop": "Alternative",
    "k-pop": "Pop",
    "j-pop": "Pop",
    
    # Rock variants
    "rock": "Rock",
    "alternative rock": "Alternative",
    "indie rock": "Indie",
    "punk": "Rock",
    "punk rock": "Rock",
    "grunge": "Rock",
    "hard rock": "Rock",
    "classic rock": "Rock",
    "metal": "Rock",
    "heavy metal": "Rock",
    
    # R&B variants
    "r&b": "R&B",
    "rnb": "R&B",
    "rhythm and blues": "R&B",
    "soul": "Soul",
    "neo-soul": "Soul",
    "neo soul": "Soul",
    "funk": "Soul",
    
    # Electronic variants
    "electronic": "Electronic",
    "edm": "Electronic",
    "house": "Electronic",
    "techno": "Electronic",
    "trance": "Electronic",
    "dubstep": "Electronic",
    "drum and bass": "Electronic",
    "ambient": "Electronic",
    
    # Other genres
    "jazz": "Jazz",
    "blues": "Blues",
    "country": "Country",
    "folk": "Folk",
    "indie": "Indie",
    "alternative": "Alternative",
    "reggae": "Reggae",
    "reggaeton": "Reggaeton",
    "latin": "Reggaeton",
    "classical": "Classical",
    "soundtrack": "Soundtrack",
    "dance": "Dance",
}

# Supported genres (must match our genre_mood_classifier)
SUPPORTED_GENRES = {
    "Hip-Hop", "Rap", "Pop", "Rock", "R&B", "Soul", "Electronic",
    "Jazz", "Blues", "Country", "Folk", "Indie", "Alternative",
    "Reggae", "Reggaeton", "Classical", "Soundtrack", "Dance"
}


def normalize_tag(tag: str) -> Optional[str]:
    """Convert a Last.fm tag to our supported genre format."""
    tag_lower = tag.lower().strip()
    
    # Direct mapping
    if tag_lower in TAG_TO_GENRE_MAP:
        return TAG_TO_GENRE_MAP[tag_lower]
    
    # Check if it's already a supported genre (case-insensitive)
    for genre in SUPPORTED_GENRES:
        if tag_lower == genre.lower():
            return genre
    
    # Partial matching for common patterns
    if "hip" in tag_lower and "hop" in tag_lower:
        return "Hip-Hop"
    if "rap" in tag_lower:
        return "Rap"
    if "rock" in tag_lower:
        return "Rock"
    if "pop" in tag_lower:
        return "Pop"
    if "electronic" in tag_lower or "electro" in tag_lower:
        return "Electronic"
    if "indie" in tag_lower:
        return "Indie"
    if "soul" in tag_lower or "r&b" in tag_lower or "rnb" in tag_lower:
        return "R&B"
    
    return None


async def get_artist_tags(artist_name: str) -> List[str]:
    """
    Fetch top tags for an artist from Last.fm.
    Returns normalized genres that match our system.
    """
    if not LASTFM_API_KEY:
        print("[LastFM] No API key configured")
        return []
    
    url = "https://ws.audioscrobbler.com/2.0/"
    params = {
        "method": "artist.gettoptags",
        "artist": artist_name,
        "api_key": LASTFM_API_KEY,
        "format": "json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=5.0)
            
            if response.status_code != 200:
                print(f"[LastFM] Error fetching tags for '{artist_name}': {response.status_code}")
                return []
            
            data = response.json()
            
            if "error" in data:
                print(f"[LastFM] API error for '{artist_name}': {data.get('message', 'Unknown error')}")
                return []
            
            tags = data.get("toptags", {}).get("tag", [])
            
            # Extract and normalize genres
            genres = []
            for tag in tags[:10]:  # Only look at top 10 tags
                tag_name = tag.get("name", "")
                count = int(tag.get("count", 0))
                
                # Only use tags with reasonable confidence
                if count >= 30:
                    normalized = normalize_tag(tag_name)
                    if normalized and normalized not in genres:
                        genres.append(normalized)
            
            print(f"[LastFM] '{artist_name}' → {genres}")
            return genres
            
    except Exception as e:
        print(f"[LastFM] Exception fetching tags for '{artist_name}': {e}")
        return []


async def get_multiple_artist_tags(artist_names: List[str]) -> Dict[str, List[str]]:
    """
    Fetch tags for multiple artists.
    Returns dict mapping artist name to list of genres.
    """
    import asyncio
    
    results = {}
    
    # Process in batches to avoid overwhelming the API
    batch_size = 5
    for i in range(0, len(artist_names), batch_size):
        batch = artist_names[i:i + batch_size]
        tasks = [get_artist_tags(name) for name in batch]
        batch_results = await asyncio.gather(*tasks)
        
        for name, tags in zip(batch, batch_results):
            if tags:
                results[name] = tags
    
    return results