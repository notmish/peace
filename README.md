# Peace SMP website

Static site (`index.html`, `style.css`, `script.js`) + Python serverless API (`api/`) for Vercel.
Gallery pictures are committed to the repo's `gallery/` folder through the GitHub API.

## Setup
1. Push this folder to a **public** GitHub repo (keep the `gallery/` folder).
2. Create a GitHub fine-grained token: only this repo, permission **Contents: Read and write**.
3. Run `python hash_pin.py` to make hashed PINs (or reuse the values you were given).
4. Import the repo in Vercel and add these Environment Variables:
   `GITHUB_TOKEN`, `GITHUB_REPO` (e.g. `yourname/peace-smp`), `GITHUB_BRANCH` (optional, default `main`),
   `UPLOAD_CODE_HASH`, `ADMIN_CODE_HASH`, `TOKEN_SECRET`.
5. Deploy. Every upload/removal makes a commit, which also triggers a redeploy (that's normal).

Never commit the token or hashes. PINs are checked only on the server, so they can't be found by inspecting the page.
## Credit
Ashik (Meshur Abba)
