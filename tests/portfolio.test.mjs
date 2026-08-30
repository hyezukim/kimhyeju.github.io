import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";


const html = readFileSync("index.html", "utf8");
const css = readFileSync("style.css", "utf8");


test("publishes exactly the three selected projects", () => {
  const projectItems = html.match(/class="project-item"/g) ?? [];
  const projectButtons = html.match(/<button\s+type="button"\s+class="project-item"/g) ?? [];

  assert.equal(projectItems.length, 3);
  assert.equal(projectButtons.length, 3);
  assert.match(html, /data-project="1"/);
  assert.match(html, /data-project="2"/);
  assert.match(html, /data-project="3"/);
  assert.doesNotMatch(html, /data-project="[456]"/);
});


test("defines one HTML content template per project", () => {
  for (const projectNumber of [1, 2, 3]) {
    assert.match(html, new RegExp(`id="project${projectNumber}Template"`));
  }

  assert.equal((html.match(/class="project-overview reveal"/g) ?? []).length, 3);
});


test("all local image and stylesheet references resolve", () => {
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => !path.startsWith("http") && !path.startsWith("#"));

  const missing = [...new Set(references)].filter((path) => !existsSync(path));

  assert.deepEqual(missing, []);
});


test("all extracted project images are non-empty WebP files", () => {
  const projectImages = [...html.matchAll(/src="(images\/projects\/[^"]+\.webp)"/g)]
    .map((match) => match[1]);

  assert.equal(projectImages.length, 35);
  assert.equal(
    (html.match(/<img src="images\/projects\/[^\"]+" width="\d+" height="\d+"/g) ?? []).length,
    35
  );

  for (const imagePath of projectImages) {
    assert.ok(statSync(imagePath).size > 0, `${imagePath} should not be empty`);
  }
});


test("interactive overlays expose labels and focus management", () => {
  assert.match(html, /id="infoOverlay"[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/);
  assert.match(html, /id="infoButton"[\s\S]*?aria-expanded="false"/);
  assert.match(html, /aria-label="프로젝트 닫기"/);
  assert.match(html, /function openInfo\(\)/);
  assert.match(html, /function closeInfo\(\)/);
  assert.match(html, /activeProjectTrigger\.focus\(\)/);
});


test("inline project script parses successfully", () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/);

  assert.ok(script, "inline script should exist");
  assert.doesNotThrow(() => new Function(script[1]));
});


test("responsive and reduced-motion safeguards remain enabled", () => {
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.project-header\s*\{[\s\S]*?position: sticky;[\s\S]*?top: 0;/);
  assert.match(css, /\.project-grid--two,[\s\S]*?\.project-grid--three\s*\{[\s\S]*?grid-template-columns: 1fr;/);
});
