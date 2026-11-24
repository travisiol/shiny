/**
 * brand.config.ts — LE SEUL fichier à modifier pour rebrander le projet.
 * Aucun composant ne doit contenir de couleur, de nom ou de texte marketing en dur.
 * Pour changer de palette : copier un bloc depuis Tech Maker/PALETTES.md dans `palette`.
 */

export const brand = {
  name: "NomDuProjet",
  tagline: "Une phrase qui claque.",
  description: "Description SEO du projet (150–160 caractères).",
  domain: "nomduprojet.xyz",

  logo: {
    light: "/brand/logo-light.svg",
    dark: "/brand/logo-dark.svg",
    mark: "/brand/mark.svg", // icône seule
  },
  favicon: "/brand/favicon.ico",
  ogImage: "/brand/og.png",

  // Palette : copiée depuis PALETTES.md (ici : Solar Flare)
  palette: {
    bg: "#0C0A09",
    surface: "#171412",
    "surface-2": "#221D1A",
    border: "#2E2723",
    text: "#F5F1EE",
    muted: "#A8A09A",
    primary: "#FF7A1A",
    "on-primary": "#140A02",
    accent: "#FFD166",
    success: "#4ADE80",
    danger: "#F87171",
    warning: "#FBBF24",
  },

  fonts: {
    display: "Space Grotesk",
    body: "Inter",
    mono: "JetBrains Mono",
  },

  radius: "12px",
  style: "minimal" as "minimal" | "glass" | "brutal" | "editorial",

  socials: {
    x: "",
    telegram: "",
    discord: "",
  },

  copy: {
    heroTitle: "Titre principal",
    heroSubtitle: "Sous-titre qui explique la valeur.",
    ctaPrimary: "Lancer l'app",
    ctaSecondary: "En savoir plus",
  },

  network: "devnet" as "devnet" | "mainnet-beta",
} as const;

/** Injecte la palette en variables CSS (--bg, --primary, …) — à appeler dans le layout racine. */
export function brandCssVars(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(brand.palette).map(([k, v]) => [`--${k}`, v]),
  );
}

export type Brand = typeof brand;
