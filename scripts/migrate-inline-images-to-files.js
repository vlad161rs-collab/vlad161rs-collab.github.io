const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PROJECTS_PATH = path.join(ROOT, 'data', 'projects.json');
const INDEX_PATH = path.join(ROOT, 'index.html');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sanitizePathSegment(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

function mimeTypeToExt(mime) {
  const normalized = String(mime || '').toLowerCase();
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  return 'bin';
}

function parseBase64Image(dataUrl) {
  const match = /^data:(image\/[^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) return null;
  return {
    mime: match[1],
    base64: match[2],
  };
}

function buildProjectImagePath(project, imageIndex, imageValue) {
  const parsed = parseBase64Image(imageValue);
  const ext = mimeTypeToExt(parsed?.mime);
  const projectId = sanitizePathSegment(project?.id ?? 'project');
  const versionTag = sanitizePathSegment(String(project?.updatedAt || project?.date || 'no-date').replace(/[:.]/g, '-'));
  return `data/images/${projectId}/${versionTag}-${imageIndex + 1}.${ext}`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function getImages(project) {
  if (Array.isArray(project?.images) && project.images.length > 0) return project.images.slice();
  if (project?.image) return [project.image];
  return [];
}

function getLocalizedText(project, field, lang = 'en') {
  const value = project?.[field];
  if (value && typeof value === 'object') {
    const primary = value[lang];
    const fallback = value[lang === 'en' ? 'ru' : 'en'];
    return String(primary || fallback || '').trim();
  }
  return String(value || '').trim();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrerenderCard(project, index) {
  const images = getImages(project);
  const mainIndex = Number.isInteger(project.mainImageIndex) ? project.mainImageIndex : 0;
  const previewImage = images[mainIndex] || images[0] || '';
  const title = getLocalizedText(project, 'title', 'en');
  const description = getLocalizedText(project, 'description', 'en').replace(/\s+/g, ' ').trim();

  return `        <div class="portfolio-item" data-index="${index}">
            <img src="${escapeHtml(previewImage)}" alt="${escapeHtml(title)}" class="portfolio-item-image" loading="lazy" decoding="async">
            <div class="portfolio-item-content">
                <h3 class="portfolio-item-title">${escapeHtml(title)}</h3>
                <p class="portfolio-item-description">${escapeHtml(description)}</p>
                <div class="portfolio-item-actions">
                    <button class="btn-icon" type="button" data-action="view">View</button>
                </div>
            </div>
        </div>`;
}

function updateEmbeddedProjectsInHtml(html, projects) {
  const embeddedJson = JSON.stringify(projects, null, 2);
  return html.replace(
    /(<script id="embeddedProjects" type="application\/json">\s*)([\s\S]*?)(\s*<\/script>)/,
    (_, start, _old, end) => `${start}${embeddedJson}${end}`
  );
}

function updatePrerenderGridInHtml(html, projects) {
  const cards = projects.map((project, index) => buildPrerenderCard(project, index)).join('');
  return html.replace(
    /(<!-- PORTFOLIO_GRID_START -->\s*)([\s\S]*?)(\s*<!-- PORTFOLIO_GRID_END -->)/,
    (_, start, _old, end) => `${start}${cards}\n${end.trimStart()}`
  );
}

function migrateProjectsInlineImages(projects) {
  let convertedImages = 0;
  const migratedProjects = projects.map((project) => {
    if (!project) return project;

    const nextProject = { ...project };
    const images = getImages(project);
    const mainIndex = Number.isInteger(project.mainImageIndex) ? project.mainImageIndex : 0;
    const nextImages = images.map((img, index) => {
      const parsed = parseBase64Image(img);
      if (!parsed) return img;

      const relPath = buildProjectImagePath(project, index, img);
      const absPath = path.join(ROOT, relPath);
      ensureDir(absPath);
      fs.writeFileSync(absPath, Buffer.from(parsed.base64, 'base64'));
      convertedImages += 1;
      return relPath.replace(/\\/g, '/');
    });

    if (nextImages.length > 0) {
      nextProject.images = nextImages;
      const normalizedMain = mainIndex >= 0 && mainIndex < nextImages.length ? mainIndex : 0;
      nextProject.mainImageIndex = normalizedMain;
      nextProject.image = nextImages[normalizedMain] || nextImages[0] || null;
    }

    return nextProject;
  });

  return { migratedProjects, convertedImages };
}

function main() {
  if (!fs.existsSync(PROJECTS_PATH)) {
    throw new Error(`Missing ${PROJECTS_PATH}`);
  }
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(`Missing ${INDEX_PATH}`);
  }

  const projects = readJson(PROJECTS_PATH);
  if (!Array.isArray(projects)) {
    throw new Error('data/projects.json is not an array');
  }

  const { migratedProjects, convertedImages } = migrateProjectsInlineImages(projects);
  writeJson(PROJECTS_PATH, migratedProjects);

  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = updateEmbeddedProjectsInHtml(html, migratedProjects);
  html = updatePrerenderGridInHtml(html, migratedProjects);
  fs.writeFileSync(INDEX_PATH, html, 'utf8');

  console.log(`Projects migrated: ${migratedProjects.length}`);
  console.log(`Images converted to files: ${convertedImages}`);
}

main();
