// Copy dist/index.html to dist/404.html for GitHub Pages SPA routing fallback
import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

const distDir = resolve("dist")
const indexPath = resolve(distDir, "index.html")
const notFoundPath = resolve(distDir, "404.html")

const html = readFileSync(indexPath, "utf8")
writeFileSync(notFoundPath, html)
console.log("Created dist/404.html for GitHub Pages SPA fallback")
