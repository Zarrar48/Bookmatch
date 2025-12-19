import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
from datetime import datetime, date 

# Load .env
load_dotenv()
GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY")

if not GOOGLE_BOOKS_API_KEY:
    raise RuntimeError("GOOGLE_BOOKS_API_KEY is not set in .env")

GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PreferenceRequest(BaseModel):
    name: str
    birth_date: str
    reading_frequency: str
    reading_time: str
    reading_formats: List[str]
    book_length: str        
    genres: List[str]
    authors: List[str]
    liked_books: List[str]
    mood: str               
    pacing: str               
    language: Optional[str] = None 
    maturity: Optional[str] = None   


class Book(BaseModel):
    title: str
    author: str
    description: str
    genre: str
    pages: int
    rating: float
    cover: str


class RecommendationResponse(BaseModel):
    recommendations: List[Book]

async def google_books_search(
    q: str,
    language: Optional[str] = None,
    max_results: int = 10
) -> dict:
    """Call Google Books API."""
    params = {
        "q": q,
        "maxResults": max_results,
        "printType": "books",
        "key": GOOGLE_BOOKS_API_KEY,
    }
    if language:
        params["langRestrict"] = language

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(GOOGLE_BOOKS_URL, params=params)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Error from Google Books API")
        return resp.json()


def calculate_age(birth_date_str: str) -> Optional[int]:
    """
    Calculate age from birth_date string.
    Tries a few common formats; returns None if parsing fails.
    """
    if not birth_date_str:
        return None

    formats = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d")
    for fmt in formats:
        try:
            birth = datetime.strptime(birth_date_str, fmt).date()
            today = date.today()
            age = today.year - birth.year - (
                (today.month, today.day) < (birth.month, birth.day)
            )
            if age < 0 or age > 120:
                return None
            return age
        except ValueError:
            continue
    return None


def normalize_language(lang: Optional[str]) -> Optional[str]:
    """
    Map human-readable language names to ISO codes for Google Books.
    e.g. 'urdu' -> 'ur', 'english' -> 'en'
    """
    if not lang:
        return None

    lang = lang.strip().lower()

    mapping = {
        # English
        "english": "en",
        "en": "en",
        "en-us": "en",
        "en-gb": "en",
    }

    if lang in mapping:
        return mapping[lang]

    if len(lang) >= 2:
        return lang[:2]

    return None


def filter_items_by_language(items, lang_code: Optional[str]):
    """
    HARD filter by volumeInfo.language if a preferred language is selected.
    If no language preference -> return items as-is.
    """
    if not lang_code:
        return items

    filtered = []
    for item in items or []:
        info = item.get("volumeInfo", {}) or {}
        item_lang = (info.get("language") or "").lower()
        if item_lang.startswith(lang_code):
            filtered.append(item)
    return filtered


def build_query_from_preferences(p: PreferenceRequest) -> str:
    """Construct a Google Books query string based on user preferences (if/else logic)."""
    parts = []

    lang_code = normalize_language(p.language)

    if p.genres:
        parts.append(f"subject:{p.genres[0]}")

    if p.authors:
        parts.append(f"inauthor:\"{p.authors[0]}\"")

    if p.liked_books:
        parts.append(f"\"{p.liked_books[0]}\"")

    if lang_code in (None, "en"):
        if p.mood == "light":
            parts.append("feel-good OR humorous")
        elif p.mood == "thoughtful":
            parts.append("literary OR philosophical")
        elif p.mood == "emotional":
            parts.append("emotional OR heartwarming")
        elif p.mood == "adventurous":
            parts.append("adventure OR action")

    if not parts:
        parts.append("bestseller")

    return " ".join(parts)


def length_matches(pages: int, length_pref: str) -> bool:
    """Filter by user’s preferred length using if/else."""
    if pages is None or pages == 0:
        return True

    if length_pref == "short":
        return pages <= 200
    elif length_pref == "medium":
        return 200 <= pages <= 400
    elif length_pref == "long":
        return pages >= 400
    else:
        return True


def score_book(
    p: PreferenceRequest,
    item: dict,
    age: Optional[int],
) -> float:
    """
    Rule-based scoring using ALL available preferences in a more consistent way.
    """
    volume_info = item.get("volumeInfo", {}) or {}
    access_info = item.get("accessInfo", {}) or {}

    score = 0.0

    categories = [c.lower() for c in (volume_info.get("categories") or [])]
    title = (volume_info.get("title") or "").lower()
    authors = [a.lower() for a in (volume_info.get("authors") or [])]
    pages = int(volume_info.get("pageCount", 0) or 0)
    desc = (volume_info.get("description") or "").lower()
    print_type = (volume_info.get("printType") or "").lower()
    item_lang = (volume_info.get("language") or "").lower()

    lang_code = normalize_language(p.language)
    if lang_code:
        if item_lang.startswith(lang_code):
            score += 1.0  
        else:
            score -= 1.0   

    for g in p.genres or []:
        gl = g.lower()
        if any(gl in c for c in categories):
            score += 3.0  

    for fav in p.authors or []:
        fav_l = fav.lower()
        if fav_l in authors:
            score += 4.0  

    for liked in p.liked_books or []:
        liked_l = liked.lower()
        if liked_l in title:
            score += 2.0
        elif liked_l in desc:
            score += 1.0

    if pages > 0:
        if p.pacing == "slow" and pages > 400:
            score += 1.0
        elif p.pacing == "fast" and pages < 300:
            score += 1.0
        elif p.pacing == "moderate" and 250 <= pages <= 450:
            score += 0.7

    freq = (p.reading_frequency or "").lower()
    if pages > 0:
        if "day" in freq or "daily" in freq or "week" in freq:
            if pages >= 250:
                score += 0.7
        elif "month" in freq or "rare" in freq:
            if pages <= 300:
                score += 0.7

    rtime = (p.reading_time or "").lower()
    if pages > 0:
        if any(word in rtime for word in ["commute", "bus", "train", "short", "quick"]):
            if pages <= 300:
                score += 0.8
            elif pages > 450:
                score -= 0.5
        elif any(word in rtime for word in ["night", "bedtime"]):
            if 150 <= pages <= 350:
                score += 0.7
        elif any(word in rtime for word in ["weekend", "holiday", "vacation", "long"]):
            if pages >= 350:
                score += 0.8

    mood = (p.mood or "").lower()
    if mood == "light":
        if any(w in desc for w in ["funny", "humor", "humorous", "heartwarming", "uplifting", "cozy"]):
            score += 1.2
    elif mood == "thoughtful":
        if any(w in desc for w in ["philosophical", "reflective", "introspective", "literary"]):
            score += 1.2
    elif mood == "emotional":
        if any(w in desc for w in ["emotional", "moving", "heartbreaking", "tearjerker", "poignant"]):
            score += 1.2
    elif mood == "adventurous":
        if any(w in desc for w in ["adventure", "quest", "journey", "thriller", "action", "expedition"]):
            score += 1.2

    effective_maturity = (p.maturity or "").lower()
    if age is not None and age < 16 and not effective_maturity:
        effective_maturity = "clean"

    if effective_maturity == "clean":
        if any(word in desc for word in ["explicit", "sexual", "graphic violence", "erotic"]):
            score -= 3.0
    elif effective_maturity == "moderate":
        if any(word in desc for word in ["explicit", "sexual", "graphic violence", "erotic"]):
            score -= 1.5

    if age is not None:
        if age < 18:
            if any("young adult" in c or "teen" in c for c in categories):
                score += 0.8
            if any("adult" in c for c in categories):
                score -= 0.5
        elif age >= 18:
            if any("children" in c for c in categories):
                score -= 0.5

    formats = [f.lower() for f in (p.reading_formats or [])]
    epub_info = access_info.get("epub", {}) or {}
    pdf_info = access_info.get("pdf", {}) or {}
    is_ebook = bool(epub_info.get("isAvailable") or pdf_info.get("isAvailable"))

    if any(f in formats for f in ["ebook", "digital", "kindle"]):
        if is_ebook:
            score += 1.0
        else:
            score -= 1.0

    if any(f in formats for f in ["paperback", "hardcover", "print"]):
        if print_type == "book":
            score += 0.7

    if "audiobook" in formats:
        if any(w in (categories + [title, desc]) for w in ["audio", "audiobook"]):
            score += 0.6
        else:
            score -= 0.2

    if length_matches(pages, p.book_length):
        score += 0.8
    else:
        score -= 0.3

    rating = float(volume_info.get("averageRating", 4.0))
    score += (rating - 3.0)

    return score


# ---------- Endpoints ----------

@app.get("/search/authors")
async def search_authors(q: str = Query(..., min_length=2)) -> List[str]:
    data = await google_books_search(f"inauthor:{q}", max_results=10)
    authors_set = set()

    for item in data.get("items", []):
        info = item.get("volumeInfo", {})
        for a in info.get("authors", []):
            if q.lower() in a.lower():
                authors_set.add(a)

    return sorted(authors_set)


@app.get("/search/books")
async def search_books(q: str = Query(..., min_length=2)) -> List[str]:
    data = await google_books_search(q, max_results=10)
    titles: List[str] = []
    for item in data.get("items", []):
        info = item.get("volumeInfo", {})
        title = info.get("title")
        if title and title not in titles:
            titles.append(title)
    return titles


@app.post("/recommend", response_model=RecommendationResponse)
async def recommend_books(prefs: PreferenceRequest):
    age = calculate_age(prefs.birth_date)

    lang_code = normalize_language(prefs.language)

    # 1. Build query from preferences
    query = build_query_from_preferences(prefs)

    # 2. Call Google Books (first try)
    data = await google_books_search(query, language=lang_code)
    items = data.get("items", []) or []

    items = filter_items_by_language(items, lang_code)

    if not items:
        fallback = await google_books_search("bestseller", language=lang_code)
        items = fallback.get("items", []) or []
        items = filter_items_by_language(items, lang_code)

    if not items:
        return RecommendationResponse(recommendations=[])

    # 3. Convert to Book + filter & score (main algorithm)
    scored: List[tuple[float, Book]] = []

    for item in items:
        info = item.get("volumeInfo", {}) or {}
        title = info.get("title")
        if not title:
            continue

        authors = info.get("authors", []) or ["Unknown author"]
        description = info.get("description", "").strip() or "No description available."
        categories = info.get("categories", []) or ["General"]
        pages = int(info.get("pageCount", 0) or 0)

        if not length_matches(pages, prefs.book_length):
            continue

        image_links = info.get("imageLinks", {}) or {}
        cover = (
            image_links.get("thumbnail")
            or image_links.get("smallThumbnail")
            or "https://via.placeholder.com/150x200/1F2937/FFFFFF?text=No+Image"
        )
        rating = float(info.get("averageRating", 4.0))

        book = Book(
            title=title,
            author=", ".join(authors),
            description=description,
            genre=", ".join(categories),
            pages=pages,
            rating=rating,
            cover=cover,
        )

        score = score_book(prefs, item, age)
        scored.append((score, book))

    # ---------- NEW FALLBACK: top 4 highest-rated books ----------
    if not scored:
        genre_candidates: List[tuple[float, Book]] = []

        for item in items:
            info = item.get("volumeInfo", {}) or {}
            title = info.get("title")
            if not title:
                continue

            authors = info.get("authors", []) or ["Unknown author"]
            description = info.get("description", "").strip() or "No description available."
            categories = info.get("categories", []) or ["General"]
            pages = int(info.get("pageCount", 0) or 0)

            image_links = info.get("imageLinks", {}) or {}
            cover = (
                image_links.get("thumbnail")
                or image_links.get("smallThumbnail")
                or "https://via.placeholder.com/150x200/1F2937/FFFFFF?text=No+Image"
            )
            rating = float(info.get("averageRating", 4.0))

            if prefs.genres:
                cats_lower = [c.lower() for c in categories]
                if not any(g.lower() in c for g in prefs.genres for c in cats_lower):
                    continue

            book = Book(
                title=title,
                author=", ".join(authors),
                description=description,
                genre=", ".join(categories),
                pages=pages,
                rating=rating,
                cover=cover,
            )
            genre_candidates.append((rating, book))

        if genre_candidates:
            genre_candidates.sort(key=lambda x: x[0], reverse=True)
            top_books = [b for _, b in genre_candidates[:4]]
            return RecommendationResponse(recommendations=top_books)

        rating_candidates: List[tuple[float, Book]] = []
        for item in items:
            info = item.get("volumeInfo", {}) or {}
            title = info.get("title")
            if not title:
                continue

            authors = info.get("authors", []) or ["Unknown author"]
            description = info.get("description", "").strip() or "No description available."
            categories = info.get("categories", []) or ["General"]
            pages = int(info.get("pageCount", 0) or 0)

            image_links = info.get("imageLinks", {}) or {}
            cover = (
                image_links.get("thumbnail")
                or image_links.get("smallThumbnail")
                or "https://via.placeholder.com/150x200/1F2937/FFFFFF?text=No+Image"
            )
            rating = float(info.get("averageRating", 4.0))

            book = Book(
                title=title,
                author=", ".join(authors),
                description=description,
                genre=", ".join(categories),
                pages=pages,
                rating=rating,
                cover=cover,
            )
            rating_candidates.append((rating, book))

        if rating_candidates:
            rating_candidates.sort(key=lambda x: x[0], reverse=True)
            top_books = [b for _, b in rating_candidates[:4]]
            return RecommendationResponse(recommendations=top_books)

        return RecommendationResponse(recommendations=[])

    scored.sort(key=lambda x: x[0], reverse=True)
    top_books = [b for _, b in scored[:4]]

    return RecommendationResponse(recommendations=top_books)