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

const createLink = (label, url) => {
  const a = document.createElement("a");
  a.href = url;
  a.textContent = label;
  a.target = "_blank";
  a.rel = "noreferrer";
  return a;
};

const renderHero = (festival) => {
  const hero = document.createElement("section");
  hero.className = "hero";

  if (festival.heroImage?.url) {
    const image = document.createElement("img");
    image.className = "hero-image";
    image.src = festival.heroImage.url;
    image.alt = festival.heroImage.alt || festival.name;
    hero.append(image);
  }

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

  const dateLabel = festival.dates?.displayText || [festival.dates?.start, festival.dates?.end].filter(Boolean).join(" to ");
  if (dateLabel) {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = dateLabel;
    meta.append(pill);
  }

  const locationLabel = [festival.location?.venue, festival.location?.city, festival.location?.country].filter(Boolean).join(", ");
  if (locationLabel) {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = locationLabel;
    meta.append(pill);
  }

  if (festival.genres?.length) {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = festival.genres.join(" • ");
    meta.append(pill);
  }

  if (meta.children.length) {
    content.append(meta);
  }

  content.append(createParagraph(festival.description));

  const linksRow = document.createElement("div");
  linksRow.className = "row";

  if (festival.websiteUrl) {
    linksRow.append(createLink("Official website", festival.websiteUrl));
  }

  if (festival.location?.mapsUrl) {
    linksRow.append(createLink("View map", festival.location.mapsUrl));
  }

  if (linksRow.children.length) {
    content.append(linksRow);
  }

  hero.append(content);
  return hero;
};

const renderHighlights = (festival) => {
  if (!festival.highlights?.length) {
    return null;
  }

  return createSection(
    "Highlights",
    createList(festival.highlights, (item) => createParagraph(item))
  );
};

const renderTickets = (tickets = []) => {
  if (!tickets.length) {
    return null;
  }

  return createSection(
    "Tickets",
    createList(tickets, (ticket) => {
      const wrapper = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = `${ticket.name} · ${ticket.price}`;
      wrapper.append(title, createParagraph(ticket.description, "muted"));

      if (ticket.purchaseUrl) {
        wrapper.append(createLink("Buy ticket", ticket.purchaseUrl));
      }

      return wrapper;
    })
  );
};

const renderLineup = (lineup = []) => {
  if (!lineup.length) {
    return null;
  }

  return createSection(
    "Lineup",
    createList(lineup, (performer) => {
      const wrapper = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = performer.name;
      wrapper.append(title);

      if (performer.genre) {
        wrapper.append(createParagraph(performer.genre, "muted"));
      }

      if (performer.description) {
        wrapper.append(createParagraph(performer.description));
      }

      if (performer.websiteUrl) {
        wrapper.append(createLink("Artist site", performer.websiteUrl));
      }

      return wrapper;
    })
  );
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
      title.textContent = `${day.label} · ${day.date}`;
      wrapper.append(title);

      const entries = createList(day.entries || [], (entry) => {
        const entryWrap = document.createElement("div");
        const strong = document.createElement("strong");
        strong.textContent = `${entry.time} — ${entry.artist}`;
        entryWrap.append(strong, createParagraph(entry.stage, "muted"));
        if (entry.notes) {
          entryWrap.append(createParagraph(entry.notes));
        }
        return entryWrap;
      });

      wrapper.append(entries);
      return wrapper;
    })
  );
};

const renderFaq = (faq = []) => {
  if (!faq.length) {
    return null;
  }

  return createSection(
    "FAQ",
    createList(faq, (item) => {
      const wrapper = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = item.question;
      wrapper.append(title, createParagraph(item.answer));
      return wrapper;
    })
  );
};

const renderContact = (contact = {}, links = []) => {
  if (!Object.keys(contact).length && !links.length) {
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

  if (contact.phone) {
    const li = document.createElement("li");
    li.className = "list-item";
    li.textContent = contact.phone;
    list.append(li);
  }

  ["instagram", "facebook"].forEach((key) => {
    if (contact[key]) {
      const li = document.createElement("li");
      li.className = "list-item";
      li.append(createLink(key[0].toUpperCase() + key.slice(1), contact[key]));
      list.append(li);
    }
  });

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

  const festival = data.festival;
  app.append(renderHero(festival));

  const grid = document.createElement("div");
  grid.className = "grid";

  [
    renderHighlights(festival),
    renderTickets(data.tickets),
    renderLineup(data.lineup),
    renderSchedule(data.schedule),
    renderFaq(data.faq),
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

fetch("/festival.sample.json")
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
