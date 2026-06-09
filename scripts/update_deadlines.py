import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
from dateutil import parser

URL = "https://www.conferencedeadlines.com/cs"

html = requests.get(URL, timeout=10).text
soup = BeautifulSoup(html, "html.parser")

target_conferences = {
    "ACL": "The Association for Computational Linguistics",
    "AAAI": "AAAI Conference on Artificial Intelligence",
    "ICML": "International Conference on Machine Learning",
    "KDD": "ACM Conference on Knowledge Discovery and Data Mining",
    "ECCV": "European Conference on Computer Vision",
    "COLM": "Conference on Language Modeling",
    "EMNLP": "Conference on Empirical Methods in Natural Language Processing",
    "NeurIPS": "Conference on Neural Information Processing Systems",
    "WACV": "IEEE/CVF Winter Conference on Applications of Computer Vision",
    "EACL": "Conference of the European Chapter of the Association for Computational Linguistics",
    "ICLR": "International Conference on Learning Representations",
    "CHI": "ACM Conference on Human Factors in Computing Systems",
    "CVPR": "Conference on Computer Vision and Pattern Recognition",
    "ICCV": "International Conference on Computer Vision"
}

from playwright.sync_api import sync_playwright
import re
import json


URL = "https://www.conferencedeadlines.com/cs"


def extract_deadline(text):
    """
    Extract ISO-like or date-like patterns from messy text
    """
    patterns = [
        r"\b20\d{2}-\d{2}-\d{2}\b",      # 2026-09-24
        r"\b\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}\b",  # 24 September 2026
        r"\b[A-Za-z]{3,9}\s+\d{1,2},\s+20\d{2}\b"  # September 24, 2026
    ]

    for p in patterns:
        m = re.search(p, text)
        if m:
            return m.group(0)

    return None


def guess_name(text):
    """
    Try to extract conference name (usually first meaningful line)
    """
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    if not lines:
        return None

    # skip junk lines
    blacklist = ["deadline", "conference", "2026", "submit", "camera ready"]

    for line in lines:
        if not any(b.lower() in line.lower() for b in blacklist):
            return line

    return lines[0]


def is_relevant(text):
    """
    Filter out non-conference UI noise
    """
    if len(text) < 15:
        return False

    keywords = target_conferences.keys()

    return any(k.lower() in text.lower() for k in keywords)

def parse_date(d):
    try:
        return parser.parse(d)
    except:
        return None
        
def main():
    data = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Loading page...")
        page.goto(URL, wait_until="load", timeout=60000)

        # wait extra for React hydration
        page.wait_for_timeout(5000)

        print("Extracting DOM text...")

        # grab all visible text blocks
        elements = page.locator("div, li, article, section")

        count = elements.count()
        seen = set()

        for i in range(count):
            try:
                text = elements.nth(i).inner_text().strip()
            except:
                continue

            if not is_relevant(text):
                continue

            key = hash(text)
            if key in seen:
                continue
            seen.add(key)

            name = guess_name(text)
            deadline = extract_deadline(text)
             

            if not name or not deadline:
                continue

            if any(k.lower() in name.lower() for k in target_conferences.keys()):
                data.append({
                    "name": name,
                    "deadline": deadline,
                    "raw": text
                })

        browser.close()

    final = {}
    for d in data:
        if d["name"] not in final:
            final[d["name"]] = d

    output = list(final.values())

    # --- PARSE DATES ---
    cleaned = []
    for c in output:
        dt = parse_date(c["deadline"])
        if dt:
            c["date_obj"] = dt
            cleaned.append(c)
    cleaned.sort(key=lambda x: x["date_obj"])

    now = datetime.now()

    past = [c for c in cleaned if c["date_obj"] < now]
    future = [c for c in cleaned if c["date_obj"] >= now]
    last_past = past[-3:] if len(past) >= 3 else past
    final_output = last_past + future

    # remove helper field
    for c in final_output:
        c.pop("date_obj", None)

    with open("assets/data/conference_deadlines.json", "w") as f:
        json.dump(final_output, f, indent=2)

    print(f"Saved {len(final_output)} conferences")


if __name__ == "__main__":
    main()
