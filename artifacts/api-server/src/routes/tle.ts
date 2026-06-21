import { Router } from "express";

const router = Router();

router.get("/tle/:noradId", async (req, res) => {
  const { noradId } = req.params;

  if (!noradId || !/^\d{1,6}$/.test(noradId)) {
    res.status(400).json({ error: "Invalid NORAD ID" });
    return;
  }

  const sources = [
    `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=TLE`,
    `https://tle.ivanstanojevic.me/api/tle/${noradId}`,
  ];

  let lastError = "";

  for (const url of sources) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "ISS-Tracker/1.0" },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status} from ${url}`;
        continue;
      }

      const text = await response.text();

      if (url.includes("ivanstanojevic")) {
        const json = JSON.parse(text) as { name?: string; line1?: string; line2?: string };
        if (json.line1 && json.line2) {
          res.json({ name: json.name ?? `SAT-${noradId}`, line1: json.line1, line2: json.line2 });
          return;
        }
        lastError = "ivanstanojevic: missing line1/line2";
        continue;
      }

      const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 3) {
        lastError = `Celestrak: only ${lines.length} lines`;
        continue;
      }

      res.json({
        name: lines[0].replace(/^0 /, "").trim(),
        line1: lines[1],
        line2: lines[2],
      });
      return;
    } catch (err) {
      lastError = String(err);
    }
  }

  res.status(502).json({ error: `Failed to fetch TLE: ${lastError}` });
});

export default router;
