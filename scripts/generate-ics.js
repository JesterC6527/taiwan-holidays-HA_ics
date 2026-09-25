const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "public");
const OUTPUT = path.join(OUTPUT_DIR, "taiwan-holidays.ics");

function escapeICS(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function parseDate(date) {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

function nextDate(date) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);

  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function loadHolidayFiles() {
  const dataDir = path.join(ROOT, "data");

  const years = fs
    .readdirSync(dataDir)
    .filter((name) => /^\d{4}$/.test(name))
    .sort();

  const holidays = [];

  for (const year of years) {
    const file = path.join(dataDir, year, "holidays.json");

    if (!fs.existsSync(file)) {
      continue;
    }

    const data = JSON.parse(fs.readFileSync(file, "utf8"));

    for (const item of data) {
      if (item.isHoliday !== true) {
        continue;
      }

      holidays.push({
        date: parseDate(item.date),
        description: item.description || "國定假日",
      });
    }
  }

  return holidays;
}

function generateICS(events) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Taiwan Holidays//Home Assistant//ZH-TW",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:台灣國定假日",
    "X-WR-TIMEZONE:Asia/Taipei",
  ];

  for (const event of events) {
    const date = event.date.replace(/-/g, "");
    const endDate = nextDate(event.date).replace(/-/g, "");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${date}@taiwan-holidays`,
      `DTSTAMP:${date}T000000Z`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:${escapeICS(event.description)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}

const events = loadHolidayFiles();

events.sort((a, b) => a.date.localeCompare(b.date));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

fs.writeFileSync(
  OUTPUT,
  generateICS(events),
  "utf8"
);

const indexHTML = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>台灣國定假日 ICS</title>
</head>
<body>
  <h1>台灣國定假日</h1>
  <p>
    Home Assistant Remote Calendar 使用的 ICS 日曆。
  </p>
  <p>
    <a href="taiwan-holidays.ics">下載台灣國定假日 ICS</a>
  </p>
</body>
</html>
`;

fs.writeFileSync(
  path.join(OUTPUT_DIR, "index.html"),
  indexHTML,
  "utf8"
);

console.log(`Generated ${events.length} holiday events.`);
console.log(`Output: ${OUTPUT}`);
