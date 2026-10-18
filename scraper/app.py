"""Tagett website scraper: ScrapeGraphAI with a real browser.

Tagett (on Vercel) can't run a browser, so this small service does: it opens
a business's website in headless Chromium, follows its own contact /
imprint / legal pages, and has ScrapeGraphAI read the rendered pages for the
contact email, phone, contact person and a one-line summary of the business.

Every email returned appears in the rendered pages themselves; anything the
AI suggests that isn't on the page is dropped, so an invented address can
never reach an outreach email.
"""

import asyncio
import ipaddress
import os
import re
import socket
from functools import lru_cache
from urllib.parse import urljoin, urlparse

from fastapi import FastAPI, Header, HTTPException
from playwright.async_api import async_playwright
from pydantic import BaseModel

SECRET = os.environ.get("SCRAPER_SECRET", "").strip()
MODEL = os.environ.get("SCRAPER_MODEL", "groq/openai/gpt-oss-120b").strip()
MODEL_TOKENS = int(os.environ.get("SCRAPER_MODEL_TOKENS", "8192"))
MAX_CHARS = 12000  # keeps one request inside Groq's free per-minute token limit
MAX_EXTRA_PAGES = 3

# Which environment variable holds the key for the model's provider.
PROVIDER_KEYS = {
    "groq": "GROQ_API_KEY",
    "google_genai": "GEMINI_API_KEY",
    "openai": "OPENAI_API_KEY",
    "mistralai": "MISTRAL_API_KEY",
}

CONTACT_WORDS = re.compile(
    r"contact|kontakt|impressum|imprint|legal|mentions|contacto|contatti|contato|contacten|"
    r"om-oss|kontakta|about|ueber|uber-uns|chi-siamo|a-propos|qui-sommes|sobre|get-in-touch|find-us",
    re.I,
)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}")
JUNK_DOMAIN = re.compile(
    r"(^|\.)(example\.(com|org)|sentry\.io|wixpress\.com|godaddy\.com|cloudflare\.com|schema\.org|"
    r"w3\.org|facebook\.com|google\.com|gstatic\.com|squarespace\.com|wordpress\.(com|org))$",
    re.I,
)
JUNK_LOCAL = re.compile(r"^(noreply|no-reply|donotreply|test|user|your|name|email|example)$", re.I)

# Local testing against a site on localhost; never set on the live service.
ALLOW_PRIVATE = os.environ.get("SCRAPER_ALLOW_PRIVATE") == "1"

app = FastAPI(title="Tagett scraper")


@lru_cache(maxsize=512)
def public_host(host: str) -> bool:
    """Whether every address the host resolves to is on the public internet."""
    try:
        infos = socket.getaddrinfo(host, None)
    except (socket.gaierror, UnicodeError):
        return False
    return bool(infos) and all(ipaddress.ip_address(i[4][0].split("%")[0]).is_global for i in infos)


def allowed(url: str) -> bool:
    """Only public http(s) sites: the service must never become a way to reach
    loopback, link-local (cloud metadata) or private-network addresses."""
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        return False
    return ALLOW_PRIVATE or public_host(p.hostname)


class ExtractRequest(BaseModel):
    url: str


def usable(email: str) -> bool:
    local, _, domain = email.lower().partition("@")
    if not local or not domain or re.search(r"\.(png|jpe?g|gif|svg|webp|css|js)$", domain):
        return False
    return not JUNK_DOMAIN.search(domain) and not JUNK_LOCAL.match(local)


def decode_cf(hexstr: str) -> str:
    key = int(hexstr[:2], 16)
    return "".join(chr(int(hexstr[i:i + 2], 16) ^ key) for i in range(2, len(hexstr), 2))


def deobfuscate(text: str) -> str:
    text = re.sub(r"\s*[\[({]\s*(?:at|@)\s*[\])}]\s*", "@", text, flags=re.I)
    return re.sub(r"\s*[\[({]\s*(?:dot|punkt|point|punto)\s*[\])}]\s*", ".", text, flags=re.I)


def emails_in(html: str, text: str) -> list[str]:
    found = [decode_cf(h) for h in re.findall(r'data-cfemail="([0-9a-fA-F]+)"', html)]
    found += re.findall(r"mailto:([^\"'?>\s]+)", html, flags=re.I)
    found += EMAIL_RE.findall(html) + EMAIL_RE.findall(deobfuscate(text))
    seen: list[str] = []
    for e in (x.strip().lower().strip(".-_") for x in found):
        if EMAIL_RE.fullmatch(e) and usable(e) and e not in seen:
            seen.append(e)
    return seen


async def render(url: str) -> list[dict]:
    """The homepage and up to three of its own contact/imprint pages, rendered."""
    pages: list[dict] = []
    async with async_playwright() as p:
        # CHROMIUM_PATH: use an existing Chromium (local testing); the Docker
        # image installs Playwright's own and leaves it unset.
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
            executable_path=os.environ.get("CHROMIUM_PATH") or None,
        )
        try:
            page = await browser.new_page(user_agent="Mozilla/5.0 (compatible; TagettBot/1.0; +https://ecstasytechnologies.com)")

            # Every request the page makes, redirects included, is checked again.
            async def guard(route):
                if allowed(route.request.url):
                    await route.continue_()
                else:
                    await route.abort()

            await page.route("**/*", guard)

            async def grab(target: str) -> dict | None:
                try:
                    await page.goto(target, wait_until="domcontentloaded", timeout=20000)
                    await page.wait_for_timeout(1500)  # let scripts fill in the contact details
                    return {"url": page.url, "html": await page.content(), "text": await page.inner_text("body")}
                except Exception:
                    return None

            home = await grab(url)
            if not home:
                return pages
            pages.append(home)
            host = urlparse(home["url"]).hostname or ""
            links = await page.eval_on_selector_all(
                "a[href]", "els => els.map(a => [a.getAttribute('href'), a.innerText || ''])"
            )
            ranked: list[tuple[int, str]] = []
            for href, label in links:
                if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
                    continue
                if not (CONTACT_WORDS.search(href) or CONTACT_WORDS.search(label)):
                    continue
                full = urljoin(home["url"], href).split("#")[0]
                if (urlparse(full).hostname or "").removeprefix("www.") != host.removeprefix("www."):
                    continue
                both = href + " " + label
                rank = 0 if re.search(r"impressum|imprint|mentions|legal", both, re.I) else 1 if re.search(r"contact|kontakt|contacto|contatti|contato", both, re.I) else 2
                if full != home["url"] and full not in [u for _, u in ranked]:
                    ranked.append((rank, full))
            for _, link in sorted(ranked)[:MAX_EXTRA_PAGES]:
                extra = await grab(link)
                if extra:
                    pages.append(extra)
        finally:
            await browser.close()
    return pages


def ask_llm(content: str) -> dict:
    provider = MODEL.split("/", 1)[0]
    key = os.environ.get(PROVIDER_KEYS.get(provider, ""), "").strip()
    if not key:
        raise RuntimeError(f"{PROVIDER_KEYS.get(provider, 'API key')} not set")
    from scrapegraphai.graphs import SmartScraperGraph

    graph = SmartScraperGraph(
        prompt=(
            "From this small business's website, return JSON with: emails (the business's own contact "
            "email addresses, exactly as written on the page), phones, contact_name (owner or contact "
            "person if named, else null), summary (one sentence: what the business does and where). "
            "Only use what is on the page; never guess an address."
        ),
        source=content,
        config={"llm": {"model": MODEL, "api_key": key, "model_tokens": MODEL_TOKENS, "temperature": 0}, "verbose": False, "headless": True},
    )
    result = graph.run()
    return result if isinstance(result, dict) else {}


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": MODEL}


@app.post("/extract")
async def extract(req: ExtractRequest, x_scraper_secret: str = Header(default="")) -> dict:
    if not SECRET:
        raise HTTPException(500, "SCRAPER_SECRET not set on the scraper service")
    if x_scraper_secret != SECRET:
        raise HTTPException(401, "wrong scraper secret")
    url = req.url if req.url.startswith("http") else f"https://{req.url}"
    if not allowed(url):
        raise HTTPException(400, "only public http(s) websites can be read")

    pages = await render(url)
    if not pages:
        return {"ok": False, "error": "the website did not load", "emails": [], "phones": []}

    html = "\n".join(p["html"] for p in pages)
    text = "\n\n".join(f"--- {p['url']}\n{p['text']}" for p in pages)
    corpus = deobfuscate(html + "\n" + text).lower()
    emails = emails_in(html, text)

    answer: dict = {}
    llm_error = None
    try:
        answer = await asyncio.to_thread(ask_llm, text[:MAX_CHARS])
    except Exception as err:  # the pages were still read; the regex result stands
        llm_error = str(err)[:200]

    # Keep only addresses that are really on the pages.
    for e in answer.get("emails") or []:
        e = str(e).strip().lower()
        if EMAIL_RE.fullmatch(e) and usable(e) and e in corpus and e not in emails:
            emails.append(e)

    phones = [str(p) for p in (answer.get("phones") or []) if p][:3]
    return {
        "ok": True,
        "emails": emails[:5],
        "phones": phones,
        "contact_name": answer.get("contact_name") or None,
        "summary": answer.get("summary") or None,
        "pages": [p["url"] for p in pages],
        "llm_error": llm_error,
    }
