// Construit public/index.html depuis la maquette (../site/candy.template.html + tokens.js)
// et y branche le vrai tirage (public/play.js).
import fs from "node:fs";

const site = new URL("../../site/", import.meta.url);
// sur Vercel sans le dossier site (déploiement du seul dossier app) : on garde public/index.html déjà construit
if (!fs.existsSync(new URL("candy.template.html", site))) { console.log("../site absent : public/index.html conservé"); process.exit(0); }
const tpl = fs.readFileSync(new URL("candy.template.html", site), "utf8");
const tokens = fs.readFileSync(new URL("tokens.js", site), "utf8");
let html = tpl.replace("__TOKENS__", tokens);
if (!html.includes("</body>")) throw new Error("</body> introuvable");
html = html.replace("</body>", '<script type="module" src="/play.js"></script>\n</body>');
fs.writeFileSync(new URL("../public/index.html", import.meta.url), html);
console.log("public/index.html construit (" + Math.round(html.length / 1024) + " Ko)");
