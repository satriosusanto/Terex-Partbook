(() => {
  const page = document.body;
  const header = document.querySelector("header");
  const sidebar = document.querySelector("aside");
  if (!header || !sidebar) return;

  page.classList.add("catalog-ui");
  sidebar.classList.add("catalog-sidebar");
  header.classList.add("topbar");

  const segments = location.pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "";
  const slug = (lastSegment.toLowerCase() === "index.html" ? segments[segments.length - 2] : lastSegment) || "";
  const modelCode = slug.replace(/^(?:terex|franna)-/i, "").toUpperCase();
  page.classList.add("ui-model-" + slug.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  const model = `${slug.toLowerCase().startsWith("franna-") ? "FRANNA" : "TEREX"} ${modelCode}`;
  const first = header.firstElementChild;
  let brand = first?.classList.contains("brand") ? first : header.querySelector(".brand");
  if (!brand && first && first.tagName !== "INPUT" && !first.matches(".search, .tools")) {
    brand = first;
    brand.classList.add("brand");
    const badge = document.createElement("span");
    badge.className = "logo";
    badge.textContent = modelCode;
    const brandText = document.createElement("div");
    brandText.className = "brandText";
    while (brand.firstChild) brandText.append(brand.firstChild);
    brand.append(badge, brandText);
  } else if (!brand) {
    brand = document.createElement("div");
    brand.className = "brand";
    const badge = document.createElement("span");
    badge.className = "logo";
    badge.textContent = modelCode;
    const label = document.createElement("div");
    label.className = "brandText";
    label.innerHTML = `<strong>${model}</strong><small>Electronic Parts Catalogue</small>`;
    brand.append(badge, label);
    header.prepend(brand);
  }
  const logo = brand.querySelector(".logo, .mark");
  if (logo) {
    logo.classList.add("logo");
    if (logo.classList.contains("mark")) logo.textContent = modelCode;
  } else {
    const badge = document.createElement("span");
    badge.className = "logo";
    badge.textContent = modelCode;
    brand.prepend(badge);
  }

  const searchInput = header.querySelector("input");
  let search = searchInput?.closest(".search, .tools");
  if (!search && searchInput) {
    search = document.createElement("div");
    search.className = "search";
    const icon = document.createElement("span");
    icon.textContent = "⌕";
    searchInput.parentNode.insertBefore(search, searchInput);
    search.append(icon, searchInput);
  } else if (search) {
    search.classList.add("search");
    if (searchInput && !search.querySelector("span")) {
      const icon = document.createElement("span");
      icon.textContent = "⌕";
      search.prepend(icon);
    }
  }
  if (search && search.parentElement !== header) {
    const container = search.parentElement;
    header.insertBefore(search, container);
    if (container.classList.contains("toolbar") && !container.children.length) container.remove();
  }

  let actions = header.querySelector(".headerActions, .actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "headerActions";
    header.append(actions);
  } else {
    actions.classList.add("headerActions");
  }
  header.querySelectorAll("#themeBtn, #theme, #dark, #aboutBtn").forEach(button => {
    if (button.parentElement !== actions) actions.append(button);
    if (button.id !== "aboutBtn") button.classList.add("iconbtn");
  });
  const oldToolbar = header.querySelector(":scope > .toolbar");
  if (oldToolbar && !oldToolbar.children.length && !oldToolbar.textContent.trim()) oldToolbar.remove();

  const modelLink = document.createElement("a");
  modelLink.className = "modelLink";
  modelLink.href = "../../models.html";
  modelLink.textContent = "Pilih unit";
  modelLink.title = "Pilih model unit";
  actions.prepend(modelLink);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "catalogToggle";
  toggle.className = "catalogToggle";
  toggle.setAttribute("aria-label", "Open catalog menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "☰";
  actions.insertBefore(toggle, actions.querySelector("#themeBtn, #theme, #dark"));

  if (document.querySelector(".app .workspace .diagramCard")) page.classList.add("ui-ac40");
  else if (document.getElementById("diagramStage")) page.classList.add("ui-ac250");
  else if (document.getElementById("partRows")) page.classList.add("ui-ac100");
  else if (document.getElementById("canvasWrap")) page.classList.add("ui-ac200");
  else if (document.getElementById("stage")) page.classList.add("ui-ac200");
  else if (document.getElementById("diagram")) page.classList.add("ui-at15");
  else page.classList.add("ui-mac25");

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "sidebarBackdrop";
  backdrop.setAttribute("aria-label", "Close catalog menu");
  backdrop.hidden = true;
  document.body.append(backdrop);

  function setOpen(open) {
    page.classList.toggle("catalogs-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    backdrop.hidden = !open;
  }

  toggle.addEventListener("click", () => setOpen(!page.classList.contains("catalogs-open")));
  backdrop.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") setOpen(false);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 700) setOpen(false);
  });
  sidebar.addEventListener("click", event => {
    if (event.target.closest(".cat, .catalog-item")) setOpen(false);
  });

  function installHotspotPartPopup() {
    const dialog = document.createElement("div");
    dialog.className = "catalog-hotspot-dialog";
    dialog.hidden = true;
    dialog.innerHTML = `
      <section class="catalog-hotspot-card" role="dialog" aria-modal="true" aria-labelledby="catalog-hotspot-number">
        <button class="catalog-hotspot-close" type="button" aria-label="Close">×</button>
        <div class="catalog-hotspot-eyebrow">PART INFORMATION</div>
        <h2 id="catalog-hotspot-number"></h2>
        <p class="catalog-hotspot-description"></p>
        <div class="catalog-hotspot-meta"><span>Position</span><b class="catalog-hotspot-position"></b></div>
        <div class="catalog-hotspot-meta"><span>Quantity</span><b class="catalog-hotspot-quantity"></b></div>
        <button class="catalog-hotspot-copy" type="button">Copy Part Number</button>
      </section>`;
    document.body.append(dialog);

    const number = dialog.querySelector("#catalog-hotspot-number");
    const description = dialog.querySelector(".catalog-hotspot-description");
    const position = dialog.querySelector(".catalog-hotspot-position");
    const quantity = dialog.querySelector(".catalog-hotspot-quantity");
    const closeButton = dialog.querySelector(".catalog-hotspot-close");
    const copyButton = dialog.querySelector(".catalog-hotspot-copy");
    let returnFocus = null;

    function close() {
      dialog.hidden = true;
      returnFocus?.focus();
    }

    function show(partNumber, partDescription, partPosition, partQuantity, trigger) {
      if (!partNumber) return;
      number.textContent = partNumber;
      description.textContent = partDescription || "Description unavailable";
      position.textContent = partPosition || "—";
      quantity.textContent = partQuantity || "—";
      copyButton.textContent = "Copy Part Number";
      copyButton.disabled = false;
      returnFocus = trigger;
      dialog.hidden = false;
      closeButton.focus();
    }

    function hotspotDetails(hotspot) {
      const match = hotspot.title.match(/^Pos\s+(.+?)\s+(.+)$/);
      return {
        partNumber: hotspot.dataset.partNumber ?? match?.[2],
        position: hotspot.dataset.position ?? match?.[1]
      };
    }

    copyButton.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
        await navigator.clipboard.writeText(number.textContent);
        copyButton.textContent = "Copied";
      } catch (error) {
        console.error("Failed to copy the part number.", error);
        copyButton.textContent = "Copy unavailable";
        copyButton.disabled = true;
      }
    });

    closeButton.addEventListener("click", close);
    dialog.addEventListener("click", event => {
      if (event.target === dialog) close();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !dialog.hidden) close();
    });

    document.addEventListener("click", event => {
      const hotspot = event.target.closest(".hotspot, #hotspots .hs");
      if (!hotspot) return;

      if (hotspot.matches("#hotspots .hs")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const details = hotspotDetails(hotspot);
        show(details.partNumber, hotspot.dataset.description, details.position, hotspot.dataset.quantity, hotspot);
        return;
      }

      const partPosition = hotspot.dataset.pos;
      const row = [...document.querySelectorAll("#partsBody tr[data-pos]")]
        .find(candidate => candidate.dataset.pos === partPosition);
      if (!row) return;
      show(
        row.cells[1]?.textContent.trim(),
        row.cells[2]?.textContent.trim(),
        partPosition,
        row.cells[3]?.textContent.trim(),
        hotspot
      );
    }, true);

    document.addEventListener("keydown", event => {
      const hotspot = event.target.closest?.("#hotspots .hs");
      if (!hotspot || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const details = hotspotDetails(hotspot);
      show(details.partNumber, hotspot.dataset.description, details.position, hotspot.dataset.quantity, hotspot);
    }, true);
  }

  function installHotspotSelectionHighlight() {
    const hotspotSelector = ".hotspot, #hotspots .hs, .hot";
    const rowSelector = "#partsBody tr[data-pos], #parts tr[data-i], #parts tr[data-pos]";
    const positionForHotspot = hotspot => {
      if (!hotspot) return "";
      if (hotspot.dataset.pos != null) return String(hotspot.dataset.pos).trim();
      if (hotspot.dataset.text != null) return String(hotspot.dataset.text).trim();
      if (hotspot.dataset.position != null) return String(hotspot.dataset.position).trim();
      const match = hotspot.title?.match(/^Pos\s+(.+?)\s+(.+)$/);
      return String(match?.[1] ?? "").trim();
    };
    const positionForRow = row => String(row?.dataset.pos ?? row?.cells?.[0]?.textContent ?? "").trim();

    function selectPosition(position, selectedHotspot = null, selectedRow = null) {
      if (!position) return;
      document.querySelectorAll(".catalog-hotspot-selected")
        .forEach(item => item.classList.remove("catalog-hotspot-selected"));
      document.querySelectorAll(".catalog-part-selected")
        .forEach(item => item.classList.remove("catalog-part-selected"));

      const matchingHotspot = selectedHotspot || [...document.querySelectorAll(hotspotSelector)]
        .find(item => positionForHotspot(item) === position);
      const matchingRow = selectedRow || [...document.querySelectorAll(rowSelector)]
        .find(item => positionForRow(item) === position);

      matchingHotspot?.classList.add("catalog-hotspot-selected");
      matchingRow?.classList.add("catalog-part-selected");
    }

    document.addEventListener("click", event => {
      const hotspot = event.target.closest?.(hotspotSelector);
      if (hotspot) {
        selectPosition(positionForHotspot(hotspot), hotspot);
        return;
      }
      const row = event.target.closest?.(rowSelector);
      if (row) selectPosition(positionForRow(row), null, row);
    }, true);
  }

  installHotspotSelectionHighlight();

  installHotspotPartPopup();

  document.addEventListener("error", event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || image.id !== "diagram") return;
    if (!page.classList.contains("ui-ac200") && !page.classList.contains("ui-at15")) return;

    image.style.display = "none";
    let message = document.querySelector("#empty");
    if (!message || page.classList.contains("ui-ac200")) {
      message = document.createElement("div");
      message.className = "empty diagram-load-error";
      (document.querySelector("#canvasWrap") ?? image.parentElement).append(message);
    }
    const filename = image.getAttribute("src")?.split("/").pop() ?? "";
    message.classList.add("diagram-load-error");
    message.textContent = `Diagram could not be loaded${filename ? ` (${filename})` : ""}. Check the connection and select this catalog again.`;
    message.hidden = false;
    message.style.display = "grid";
  }, true);

  document.addEventListener("load", event => {
    if (!(event.target instanceof HTMLImageElement) || event.target.id !== "diagram") return;
    event.target.style.display = "";
    if (page.classList.contains("ui-ac200")) {
      document.querySelectorAll(".diagram-load-error").forEach(message => message.remove());
    }
  }, true);

  if (page.classList.contains("ui-ac200")) {
    const diagram = document.querySelector("#diagram");
    if (diagram) {
      new MutationObserver(() => {
        document.querySelectorAll(".diagram-load-error").forEach(message => message.remove());
      }).observe(diagram, { attributes: true, attributeFilter: ["src"] });
    }
  }

  async function initializeCatalogTree() {
    const source = sidebar.querySelector("#catalogs, #cats");
    if (!source) return;

    let searchInput = sidebar.querySelector("#catFilter, #catfilter, #catalogFilter, #filter");
    if (!searchInput) {
      const searchWrap = document.createElement("div");
      searchWrap.className = "catalogSearch";
      searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.placeholder = "Filter catalogs...";
      searchInput.setAttribute("aria-label", "Filter catalogs");
      searchWrap.append(searchInput);
      source.before(searchWrap);
    }

    const response = await fetch("data/catalogs.json");
    if (!response.ok) throw new Error(`data/catalogs.json ${response.status}`);
    const catalogData = await response.json();
    const catalogs = Array.isArray(catalogData) ? catalogData : catalogData.items;
    if (!Array.isArray(catalogs)) throw new Error("Catalog data must be an array.");

    const getId = catalog => String(catalog.id ?? catalog.variant ?? catalog.catalogId ?? catalog.catalog ?? "");
    const catalogById = new Map(catalogs.map(catalog => [getId(catalog), catalog]));
    const idAliases = new Map();
    const addAlias = (value, id) => {
      if (value == null || String(value).trim() === "") return;
      const raw = String(value).trim();
      idAliases.set(raw.toLowerCase(), id);
      idAliases.set(raw.toLowerCase().replace(/[\\s_-]+/g, ""), id);
    };
    catalogs.forEach(catalog => {
      const id = getId(catalog);
      for (const key of [id, catalog.id, catalog.variant, catalog.catalogId, catalog.catalog, catalog.key]) {
        addAlias(key, id);
      }
    });
    const resolveCatalogId = value => {
      if (value == null) return null;
      const raw = String(value).trim();
      if (catalogById.has(raw)) return raw;
      return idAliases.get(raw.toLowerCase())
        ?? idAliases.get(raw.toLowerCase().replace(/[\\s_-]+/g, ""))
        ?? null;
    };

    const relations = [];
    const embeddedParts = catalogs.some(catalog =>
      Array.isArray(catalog.parts) || Array.isArray(catalog.children)
    );
    if (embeddedParts) {
      catalogs.forEach(catalog => {
        const parentId = getId(catalog);
        (catalog.parts ?? catalog.children ?? []).forEach(part => relations.push([parentId, part]));
      });
    } else {
      try {
        const partsResponse = await fetch("data/parts.json");
        if (partsResponse.ok) {
          const partsData = await partsResponse.json();
          const parts = Array.isArray(partsData) ? partsData : partsData.items ?? partsData.parts;
          if (Array.isArray(parts)) {
            parts.forEach(part => relations.push([String(part.catalogId ?? part.catalog ?? ""), part]));
          } else {
            console.warn("Catalog tree: data/parts.json has an unsupported structure.");
          }
        } else {
          console.info("Catalog tree: data/parts.json is not available; checking the OEM hierarchy index.");
        }
      } catch (error) {
        console.info("Catalog tree: parts index unavailable; checking the OEM hierarchy index.", error);
      }
    }

    const childIds = new Map(catalogs.map(catalog => [getId(catalog), []]));
    const parentById = new Map();
    const positionById = new Map();
    const descriptionById = new Map();
    const versionById = new Map();

    // Some TEREX models store verified catalog-to-catalog relationships in a
    // gzip/base64 hierarchy index instead of exposing them in parts.json.
    // Load that source first so the shared tree behaves consistently for every model.
    let hierarchy = null;
    try {
      const hierarchyResponse = await fetch("data/catalog-hierarchy.json");
      if (hierarchyResponse.ok) {
        const packed = await hierarchyResponse.json();
        if (packed?.encoding === "gzip-base64" && packed.data && "DecompressionStream" in window) {
          const bytes = Uint8Array.from(atob(packed.data), character => character.charCodeAt(0));
          const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
          hierarchy = JSON.parse(await new Response(stream).text());
        } else if (packed && packed.parent && typeof packed.parent === "object") {
          hierarchy = packed;
        }
      }
    } catch (error) {
      console.warn("Catalog tree: OEM hierarchy index could not be decoded; using part relationships where available.", error);
    }

    const hierarchyParents = hierarchy?.parent && typeof hierarchy.parent === "object"
      ? hierarchy.parent
      : {};
    // Canonical OEM assembly relationships captured from the supplied AC100/AC140/AC200 reference trees.
    // Rebuild direct children of the root and the three main assemblies rather than retaining stale or inferred parents.
    const curatedCatalogTrees = {
      "AC100-4": {
        root: "10213.1",
        branches: {
          "10213.1": ["40788912", "40789112", "40777812"],
          "40788912": ["40832912", "40786512", "40680312", "40790612", "40680412", "40835512", "40783312", "40783512", "40833312", "19527612"],
          "40789112": ["40790412", "40662012", "40681412", "40840312", "40680812", "40789912", "40779112", "40783612", "40834312", "28079912"],
          "40777812": ["40789812", "40778012", "40746112", "40805312", "40805512", "48392412", "40671012"]
        }
      },
      "AC140C": {
        root: "76625.1",
        branches: {
          "76625.1": ["40716012", "40654112", "40651812"],
          "40716012": ["40519812", "40611412", "40622912", "40715912", "40559812", "40695312", "40530612", "40546912", "40546812", "40535712", "31429712"],
          "40654112": ["40632612", "40636812", "40631912", "40654212", "40637012", "40637112", "40639612", "40633512", "40633212", "28075812"],
          "40651812": ["40651912", "40652012", "40741312", "40728912", "70728412", "40642812", "40652112"]
        }
      },
      "AC200-1": {
        root: "33340.1",
        branches: {
          "33340.1": ["45314212", "45338212", "45337812"],
          "45314212": ["45142412", "45265312", "45095812", "45328312", "45294012", "45287512", "45142512", "45081512", "45218012", "12666612"],
          "45338212": ["45078112", "45212912", "45267012", "45206812", "45318812", "45206212", "45203512", "45202012", "45176912", "45079012"],
          "45337812": ["45337612", "45337412", "45337312", "45338412", "29020912", "45079312", "45338312"],
          "29020912": ["17524012"]
        }
      }
    };
    const curatedCatalogTree = curatedCatalogTrees[modelCode] ?? null;
    const curatedRootId = curatedCatalogTree ? resolveCatalogId(curatedCatalogTree.root) : null;
    const curatedParentPriority = new Set();
    if (curatedCatalogTree) {
      const curatedParents = {};
      const controlledParentIds = new Set(
        Object.keys(curatedCatalogTree.branches)
          .map(resolveCatalogId)
          .filter(Boolean)
      );
      for (const [parentRaw, childRaws] of Object.entries(curatedCatalogTree.branches)) {
        const parentId = resolveCatalogId(parentRaw);
        if (!parentId) continue;
        childRaws.forEach(childRaw => {
          const childId = resolveCatalogId(childRaw);
          if (childId && childId !== parentId) {
            curatedParents[childId] = parentId;
            curatedParentPriority.add(childId);
          }
        });
      }
      const curatedChildren = new Set([curatedRootId, ...Object.keys(curatedParents)].filter(Boolean));
      for (const [childRaw, parentRaw] of Object.entries(hierarchyParents)) {
        const childId = resolveCatalogId(childRaw);
        const parentId = resolveCatalogId(parentRaw);
        if (controlledParentIds.has(parentId) || curatedChildren.has(childId)) delete hierarchyParents[childRaw];
      }
      Object.assign(hierarchyParents, curatedParents);
      if (hierarchy && typeof hierarchy === "object") {
        hierarchy.root = curatedRootId ?? curatedCatalogTree.root;
        hierarchy.parent = hierarchyParents;
      }
    }
    for (const [childRaw, parentRaw] of Object.entries(hierarchyParents)) {
      const childId = resolveCatalogId(childRaw);
      const parentId = resolveCatalogId(parentRaw);
      if (!childId || !parentId || childId === parentId || parentById.has(childId)) continue;
      childIds.get(parentId)?.push(childId);
      parentById.set(childId, parentId);
    }
    const diagramIds = new Set();
    catalogs.forEach(catalog => {
      const id = getId(catalog);
      if (catalog.hasDiagram || catalog.image || catalog.images?.length) diagramIds.add(id);
    });
    if (!diagramIds.size) {
      const imageResponse = await fetch("data/images.json");
      if (!imageResponse.ok) throw new Error(`data/images.json ${imageResponse.status}`);
      const imageData = await imageResponse.json();
      const imageEntries = Array.isArray(imageData)
        ? imageData
        : Array.isArray(imageData.images)
          ? imageData.images
          : null;
      if (imageEntries) {
        imageEntries.forEach(image => {
          const id = image.catalogId ?? image.catalog ?? image.id ?? image.variant;
          if (id != null && catalogById.has(String(id))) diagramIds.add(String(id));
        });
      } else if (imageData && typeof imageData === "object") {
        Object.entries(imageData).forEach(([id, image]) => {
          if (catalogById.has(id) && image) diagramIds.add(id);
        });
      }
    }
    const partCatalogKeys = ["partNumber", "partNo", "material", "part_number", "textNumber", "variant", "catalogId"];
    relations.forEach(([parentRaw, part]) => {
      const parentId = resolveCatalogId(parentRaw) ?? (childIds.has(parentRaw) ? parentRaw : null);
      if (!parentId) return;
      const childRaw = partCatalogKeys
        .map(key => part[key])
        .find(value => value != null && resolveCatalogId(value));
      const childKey = resolveCatalogId(childRaw);
      if (!childKey || childKey === parentId || !childIds.has(parentId) || parentById.has(childKey)) return;
      childIds.get(parentId).push(childKey);
      parentById.set(childKey, parentId);
      positionById.set(childKey, String(part.position ?? part.pos ?? ""));
      if (part.description) descriptionById.set(childKey, String(part.description));
      const version = part.version ?? part.partVersion ?? part.catalogVersion;
      if (version && version !== "_") versionById.set(childKey, String(version));
    });
    // Normalize the graph and break bad parent cycles. The old source renderer could
    // silently omit catalogs when a cycle or disconnected branch had no root.
    const allCatalogIds = catalogs.map(getId);
    const completedParentWalks = new Set();
    for (const startId of allCatalogIds) {
      const walk = [];
      const seenAt = new Map();
      let nodeId = startId;
      while (nodeId && parentById.has(nodeId) && !completedParentWalks.has(nodeId)) {
        if (seenAt.has(nodeId)) {
          const cycle = walk.slice(seenAt.get(nodeId));
          const victim = cycle.find(id => !curatedParentPriority.has(id) && id !== curatedRootId)
            ?? cycle.find(id => id !== curatedRootId)
            ?? cycle[0];
          if (victim) parentById.delete(victim);
          break;
        }
        seenAt.set(nodeId, walk.length);
        walk.push(nodeId);
        nodeId = parentById.get(nodeId);
      }
      walk.forEach(id => completedParentWalks.add(id));
    }
    childIds.forEach(children => children.splice(0, children.length));
    for (const [childId, parentId] of parentById) {
      if (childIds.has(parentId) && childIds.has(childId)) childIds.get(parentId).push(childId);
    }

    childIds.forEach((children, parentId) => {
      const preferredChildren = curatedCatalogTree?.branches?.[parentId]
        ?.map(resolveCatalogId)
        .filter(Boolean);
      if (preferredChildren?.length) {
        const rank = new Map(preferredChildren.map((id, index) => [id, index]));
        children.sort((left, right) => {
          const leftRank = rank.get(left), rightRank = rank.get(right);
          if (leftRank !== undefined || rightRank !== undefined) {
            return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER);
          }
          return (positionById.get(left) ?? "").localeCompare(positionById.get(right) ?? "", undefined, { numeric: true });
        });
      } else {
        children.sort((left, right) =>
          (positionById.get(left) ?? "").localeCompare(positionById.get(right) ?? "", undefined, { numeric: true })
        );
      }
    });

    let roots = catalogs.map(getId).filter(id => !parentById.has(id));
    if (curatedRootId) roots = [curatedRootId, ...roots.filter(id => id !== curatedRootId)];
    const hiddenRootIds = new Set();
    if (!roots.length) roots = catalogs.map(getId);
    const placeholderIndex = roots.indexOf("0");
    const placeholderChildren = childIds.get("0") ?? [];
    if (placeholderIndex >= 0) {
      // "0" is a synthetic import placeholder, not a user-facing catalog.
      // Promote all of its children so a multi-root placeholder cannot hide them.
      hiddenRootIds.add("0");
      roots.splice(placeholderIndex, 1);
      roots = [...new Set([...placeholderChildren, ...roots])];
    }
    const reachableIds = new Set();
    const markReachable = id => {
      if (reachableIds.has(id)) return;
      reachableIds.add(id);
      (childIds.get(id) ?? []).forEach(markReachable);
    };
    roots.forEach(markReachable);
    catalogs.forEach(catalog => {
      const id = getId(catalog);
      if (hiddenRootIds.has(id) || reachableIds.has(id)) return;
      roots.push(id);
      markReachable(id);
    });

    const expectedSourceIds = catalogs.map(getId).filter(id => id !== "0");
    let entries = [];
    const renderDeadline = Date.now() + 30000;
    while (Date.now() < renderDeadline) {
      entries = [...source.querySelectorAll(".cat, .catalog-item")];
      if (entries.length >= expectedSourceIds.length) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (entries.length < expectedSourceIds.length) {
      throw new Error(`Expected at least ${expectedSourceIds.length} visible catalog source entries (excluding placeholder 0), found ${entries.length}.`);
    }

    const sourceNodeById = new Map();
    const catalogIdForEntry = entry => {
      const inlineId = entry.getAttribute("onclick")?.match(/openCat\(['"]([^'"]+)['"]\)/)?.[1];
      const smallText = entry.querySelector("small")?.textContent.trim() ?? "";
      const smallId = smallText.split(/\s*[·|]/, 1)[0];
      const id = entry.dataset.id ?? entry.dataset.v ?? inlineId
        ?? (catalogById.has(smallId) ? smallId : null);
      return id == null ? null : String(id);
    };
    entries.forEach(entry => {
      const id = catalogIdForEntry(entry);
      if (id != null) sourceNodeById.set(String(id), entry);
    });
    const clickSourceNode = id => {
      const entry = [...source.querySelectorAll(".cat, .catalog-item")]
        .find(candidate => catalogIdForEntry(candidate) === id);
      if (entry) entry.click();
    };
    const missingNodes = expectedSourceIds.filter(id => !sourceNodeById.has(id));
    if (missingNodes.length) {
      throw new Error(`Catalog selectors are missing for: ${missingNodes.slice(0, 5).join(", ")}`);
    }

    const tree = document.createElement("div");
    tree.className = "catalog-tree";
    tree.setAttribute("role", "tree");
    source.classList.add("catalog-tree-source");
    source.before(tree);

    const expanded = new Set();
    const activeEntry = entries.find(entry => entry.classList.contains("active"));
    let activeId = activeEntry?.dataset.id ?? activeEntry?.dataset.v
      ?? activeEntry?.getAttribute("onclick")?.match(/openCat\(['"]([^'"]+)['"]\)/)?.[1]
      ?? null;
    const initialDiagramId = (() => {
      const queue = [...roots];
      const visited = new Set();
      while (queue.length) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        if (diagramIds.has(id)) return id;
        queue.push(...(childIds.get(id) ?? []));
      }
      return null;
    })();
    if ((!activeId || !diagramIds.has(activeId)) && initialDiagramId) {
      activeId = initialDiagramId;
      clickSourceNode(activeId);
    }
    let query = "";

    function catalogLabel(catalog, id) {
      // AC200 has source-verified human-readable assembly labels in its model app.
      // Reuse those labels instead of replacing them with numeric catalog titles
      // when the shared expandable tree takes over the native list.
      if (modelCode === "AC200-1" && typeof getCatalogTitle === "function") {
        return getCatalogTitle(catalog);
      }
      const description = modelCode === "AC250-1" && id === "85198.1"
        ? "AC 250-1"
        : descriptionById.get(id) || catalog.title || id;
      const title = /^(under ?carriage|superstructure|attachment|chassis)$/i.test(description)
        ? description.toUpperCase()
        : description;
      const version = versionById.get(id) ?? catalog.version;
      const identity = [id, version && version !== "_" ? version : ""].filter(Boolean).join(" ");
      return `${title} (${identity})`;
    }

    function renderTree() {
      const normalizedQuery = query.trim().toLocaleLowerCase();
      const visibleIds = new Set();
      if (normalizedQuery) {
        catalogs.forEach(catalog => {
          const id = getId(catalog);
          if (!catalogLabel(catalog, id).toLocaleLowerCase().includes(normalizedQuery)) return;
          let currentId = id;
          while (currentId && !visibleIds.has(currentId)) {
            visibleIds.add(currentId);
            expanded.add(currentId);
            currentId = parentById.get(currentId);
          }
        });
      } else {
        catalogs.forEach(catalog => visibleIds.add(getId(catalog)));
      }

      const visibleChildren = id => (childIds.get(id) ?? []).filter(childId => visibleIds.has(childId));
      const renderedIds = new Set();
      function createNode(id, depth) {
        if (renderedIds.has(id)) return null;
        renderedIds.add(id);
        const catalog = catalogById.get(id);
        if (!catalog) return null;

        const item = document.createElement("div");
        item.className = "catalog-tree-item";
        item.setAttribute("role", "treeitem");
        item.setAttribute("aria-level", String(depth + 1));
        const row = document.createElement("div");
        row.className = "catalog-tree-row";
        row.style.setProperty("--tree-depth", String(depth));
        const children = visibleChildren(id);

        if (children.length) {
          const toggleNode = document.createElement("button");
          toggleNode.type = "button";
          toggleNode.className = "catalog-tree-toggle";
          toggleNode.setAttribute("aria-label", `${expanded.has(id) ? "Collapse" : "Expand"} ${catalogLabel(catalog, id)}`);
          toggleNode.setAttribute("aria-expanded", String(expanded.has(id)));
          toggleNode.textContent = expanded.has(id) ? "−" : "+";
          toggleNode.addEventListener("click", event => {
            event.stopPropagation();
            if (expanded.has(id)) expanded.delete(id);
            else expanded.add(id);
            renderTree();
          });
          row.append(toggleNode);
        } else {
          const spacer = document.createElement("span");
          spacer.className = "catalog-tree-spacer";
          row.append(spacer);
        }

        const label = document.createElement("button");
        label.type = "button";
        label.className = "catalog-tree-label";
        label.dataset.catalogId = id;
        label.textContent = catalogLabel(catalog, id);
        label.title = label.textContent;
        label.setAttribute("aria-current", activeId === id ? "true" : "false");
        if (activeId === id) label.classList.add("active");
        label.addEventListener("click", () => {
          activeId = id;
          renderTree();
          clickSourceNode(id);
        });
        row.append(label);
        item.append(row);

        if (children.length && expanded.has(id)) {
          const childList = document.createElement("div");
          childList.className = "catalog-tree-children";
          childList.setAttribute("role", "group");
          children.forEach(childId => {
            const child = createNode(childId, depth + 1);
            if (child) childList.append(child);
          });
          item.append(childList);
        }
        return item;
      }

      const rootList = document.createElement("div");
      rootList.className = "catalog-tree-roots";
      roots.forEach(id => {
        if (!visibleIds.has(id)) return;
        const root = createNode(id, 0);
        if (root) rootList.append(root);
      });
      tree.replaceChildren(rootList);
    }

    const expandInitialBranches = (id, depth, seen = new Set()) => {
      if (seen.has(id)) return;
      seen.add(id);
      const children = childIds.get(id) ?? [];
      // AC200 starts with the top-level assemblies visible and each assembly
      // independently expandable/collapsible. Other models retain their existing
      // initial expansion depth.
      if (children.length && (modelCode === "AC200-1" ? depth === 0 : depth < 4)) expanded.add(id);
      children.forEach(childId => expandInitialBranches(childId, depth + 1, seen));
    };
    roots.forEach(id => expandInitialBranches(id, 0));
    let ancestorId = activeId ? parentById.get(activeId) : null;
    while (ancestorId) {
      expanded.add(ancestorId);
      ancestorId = parentById.get(ancestorId);
    }
    renderTree();

    const sourceObserver = new MutationObserver(() => {
      const selected = source.querySelector(".cat.active, .catalog-item.active");
      const selectedId = selected ? catalogIdForEntry(selected) : null;
      if (selectedId === activeId) return;
      activeId = selectedId;
      renderTree();
    });
    sourceObserver.observe(source, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        query = searchInput.value;
        renderTree();
      });
    }
    sidebar.addEventListener("click", event => {
      if (!event.target.closest("#resetBtn, #reset")) return;
      activeId = null;
      query = "";
      if (searchInput) searchInput.value = "";
      renderTree();
    });
    window.addEventListener("popstate", () => {
      const hashId = decodeURIComponent(location.hash.slice(1));
      if (catalogById.has(hashId)) {
        activeId = hashId;
        renderTree();
      }
    });
  }

  initializeCatalogTree().catch(error => {
    console.error("Failed to build the catalog tree.", error);
  });

  function installDiagramGestures() {
    // AC80-2 already owns a complete pointer gesture controller.
    // AT15 uses transformed coordinates and is handled by its own app.js.
    if (page.classList.contains("ui-ac40") ||
        page.classList.contains("ui-model-terex-ac80-2") ||
        page.classList.contains("ui-at15")) return;

    const viewport = document.querySelector(
      "#diagramStage, #stage, #canvasWrap, #viewer"
    );
    if (!viewport) return;

    const diagramSelector = "#diagram, #diagramCanvas, #canvas";
    const hasDiagram = () => {
      const diagram = viewport.querySelector(diagramSelector) || document.querySelector(diagramSelector);
      if (!diagram) return false;
      if (diagram instanceof HTMLImageElement) return Boolean(diagram.naturalWidth);
      return Boolean(diagram.width || diagram.getBoundingClientRect().width);
    };

    // Prevent Android's native touch scrolling from cancelling pointer events.
    // We implement one-finger panning here; model-specific code remains responsible
    // for pinch zoom so the diagram and its hotspots keep the same scale.
    viewport.style.touchAction = "none";
    let drag = null;
    const activeTouchPointers = new Set();
    let suppressHotspotClick = false;
    let suppressTimer = null;

    viewport.addEventListener("pointerdown", event => {
      if (event.pointerType !== "touch") return;
      activeTouchPointers.add(event.pointerId);
      // Never pan the viewport with one finger while a second finger is pinching.
      if (activeTouchPointers.size > 1) {
        drag = null;
        return;
      }
      if (!hasDiagram()) return;
      drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false
      };
    });

    viewport.addEventListener("pointermove", event => {
      if (activeTouchPointers.size > 1 || !drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) {
        drag.moved = true;
        try { viewport.setPointerCapture(event.pointerId); } catch (_) {}
      }
      if (drag.moved) {
        event.preventDefault();
        viewport.scrollLeft -= dx;
        viewport.scrollTop -= dy;
        suppressHotspotClick = true;
        clearTimeout(suppressTimer);
        suppressTimer = setTimeout(() => { suppressHotspotClick = false; }, 450);
      }
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    });

    function finish(event) {
      activeTouchPointers.delete(event.pointerId);
      if (drag && drag.pointerId === event.pointerId) drag = null;
    }
    viewport.addEventListener("pointerup", finish);
    viewport.addEventListener("pointercancel", finish);
    viewport.addEventListener("click", event => {
      if (!suppressHotspotClick || !event.target.closest(".hotspot, .hot, .hs")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressHotspotClick = false;
      clearTimeout(suppressTimer);
    }, true);
  }

  // Refit the active diagram when a phone rotates between portrait and landscape.
  // Only react to orientation changes so normal browser-toolbar resizes do not reset zoom.
  let lastLandscape = window.innerWidth > window.innerHeight;
  let orientationRefitTimer = null;
  window.addEventListener("resize", () => {
    const landscape = window.innerWidth > window.innerHeight;
    if (landscape === lastLandscape) return;
    lastLandscape = landscape;
    clearTimeout(orientationRefitTimer);
    orientationRefitTimer = setTimeout(() => {
      const fitButton = document.querySelector("#zoomFit, #fit, #reset");
      if (fitButton && !fitButton.disabled) fitButton.click();
    }, 180);
  }, { passive: true });

  installDiagramGestures();
})();
