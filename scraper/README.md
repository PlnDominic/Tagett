# Tagett website scraper (ScrapeGraphAI)

A small service that reads a business's website with a real browser and
[ScrapeGraphAI](https://github.com/ScrapeGraphAI/Scrapegraph-ai), for
Tagett's **Find Email**. It lives outside the main app because Vercel
can't run a browser.

For a website URL it:

1. opens the homepage in headless Chromium (so pages built with JavaScript work);
2. follows up to 3 of the site's own contact / Impressum / legal pages;
3. reads every address on them (plain, mailto, "info [at] shop [dot] de", Cloudflare-protected);
4. asks ScrapeGraphAI (using your Groq key) for the emails, phone, contact
   person and a one-line summary, keeping only emails that are really on the pages.

## Deploy on Render (free)

1. Sign up at **render.com** with your GitHub account.
2. **New → Blueprint**, pick the **Tagett** repository. Render finds
   `render.yaml` and creates the **tagett-scraper** web service on the free plan.
3. When asked for **GROQ_API_KEY**, paste the same Groq key Tagett uses
   (Groq console → API Keys). `SCRAPER_SECRET` is generated for you.
4. Wait for the first deploy (a few minutes: it installs Chromium). Open the
   service's URL + `/health`; it should show `{"ok":true,...}`.
5. In the service's **Environment** tab, copy the generated **SCRAPER_SECRET** value.

## Connect it to Tagett (Vercel)

In Vercel → tagett → Settings → Environment Variables, add (Production):

| Name | Value |
|---|---|
| `SCRAPEGRAPH_URL` | the Render service URL, e.g. `https://tagett-scraper.onrender.com` |
| `SCRAPEGRAPH_SECRET` | the `SCRAPER_SECRET` value from Render |

Then redeploy. Data Quality → Find Emails shows "Website scraper ready" once it answers.

## Notes

- **Free plan sleeps** after about 15 minutes idle; the first request then takes
  up to a minute. Opening Data Quality wakes it. To keep it awake, a free pinger
  such as cron-job.org can call `/health` every 10 minutes (the free plan's
  monthly hours cover one always-on service).
- **Other AI providers:** set `SCRAPER_MODEL` (e.g. `google_genai/gemini-2.5-flash`,
  which also needs `GEMINI_API_KEY` and the `langchain-google-genai` package).
- **Versions are pinned** in `requirements.txt`: scrapegraphai 1.76 breaks with
  langchain-community 0.4.2, so it stays on 0.4.1.

## Run locally

```bash
cd scraper
pip install -r requirements.txt && python -m playwright install chromium
SCRAPER_SECRET=dev GROQ_API_KEY=... uvicorn app:app --port 8000
curl -X POST localhost:8000/extract -H 'X-Scraper-Secret: dev' -H 'content-type: application/json' -d '{"url":"https://example.com"}'
```
