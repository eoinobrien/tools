const app = document.querySelector("#app");
const sectionTemplate = document.querySelector("#section-template");

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
  app.append(renderHero(data.festival));

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
