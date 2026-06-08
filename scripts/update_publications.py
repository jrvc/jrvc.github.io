import feedparser
import json
import os
import re
from html import unescape
from bs4 import BeautifulSoup

RSS_URL = "https://researchportal.helsinki.fi/en/persons/raul-vazquez/publications/?format=rss"
BASE_URL = "https://researchportal.helsinki.fi"

MY_ALIASES = ["Vazquez", "Vázquez"]

def highlight_author(name):
    """
    Highlight your name when it appears.
    """
    if any(alias.lower() in name.lower() for alias in MY_ALIASES):
        name = "Vázquez, Raúl"
        return f"<strong>{name}</strong>"
    return name
    
def extract_authors_and_venue(entry):
    """
    Extract authors from RSS description HTML.
    """
    raw_html = (
        entry.get("description_detail", {}).get("value")
        or entry.get("description")
        or ""
    )

    html = unescape(raw_html)
    soup = BeautifulSoup(html, "html.parser")

    authors = []

    for a in soup.find_all("a", attrs={"rel": "person"}):
        name = a.get_text(strip=True)
        if name:
            authors.append(name)

    authors = [highlight_author(a) for a in authors]

    b = soup.find("em")
    if b:
        name = b.get_text(strip=True)
        venue = name
    else:
        venue = ""
    return authors, venue


def extract_year(entry):
    """
    Prefer dc:date, fallback to pubDate.
    """
    date_str = entry.get("dc:date") or entry.get("published") or entry.get("pubDate") or ""
    match = re.search(r"\d{4}", date_str)
    return int(match.group()) if match else None


def main():
    feed = feedparser.parse(RSS_URL)
    publications = []

    for entry in feed.entries:
        link = entry.get("link", "#")
        if link and not link.startswith("http"):
            link = BASE_URL + link

        description = entry.get("description", "")
        authors, venue = extract_authors_and_venue(entry)
        
        pub = {
            "year": extract_year(entry),
            "title": entry.get("title", "Untitled").strip(),
            "authors": authors,
            "journal": venue,
            "link": link
        }

        publications.append(pub)

    # Sort safely (None years go last)
    publications.sort(key=lambda x: x["year"] or 0, reverse=True)

    os.makedirs("assets/data", exist_ok=True)

    with open("assets/data/publications.json", "w", encoding="utf-8") as f:
        json.dump(publications, f, indent=2, ensure_ascii=False)

    print(f"Successfully updated {len(publications)} publications.")


if __name__ == "__main__":
    main()
