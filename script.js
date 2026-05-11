const wall = document.querySelector("#wall");
const featuredGallery = document.querySelector("#featured-gallery");
const template = document.querySelector("#card-template");
const filters = [...document.querySelectorAll(".filter")];
const visibleCount = document.querySelector("#visible-count");
const dialog = document.querySelector("#detail-dialog");
const dialogContent = document.querySelector("#dialog-content");
const dialogClose = document.querySelector(".dialog-close");
const openEditorButton = document.querySelector("#open-editor");
const editorDialog = document.querySelector("#editor-dialog");
const editorForm = document.querySelector("#editor-form");
const editorClose = document.querySelector(".editor-close");
const imageInput = document.querySelector("#image-input");
const imagePreview = document.querySelector("#image-preview");
const exportLocalButton = document.querySelector("#export-local");
const importLocalButton = document.querySelector("#import-local");
const importInput = document.querySelector("#import-input");
const clearLocalButton = document.querySelector("#clear-local");
const editorStatus = document.querySelector("#editor-status");
const storageStatus = document.querySelector("#storage-status");

const LOCAL_KEY = "jinlin-local-memories";
const palette = ["#ffffff", "#fafafa", "#f7f7f5"];
const symbols = {
  旅行: "旅行",
  作品: "作品",
  碎碎念: "碎碎念",
  给作者的留言: "留言"
};

let memories = [];
let baseMemories = [];
let localMemories = [];
let cloudMemories = [];
let activeFilter = "全部";
let selectedImage = "";
let selectedImageAlt = "";

async function init() {
  try {
    const response = await fetch("data/moments.json");
    baseMemories = await response.json();
  } catch (error) {
    wall.innerHTML = '<p class="load-error">数据没有加载出来。</p>';
    return;
  }

  localMemories = loadLocalMemories();
  if (isCloudEnabled()) {
    storageStatus.textContent = "当前已连接云端数据库，发布后家人刷新同一个网址就能看到。";
    cloudMemories = await loadCloudMemories();
  } else {
    storageStatus.textContent = "当前使用本地保存。配置云端数据库后，家人才能在同一个网址看到新内容。";
  }

  rebuildMemories();
  renderFeaturedGallery(memories);
  renderCards(memories);
  bindFilters();
  bindDialog();
  bindEditor();
}

function renderCards(items) {
  wall.innerHTML = "";

  items.forEach((item, index) => {
    const card = template.content.firstElementChild.cloneNode(true);

    card.dataset.category = item.category;
    card.dataset.type = item.type;
    card.style.setProperty("--card-bg", item.color || "#ffffff");

    const media = card.querySelector(".card-media");
    if (item.image) {
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.alt || item.title;
      media.append(img);
    } else {
      const symbol = document.createElement("span");
      symbol.className = "card-symbol";
      symbol.textContent = symbols[item.category] || "✦";
      media.append(symbol);
    }

    card.querySelector(".card-category").textContent = item.category;
    card.querySelector(".card-date").dateTime = item.date;
    card.querySelector(".card-date").textContent = formatDate(item.date);
    card.querySelector(".card-title").textContent = item.title;
    card.querySelector(".card-text").textContent = item.excerpt;

    const tagRow = card.querySelector(".tag-row");
    item.tags.forEach((tag) => {
      const tagEl = document.createElement("span");
      tagEl.className = "tag";
      tagEl.textContent = `#${tag}`;
      tagRow.append(tagEl);
    });

    card.addEventListener("click", () => openDetail(item));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetail(item);
      }
    });

    wall.append(card);
  });

  updateVisibleCount();
}

function renderFeaturedGallery(items) {
  const featured = items.filter((item) => item.image).slice(0, 5);
  featuredGallery.innerHTML = "";

  featured.forEach((item) => {
    const button = document.createElement("button");
    button.className = "featured-photo";
    button.type = "button";
    button.innerHTML = `
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt || item.title)}">
      <span>${escapeHtml(item.title)}</span>
    `;
    button.addEventListener("click", () => openDetail(item));
    featuredGallery.append(button);
  });
}

function bindFilters() {
  filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filters.forEach((filter) => filter.classList.toggle("is-active", filter === button));
      applyFilter();
    });
  });
}

function applyFilter() {
  const cards = [...wall.querySelectorAll(".memory-card")];
  cards.forEach((card) => {
    const shouldShow = activeFilter === "全部" || card.dataset.category === activeFilter;
    card.classList.toggle("is-hidden", !shouldShow);
  });
  updateVisibleCount();
}

function updateVisibleCount() {
  const count = wall.querySelectorAll(".memory-card:not(.is-hidden)").length;
  visibleCount.textContent = String(count).padStart(2, "0");
}

function openDetail(item) {
  const tags = item.tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("");
  const media = item.image
    ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt || item.title)}">`
    : `<span class="card-symbol">${symbols[item.category] || "✦"}</span>`;
  const link = item.url
    ? `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开收藏</a>`
    : "";
  const deleteButton = item.local
    ? `<button class="delete-memory" type="button" data-delete-memory="${escapeHtml(item.id)}">删除这条</button>`
    : "";

  dialogContent.innerHTML = `
    <div class="dialog-hero">${media}</div>
    <div class="dialog-text">
      <div class="card-meta">
        <span class="card-category">${escapeHtml(item.category)}</span>
        <time datetime="${escapeHtml(item.date)}">${formatDate(item.date)}</time>
      </div>
      <h2 id="dialog-title">${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.body)}</p>
      <div class="dialog-footer">
        <div class="tag-row">${tags}</div>
        <div class="dialog-actions">${link}${deleteButton}</div>
      </div>
    </div>
  `;

  const deleteMemoryButton = dialogContent.querySelector("[data-delete-memory]");
  if (deleteMemoryButton) {
    deleteMemoryButton.addEventListener("click", () => deleteLocalMemory(item.id));
  }

  dialog.showModal();
}

function bindDialog() {
  dialogClose.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}

function bindEditor() {
  editorForm.elements.date.valueAsDate = new Date();

  openEditorButton.addEventListener("click", () => {
    editorStatus.textContent = "";
    editorDialog.showModal();
  });

  editorClose.addEventListener("click", () => editorDialog.close());
  editorDialog.addEventListener("click", (event) => {
    if (event.target === editorDialog) {
      editorDialog.close();
    }
  });

  imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    selectedImage = "";
    selectedImageAlt = "";

    if (!file) {
      imagePreview.textContent = "还没有选择图片";
      return;
    }

    if (!file.type.startsWith("image/")) {
      imagePreview.textContent = "请选择图片文件";
      return;
    }

    imagePreview.textContent = "正在处理图片...";
    try {
      selectedImage = await resizeImage(file);
      selectedImageAlt = file.name;
      imagePreview.innerHTML = `<img src="${selectedImage}" alt="图片预览"><span>${escapeHtml(file.name)}</span>`;
    } catch (error) {
      imagePreview.textContent = "图片处理失败，换一张试试";
    }
  });

  editorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveEditorMemory();
  });

  exportLocalButton.addEventListener("click", exportLocalMemories);
  importLocalButton.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", importLocalMemories);
  clearLocalButton.addEventListener("click", clearLocalMemories);
}

async function saveEditorMemory() {
  const formData = new FormData(editorForm);
  const category = formData.get("category");
  const title = formData.get("title").trim();
  const excerpt = formData.get("excerpt").trim();
  const body = formData.get("body").trim() || excerpt;
  const tags = parseTags(formData.get("tags"));
  const url = formData.get("url").trim();
  const type = selectedImage ? (category === "作品" ? "work" : "photo") : url ? "link" : "note";

  const newMemory = {
    id: `${isCloudEnabled() ? "cloud" : "local"}-${Date.now()}`,
    type,
    category,
    date: formData.get("date") || new Date().toISOString().slice(0, 10),
    title,
    excerpt,
    body,
    tags,
    image: selectedImage,
    alt: selectedImageAlt || title,
    url,
    color: palette[memories.length % palette.length],
    local: !isCloudEnabled(),
    cloud: isCloudEnabled()
  };

  if (isCloudEnabled()) {
    editorStatus.textContent = "正在发布到云端...";
    const saved = await saveCloudMemory(newMemory);
    if (saved) {
      cloudMemories = [saved, ...cloudMemories];
      rebuildMemories();
      renderFeaturedGallery(memories);
      renderCards(memories);
      applyFilter();
      resetEditorForm();
      editorStatus.textContent = "发布成功，已经同步到云端。";
      return;
    }

    editorStatus.textContent = "云端发布失败，已改为保存到本地。检查 Supabase 配置后可以再试。";
    newMemory.id = `local-${Date.now()}`;
    newMemory.local = true;
    newMemory.cloud = false;
  }

  const nextLocalMemories = [newMemory, ...localMemories];
  if (!saveLocalMemories(nextLocalMemories)) {
    editorStatus.textContent = "保存失败：图片可能太大。换一张小图，或先导出备份后清理一些旧内容。";
    return;
  }

  localMemories = nextLocalMemories;
  rebuildMemories();
  renderFeaturedGallery(memories);
  renderCards(memories);
  applyFilter();
  resetEditorForm();
  editorStatus.textContent = "保存好了，已经出现在墙上。";
}

function resetEditorForm() {
  editorForm.reset();
  editorForm.elements.category.value = "碎碎念";
  editorForm.elements.date.valueAsDate = new Date();
  selectedImage = "";
  selectedImageAlt = "";
  imagePreview.textContent = "还没有选择图片";
}

function parseTags(value) {
  const tags = String(value)
    .split(/[,，、\s]+/)
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
  return tags.length ? [...new Set(tags)] : ["刚刚上传"];
}

function loadLocalMemories() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function rebuildMemories() {
  memories = mergeLocalMemories([...cloudMemories, ...localMemories], baseMemories);
}

function saveLocalMemories(items = localMemories) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    return false;
  }
}

function deleteLocalMemory(id) {
  const item = memories.find((memory) => memory.id === id);
  const confirmed = window.confirm("确定删除这条新增内容吗？");
  if (!confirmed) {
    return;
  }

  if (item?.cloud && isCloudEnabled()) {
    deleteCloudMemory(id);
    cloudMemories = cloudMemories.filter((memory) => memory.id !== id);
  } else {
    localMemories = localMemories.filter((memory) => memory.id !== id);
    saveLocalMemories();
  }

  rebuildMemories();
  renderFeaturedGallery(memories);
  renderCards(memories);
  applyFilter();
  dialog.close();
}

function exportLocalMemories() {
  const payload = JSON.stringify(localMemories, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "jinlin-local-memories.json";
  link.click();
  URL.revokeObjectURL(url);
  editorStatus.textContent = "备份文件已经导出。";
}

async function importLocalMemories() {
  const file = importInput.files[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported)) {
      throw new Error("Invalid backup");
    }

    const cleaned = imported
      .filter((item) => item && item.title && item.category)
      .map((item) => ({
        id: item.id || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: item.type || "note",
        category: item.category,
        date: item.date || new Date().toISOString().slice(0, 10),
        title: item.title,
        excerpt: item.excerpt || item.title,
        body: item.body || item.excerpt || item.title,
        tags: Array.isArray(item.tags) && item.tags.length ? item.tags : ["导入"],
        image: item.image || "",
        alt: item.alt || item.title,
        url: item.url || "",
        color: item.color || palette[0],
        local: true
      }));

    const merged = mergeLocalMemories(cleaned, localMemories);
    if (!saveLocalMemories(merged)) {
      editorStatus.textContent = "导入失败：备份可能太大。";
      return;
    }

  localMemories = merged;
    rebuildMemories();
    renderFeaturedGallery(memories);
    renderCards(memories);
    applyFilter();
    editorStatus.textContent = `导入完成，共有 ${localMemories.length} 条本地新增内容。`;
  } catch (error) {
    editorStatus.textContent = "导入失败：请选择从这里导出的 JSON 备份。";
  } finally {
    importInput.value = "";
  }
}

function mergeLocalMemories(incoming, existing) {
  const byId = new Map();
  [...incoming, ...existing].forEach((item) => {
    byId.set(item.id, item);
  });
  return [...byId.values()];
}

function clearLocalMemories() {
  if (!localMemories.length) {
    editorStatus.textContent = "现在没有本地新增内容。";
    return;
  }

  const confirmed = window.confirm("确定清空所有本地新增内容吗？建议先导出备份。");
  if (!confirmed) {
    return;
  }

  localMemories = [];
  saveLocalMemories();
  rebuildMemories();
  renderFeaturedGallery(memories);
  renderCards(memories);
  applyFilter();
  editorStatus.textContent = "本地新增内容已经清空。";
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxSize = 900;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.68));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function isCloudEnabled() {
  const config = getCloudConfig();
  return Boolean(config.enabled && config.url && config.anonKey && config.table);
}

function getCloudConfig() {
  return {
    enabled: false,
    provider: "supabase",
    url: "",
    anonKey: "",
    table: "moments",
    ...(window.JINLIN_CLOUD || {})
  };
}

function cloudHeaders(prefer) {
  const config = getCloudConfig();
  const headers = {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    "Content-Type": "application/json"
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

function cloudEndpoint(query = "") {
  const config = getCloudConfig();
  const baseUrl = config.url.replace(/\/$/, "");
  return `${baseUrl}/rest/v1/${config.table}${query}`;
}

async function loadCloudMemories() {
  try {
    const response = await fetch(cloudEndpoint("?select=*&order=created_at.desc"), {
      headers: cloudHeaders()
    });

    if (!response.ok) {
      throw new Error("Cloud read failed");
    }

    const rows = await response.json();
    return rows.map(fromCloudRow);
  } catch (error) {
    editorStatus.textContent = "云端读取失败，当前先显示本地内容。";
    return [];
  }
}

async function saveCloudMemory(memory) {
  try {
    const response = await fetch(cloudEndpoint(), {
      method: "POST",
      headers: cloudHeaders("return=representation"),
      body: JSON.stringify(toCloudRow(memory))
    });

    if (!response.ok) {
      throw new Error("Cloud write failed");
    }

    const [row] = await response.json();
    return fromCloudRow(row);
  } catch (error) {
    return null;
  }
}

async function deleteCloudMemory(id) {
  try {
    await fetch(cloudEndpoint(`?id=eq.${encodeURIComponent(id)}`), {
      method: "DELETE",
      headers: cloudHeaders()
    });
  } catch (error) {
    editorStatus.textContent = "云端删除可能失败，请刷新后确认。";
  }
}

function toCloudRow(memory) {
  return {
    id: memory.id,
    type: memory.type,
    category: memory.category,
    date: memory.date,
    title: memory.title,
    excerpt: memory.excerpt,
    body: memory.body,
    tags: memory.tags,
    image: memory.image || "",
    alt: memory.alt || "",
    url: memory.url || "",
    color: memory.color || "#ffffff"
  };
}

function fromCloudRow(row) {
  return {
    id: row.id,
    type: row.type || "note",
    category: row.category,
    date: row.date,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    tags: Array.isArray(row.tags) ? row.tags : [],
    image: row.image || "",
    alt: row.alt || row.title,
    url: row.url || "",
    color: row.color || "#ffffff",
    cloud: true,
    local: false
  };
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
