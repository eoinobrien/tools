#!/usr/bin/env node
// Reads festival.sample.json and writes schedule.ics to the repository root.
// Run with: node generate-ics.js

const fs = require("fs");
const path = require("path");

const DEFAULT_EVENT_DURATION_MINUTES = 60;
const FESTIVAL_TIME_ZONE = "Europe/Dublin";

const escapeIcsText = (value = "") =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

const foldIcsLine = (line = "") => {
  if (Buffer.byteLength(line, "utf8") <= 75) {
    return line;
  }

  const chunks = [];
  let chunk = "";
  let chunkLength = 0;

  for (const character of line) {
    const characterLength = Buffer.byteLength(character, "utf8");
    const nextLength = chunkLength + characterLength;

    if (nextLength > 75) {
      chunks.push(chunk);
      chunk = ` ${character}`;
      chunkLength = 1 + characterLength;
      continue;
    }

    chunk += character;
    chunkLength = nextLength;
  }

  if (chunk) {
    chunks.push(chunk);
  }

  return chunks.join("\r\n");
};

const formatDateTimeParts = (value) => {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  const seconds = String(value.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
};

const formatIcsDateTime = (value) => formatDateTimeParts(value);
const formatUtcStamp = (value) => `${formatDateTimeParts(value)}Z`;

const parseTimeToMinutes = (time) => {
  const match = time?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  if (meridiem === "PM" && hours !== 12) {
    hours += 12;
  }

  return hours * 60 + minutes;
};

const createFestivalDateTime = (date, totalMinutes) => {
  if (!date || !Number.isFinite(totalMinutes)) {
    return null;
  }

  const value = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(value.valueOf())) {
    return null;
  }

  value.setUTCMinutes(value.getUTCMinutes() + totalMinutes, 0, 0);
  return value;
};

const slugify = (value) =>
  (value ?? "festival-schedule")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getCalendarUidHost = (festival) => {
  if (!festival.websiteUrl) {
    return "festival.invalid";
  }

  try {
    return new URL(festival.websiteUrl).hostname || "festival.invalid";
  } catch {
    return "festival.invalid";
  }
};

const generateCalendar = (festival, schedule = [], stamp) => {
  const uidHost = getCalendarUidHost(festival);
  const events = schedule.flatMap((day) => {
    const datedEntries = (day.entries || [])
      .map((entry) => ({
        ...entry,
        startsAtMinutes: parseTimeToMinutes(entry.time)
      }))
      .filter((entry) => Number.isFinite(entry.startsAtMinutes))
      .sort((left, right) => left.startsAtMinutes - right.startsAtMinutes);
    const nextLaterByStart = new Map();
    let lastSeenStart = null;

    for (let index = datedEntries.length - 1; index >= 0; index -= 1) {
      const { startsAtMinutes } = datedEntries[index];

      if (!nextLaterByStart.has(startsAtMinutes)) {
        nextLaterByStart.set(startsAtMinutes, lastSeenStart);
      }

      if (startsAtMinutes !== lastSeenStart) {
        lastSeenStart = startsAtMinutes;
      }
    }

    return datedEntries
      .map((entry, index) => {
        const nextStartMinutes = nextLaterByStart.get(entry.startsAtMinutes);
        const startsAt = createFestivalDateTime(day.date, entry.startsAtMinutes);
        const endMinutes = Number.isFinite(nextStartMinutes)
          ? nextStartMinutes
          : entry.startsAtMinutes + DEFAULT_EVENT_DURATION_MINUTES;
        const endsAt = createFestivalDateTime(day.date, endMinutes);

        if (!startsAt || !endsAt) {
          return "";
        }

        const location = [entry.stage, festival.location?.venue, festival.location?.city, festival.location?.country]
          .filter(Boolean)
          .join(", ");
        const description = [
          festival.description,
          day.theme ? `Theme: ${day.theme}` : "",
          day.notes?.length ? `Notes: ${day.notes.join(" ")}` : ""
        ]
          .filter(Boolean)
          .join("\n");
        const uid = `${slugify(festival.name)}-${day.date}-${entry.startsAtMinutes}-${index}-${slugify(entry.stage)}-${slugify(entry.artist)}@${uidHost}`;

        return [
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${formatUtcStamp(stamp)}`,
          foldIcsLine(`SUMMARY:${escapeIcsText(entry.artist)}`),
          foldIcsLine(`DTSTART;TZID=${FESTIVAL_TIME_ZONE}:${formatIcsDateTime(startsAt)}`),
          foldIcsLine(`DTEND;TZID=${FESTIVAL_TIME_ZONE}:${formatIcsDateTime(endsAt)}`),
          foldIcsLine(`LOCATION:${escapeIcsText(location)}`),
          foldIcsLine(`DESCRIPTION:${escapeIcsText(description)}`),
          festival.websiteUrl ? foldIcsLine(`URL:${escapeIcsText(festival.websiteUrl)}`) : "",
          "END:VEVENT"
        ]
          .filter(Boolean)
          .join("\r\n");
      })
      .filter(Boolean);
  });

  if (!events.length) {
    return null;
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//eoinobrien//Festival Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldIcsLine(`X-WR-CALNAME:${escapeIcsText(`${festival.name} schedule`)}`),
    `X-WR-TIMEZONE:${FESTIVAL_TIME_ZONE}`,
    ...events,
    "END:VCALENDAR"
  ].join("\r\n");
};

const dataPath = path.join(__dirname, "festival.sample.json");
const outPath = path.join(__dirname, "schedule.ics");

let data;
try {
  data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
} catch (err) {
  console.error(`Failed to read ${dataPath}:`, err.message);
  process.exit(1);
}

if (!data?.festival?.name) {
  console.error("festival.sample.json is missing required festival.name field.");
  process.exit(1);
}

const calendar = generateCalendar(data.festival, data.schedule || [], new Date());

if (!calendar) {
  console.error("No schedule entries found — schedule.ics was not written.");
  process.exit(1);
}

fs.writeFileSync(outPath, calendar, "utf8");
console.log(`Written: ${outPath}`);
