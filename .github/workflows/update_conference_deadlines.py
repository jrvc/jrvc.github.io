name: Update Conference Deadlines

permissions:
  contents: write
  
on:
  schedule:
    # Runs at 00:00 UTC on the 1st of every month
    - cron: '0 0 1 * *'
  workflow_dispatch: # Allows you to run it manually from the "Actions" tab

jobs:
  update-deadlines:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: pip install requests python-dateutil playwright
      
      - name: Playwright
        run: playwright install
        
      - name: Run update script
        run: python scripts/update_deadlines.py

      - name: Commit and push if changed
        run: |
          git config --global user.name 'github-actions[bot]'
          git config --global user.email 'github-actions[bot]@users.noreply.github.com'
          git add assets/data/publications.json
          git diff --quiet && git diff --staged --quiet || (git commit -m "chore: auto-update conference deadlines from website" && git push)
