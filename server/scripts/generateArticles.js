#!/usr/bin/env node
// generateArticles.js
// Generates magazine-style article HTML pages and a public/data/articles.json
// Language: EN, Type: FOOD (recipes)
// No external dependencies required.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..'); // repo root
const SOURCE = path.join(__dirname, '..', 'data', 'source.json'); // your keywords/categories
const OUT_JSON = path.join(ROOT, 'public', 'data', 'articles.json');
const OUT_ART_DIR = path.join(ROOT, 'public', 'articles');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function slugify(s) {
  return s.toString().toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Basic placeholder recipe generator (no AI, deterministic)
function buildRecipe(title) {
  const intro = `${title} is a simple, budget-friendly recipe you'll love. Quick to prepare and packed with flavor.`;
  const ingredients = [
    "1 cup rice or pasta (or as needed)",
    "200g protein (chicken, tuna, beans)",
    "1 tbsp olive oil",
    "1 garlic clove, minced",
    "Salt and pepper to taste",
    "Optional: herbs, lemon, chili flakes"
  ];
  const steps = [
    "Prepare ingredients and season the protein.",
    "Heat oil in a pan, sauté garlic until fragrant.",
    "Add protein and cook until done.",
    "Add rice/pasta and combine, adjust seasoning.",
    "Serve hot with a lemon wedge or fresh herbs."
  ];
  return { intro, ingredients, steps };
}

function articleHTML(meta, recipeHtml) {
  // magazine-style HTML (relative CSS path: ../css/style.css)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${meta.title} - PlateUp.pro</title>
  <meta name="description" content="${meta.excerpt || meta.title}">
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <header class="site-header">
    <a href="../index.html"><img src="../images/logo.png" alt="PlateUp.pro" class="logo"></a>
    <nav class="main-nav">
      <a href="../index.html">Home</a>
      <a href="../about.html">About</a>
      <a href="../contact.html">Contact</a>
    </nav>
  </header>

  <main class="article-container">
    <h1>${meta.title}</h1>
    <p class="article-meta">Budget • Easy • Quick</p>
    <img src="${meta.thumb || '../images/logo.png'}" alt="${meta.title}" class="article-thumb">
    <div class="article-content">
      <p>${recipeHtml.intro}</p>
      <h4>Ingredients</h4>
      <ul>
        ${recipeHtml.ingredients.map(i => `<li>${i}</li>`).join('\n')}
      </ul>
      <h4>Instructions</h4>
      <ol>
        ${recipeHtml.steps.map(s => `<li>${s}</li>`).join('\n')}
      </ol>
      <p style="color:#666;font-size:.95rem;margin-top:16px;">Canonical: ${meta.canonical || ''}</p>
    </div>
  </main>

  <footer class="site-footer">
    &copy; ${new Date().getFullYear()} PlateUp.pro — Budget Recipes
  </footer>
</body>
</html>`;
}

// --- Main ---
ensureDir(path.dirname(OUT_JSON));
ensureDir(OUT_ART_DIR);

if (!fs.existsSync(SOURCE)) {
  // default source if missing
  const defaultSrc = {
    domain: "https://plateup.pro",
    categories: [
      {
        name: "Budget Cooking",
        items: [
          "Cheap Chicken Rice",
          "Beans Pasta",
          "Eggs on Toast",
          "Budget Chili",
          "Tuna Wrap"
        ]
      }
    ]
  };
  fs.writeFileSync(SOURCE, JSON.stringify(defaultSrc, null, 2), 'utf8');
  console.log("Created default source.json");
}

let src;
try {
  src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
} catch (e) {
  console.error("Failed to parse source.json:", e.message);
  process.exit(1);
}

const domain = src.domain || "";
const categories = src.categories || [];

let articlesList = [];

// If OUT_JSON exists, read previous list to avoid full overwrite (keeps history)
if (fs.existsSync(OUT_JSON)) {
  try {
    const old = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    if (Array.isArray(old.list)) articlesList = old.list.slice();
  } catch (e) { /* ignore */ }
}

// iterate categories & items and generate articles (skip duplicates by slug)
for (const cat of categories) {
  const catName = cat.name || "General";
  for (const itemName of (cat.items || [])) {
    const title = itemName;
    const slug = slugify(title);
    if (articlesList.find(a => a.slug === slug)) {
      console.log("Skipping existing:", slug);
      continue;
    }

    // Build recipe placeholder
    const recipe = buildRecipe(title);

    const meta = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      title,
      slug,
      category: catName,
      thumb: "", // leave empty (use logo) or set remote URL if you want
      excerpt: recipe.intro.slice(0, 140),
      canonical: domain ? `${domain}/articles/${slug}.html` : `/articles/${slug}.html`,
      ts: Date.now()
    };

    // Generate HTML file
    const html = articleHTML(meta, recipe);
    const outPath = path.join(OUT_ART_DIR, slug + '.html');
    fs.writeFileSync(outPath, html, 'utf8');
    console.log("Wrote:", outPath);

    // Push to list
    articlesList.push({
      id: meta.id,
      slug: meta.slug,
      title: meta.title,
      category: meta.category,
      excerpt: meta.excerpt,
      path: `articles/${meta.slug}.html`,
      ts: meta.ts
    });

    // tiny delay-safe (no real async here) — fine for local/run-once
  }
}

// write articles JSON to public/data/articles.json
const outObj = { ts: Date.now(), list: articlesList };
fs.writeFileSync(OUT_JSON, JSON.stringify(outObj, null, 2), 'utf8');
console.log("Wrote JSON:", OUT_JSON, "articles=", articlesList.length);

console.log("Done.");
