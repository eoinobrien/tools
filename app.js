const app = document.querySelector("#app");
const sectionTemplate = document.querySelector("#section-template");
let calendarDownloadUrl = "";
const textEncoder = new TextEncoder();

const DEFAULT_EVENT_DURATION_MINUTES = 60;
const FESTIVAL_TIME_ZONE = "Europe/Dublin";

const setCalendarDownloadUrl = (nextUrl) => {
  if (calendarDownloadUrl) {
    URL.revokeObjectURL(calendarDownloadUrl);
  }

  calendarDownloadUrl = nextUrl;
};

const escapeIcsText = (value = "") =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

const foldIcsLine = (line = "") => {
  if (textEncoder.encode(line).length <= 75) {
    return line;
  }

  const chunks = [];
  let chunk = "";
  let chunkLength = 0;

  for (const character of line) {
    const characterLength = textEncoder.encode(character).length;
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

const createCalendarHref = (festival, schedule = []) => {
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
          `DTSTAMP:${formatUtcStamp(new Date())}`,
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
    return "";
  }

  const calendar = [
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

  return URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
};

const createSection = (title, content) => {
  const section = sectionTemplate.content.firstElementChild.cloneNode(true);
  section.querySelector("h2").textContent = title;
  section.querySelector(".section-body").append(content);
  return section;
};

const createList = (items, renderItem) => {
  const list = document.createElement("ul");
  list.className = "list";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.append(renderItem(item));
    list.append(li);
  });

  return list;
};

const createParagraph = (text, className = "") => {
  const p = document.createElement("p");
  p.textContent = text;
  if (className) {
    p.className = className;
  }
  return p;
};

const createBulletList = (items = []) => createList(items, (item) => createParagraph(item));

const createLink = (label, url) => {
  const a = document.createElement("a");
  a.href = url;
  a.textContent = label;
  a.target = "_blank";
  a.rel = "noreferrer";
  return a;
};

const createDownloadLink = (label, url, fileName) => {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = label;
  link.download = fileName;
  link.className = "button-link";
  return link;
};

const createLabeledList = (items = []) =>
  createList(items, (item) => {
    const wrapper = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.label;
    wrapper.append(title, createParagraph(item.text, "muted"));
    return wrapper;
  });

const renderHero = (festival) => {
  const hero = document.createElement("section");
  hero.className = "hero";

  const content = document.createElement("div");
  content.className = "hero-content";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Festival information";
  content.append(eyebrow);

  const title = document.createElement("h1");
  title.textContent = festival.name;
  content.append(title);

  if (festival.tagline) {
    content.append(createParagraph(festival.tagline));
  }

  const meta = document.createElement("div");
  meta.className = "meta";

  [festival.dates?.displayText, [festival.location?.venue, festival.location?.city, festival.location?.country].filter(Boolean).join(", ")]
    .filter(Boolean)
    .forEach((text) => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = text;
      meta.append(pill);
    });

  if (meta.children.length) {
    content.append(meta);
  }

  content.append(createParagraph(festival.description));

  if (festival.websiteUrl) {
    const linksRow = document.createElement("div");
    linksRow.className = "row";
    linksRow.append(createLink("Official website", festival.websiteUrl));
    content.append(linksRow);
  }

  hero.append(content);
  return hero;
};

const renderHighlights = (festival) => {
  if (!festival.highlights?.length) {
    return null;
  }

  return createSection("Highlights", createBulletList(festival.highlights));
};

const renderSchedule = (schedule = []) => {
  if (!schedule.length) {
    return null;
  }

  return createSection(
    "Schedule",
    createList(schedule, (day) => {
      const wrapper = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = day.label;
      wrapper.append(title);

      if (day.theme) {
        wrapper.append(createParagraph(day.theme, "muted"));
      }

      if (day.gatesOpen) {
        wrapper.append(createParagraph(`Gates open: ${day.gatesOpen}`));
      }

      if (day.notes?.length) {
        wrapper.append(createBulletList(day.notes));
      }

      wrapper.append(
        createList(day.entries || [], (entry) => {
          const entryWrap = document.createElement("div");
          const strong = document.createElement("strong");
          strong.textContent = `${entry.time} — ${entry.artist}`;
          entryWrap.append(strong, createParagraph(entry.stage, "muted"));
          return entryWrap;
        })
      );

      return wrapper;
    })
  );
};

const renderWellness = (wellnessArea) => {
  if (!wellnessArea) {
    return null;
  }

  const wrapper = document.createElement("div");

  if (wellnessArea.name) {
    const title = document.createElement("h3");
    title.textContent = wellnessArea.name;
    wrapper.append(title);
  }

  if (wellnessArea.hours) {
    wrapper.append(createParagraph(wellnessArea.hours, "muted"));
  }

  if (wellnessArea.activities?.length) {
    wrapper.append(createBulletList(wellnessArea.activities));
  }

  if (wellnessArea.notes) {
    wrapper.append(createParagraph(wellnessArea.notes));
  }

  return createSection("Wellness area", wrapper);
};

const renderSimpleTextSection = (title, values = []) => {
  const filteredValues = values.filter(Boolean);
  if (!filteredValues.length) {
    return null;
  }

  const wrapper = document.createElement("div");
  filteredValues.forEach((value) => wrapper.append(createParagraph(value)));
  return createSection(title, wrapper);
};

const renderAgeRestrictions = (ageRestrictions) => {
  if (!ageRestrictions?.days?.length && !ageRestrictions?.exceptions) {
    return null;
  }

  const wrapper = document.createElement("div");

  if (ageRestrictions.days?.length) {
    wrapper.append(createLabeledList(ageRestrictions.days));
  }

  if (ageRestrictions.exceptions) {
    wrapper.append(createParagraph(ageRestrictions.exceptions));
  }

  return createSection("Age restrictions", wrapper);
};

const renderPayments = (paymentsOnSite) => {
  if (!paymentsOnSite?.acceptedMethods?.length) {
    return null;
  }

  return createSection(
    "Payments on site",
    createParagraph(paymentsOnSite.acceptedMethods.join(" • "))
  );
};

const renderTicketsAndEntry = (ticketsAndEntry) => {
  if (!ticketsAndEntry) {
    return null;
  }

  return renderSimpleTextSection("Tickets & entry", [
    ticketsAndEntry.refundPolicy,
    ticketsAndEntry.resale,
    ticketsAndEntry.entryRules
  ]);
};

const renderParking = (parking) => {
  if (!parking) {
    return null;
  }

  return renderSimpleTextSection("Parking", [
    parking.general,
    parking.raheenCollege,
    parking.accessibilityParking
  ]);
};

const renderTransport = (transportation) => {
  if (!transportation?.taxis && !transportation?.buses) {
    return null;
  }

  const wrapper = document.createElement("div");

  if (transportation.taxis) {
    const title = document.createElement("h3");
    title.textContent = "Taxis";
    wrapper.append(title);

    if (transportation.taxis.note) {
      wrapper.append(createParagraph(transportation.taxis.note));
    }

    if (transportation.taxis.contacts?.length) {
      wrapper.append(createLabeledList(transportation.taxis.contacts));
    }
  }

  if (transportation.buses) {
    const title = document.createElement("h3");
    title.textContent = "Buses";
    wrapper.append(title);

    [
      transportation.buses.provider,
      transportation.buses.operatingHours
    ]
      .filter(Boolean)
      .forEach((value, index) => wrapper.append(createParagraph(value, index === 0 ? "muted" : "")));

    if (transportation.buses.routes?.length) {
      wrapper.append(createParagraph(`Routes: ${transportation.buses.routes.join(", ")}`));
    }

    if (transportation.buses.closestStops?.length) {
      wrapper.append(createParagraph(`Closest stops: ${transportation.buses.closestStops.join(" • ")}`));
    }

    if (transportation.buses.lastServices?.length) {
      wrapper.append(createLabeledList(transportation.buses.lastServices));
    }
  }

  return createSection("Getting home", wrapper);
};

const renderRules = (rulesAndConduct = []) => {
  if (!rulesAndConduct.length) {
    return null;
  }

  return createSection("Rules & conduct", createBulletList(rulesAndConduct));
};

const renderContact = (contact = {}, links = []) => {
  if (!contact.email && !links.length) {
    return null;
  }

  const wrapper = document.createElement("div");
  const list = document.createElement("ul");
  list.className = "list";

  if (contact.email) {
    const li = document.createElement("li");
    li.className = "list-item";
    li.append(createLink(contact.email, `mailto:${contact.email}`));
    list.append(li);
  }

  links.forEach((link) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.append(createLink(link.label, link.url));
    list.append(li);
  });

  wrapper.append(list);
  return createSection("Contact & links", wrapper);
};

const renderApp = (data) => {
  app.innerHTML = "";
  setCalendarDownloadUrl("");
  const calendarHref = createCalendarHref(data.festival, data.schedule);
  setCalendarDownloadUrl(calendarHref);

  const hero = renderHero(data.festival);
  const heroLinks = hero.querySelector(".row");
  if (calendarHref) {
    const linksRow = heroLinks || document.createElement("div");
    linksRow.className = "row";
    linksRow.append(
      createDownloadLink(
        "Add schedule to calendar (.ics)",
        calendarHref,
        `${slugify(data.festival.name)}-schedule.ics`
      )
    );

    if (!heroLinks) {
      hero.querySelector(".hero-content").append(linksRow);
    }
  }

  app.append(hero);

  const grid = document.createElement("div");
  grid.className = "grid";

  [
    renderHighlights(data.festival),
    renderSchedule(data.schedule),
    renderWellness(data.wellnessArea),
    renderSimpleTextSection("Weather & gear", data.weatherAndGear?.recommendations),
    renderSimpleTextSection("Seating & accessibility", [
      data.seatingAndAccessibility?.restrictions,
      data.seatingAndAccessibility?.amenities,
      data.seatingAndAccessibility?.accessibilityAccommodations
    ]),
    renderAgeRestrictions(data.ageRestrictions),
    renderPayments(data.paymentsOnSite),
    renderTicketsAndEntry(data.ticketsAndEntry),
    renderParking(data.parking),
    renderTransport(data.transportation),
    renderRules(data.rulesAndConduct),
    renderContact(data.contact, data.links)
  ]
    .filter(Boolean)
    .forEach((section) => grid.append(section));

  app.append(grid);
};

const renderError = (message) => {
  app.innerHTML = "";
  const error = document.createElement("p");
  error.className = "error";
  error.textContent = message;
  app.append(error);
};

fetch("./festival.sample.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  })
  .then((data) => {
    if (!data?.festival?.name) {
      throw new Error("Festival data is missing required fields.");
    }

    renderApp(data);
  })
  .catch((error) => {
    console.error(error);
    renderError("Unable to load festival details right now.");
  });
