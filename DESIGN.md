# DESIGN — Packs (nom de travail)

## L'idée visuelle forte
> **L'ouverture du pack.**
> - On déchire, 5 cartes sortent, et la rareté se révèle par la lumière et le reflet.
> - Ensuite, chaque carte vit : son multiplicateur bouge en direct.
>
> Sur la landing, ce même geste raconte la mécanique au scroll `[F-039]` `[F-044]` `[F-047]`. Le marché du gacha n'a aucune DA forte `[F-099]` : c'est là qu'on gagne.

## Direction actuelle : « Cartoon » `[F-103]` `[F-104]`

> Référence : Frenly Pandas (Behance). Analyse dans [analyses/frenly-pandas](../../analyses/frenly-pandas/ANALYSE.md).

- **Un seul univers :** la machine et ses boules. Plus de cartes ni de sachets.
- **La machine est un personnage :**
  - rendu par aplats (toon) avec contours marine ;
  - corps jaune soleil, dôme de verre, panneau en bois « shiny » ;
  - **des yeux qui suivent la souris et clignent**, des joues roses ;
  - un écran « 0.1 SOL » ;
  - un petit rebond permanent.
- **Les boules :** une moitié de couleur de rareté marquée d'étoiles, une moitié blanche, une bande marine. Rareté : blanc, bleu `#4FB3FF`, violet `#C47DFF`, or `#FFC233`, rose `#FF7AB6` pour le jackpot.
- **L'ouverture (le grand moment) :**
  1. la manivelle fait deux tours, la machine se trémousse ;
  2. la boule sort par la trappe et rebondit, la machine la suit des yeux ;
  3. elle saute vers nous, gigote de plus en plus ;
  4. POP : anneau et étoiles ;
  5. les 5 jetons des vrais tokens jaillissent en arc ;
  6. une carte annonce le résultat, tiré dans la vraie table MINI et marqué « démo ».
- **Couleurs :** bleu ciel `#8FD3F0`, rose `#FFA4B2`, encre marine `#0B2A3C`, crème `#FFF8EC`, jaune `#FFD23F`, herbe et bois.
- **Polices :** Luckiest Guy (titres autocollants cernés) et Poppins.
- **Animations :** défilement fluide (Lenis) ; lettres des titres qui tombent et rebondissent (GSAP) ; nuages qui défilent ; bandeaux marine ; cartes papier à trombone avec ombres dures.
- **Page :** `site/index.html` (modèle `site/candy.template.html`), en ligne sur https://claude.ai/artifact/WSNCwbBN16BVwGcvVTsAWn
- **Versions précédentes :** `site/v1-studio-gacha.html`.

## Ancienne direction : « Studio Gacha » `[F-102]`
- **Concept :** la machine à capsules est un produit photographié en studio. Laquée citron vert, dôme de verre, chrome, avec le **prix écrit sur la plaque** : on comprend le projet en un regard.
- **Fond :** un studio cobalt (`#1C33E6` → `#050A2E`).
- **Rareté :** perle `#E8ECFA`, cyan `#00C8FF`, magenta `#FF1FC4`, or `#FFB000`. Ce sont les couleurs des capsules, des cadres de cartes et des halos (référence : la plateforme de caisses CS2 sur Behance).
- **Polices :** Unbounded (titres), Inter Tight (texte), JetBrains Mono (chiffres).
- **3D sur mesure (three.js, sans modèle externe) :**
  - au scroll, la manivelle tourne, la capsule sort, s'ouvre et les 5 vraies cartes jaillissent ;
  - des sachets bombés et irisés (Starter, Booster, Elite).
- **Cartes holo :** adaptées du composant 21st.dev « Holographic Foil Card ».
- **Références Behance :**
  - « CS2 case opening platform » : les halos de rareté ;
  - « Crush » : l'emballage en produit-héros sur fond de studio saturé.
- **Page :** `site/index.html`, en ligne sur https://claude.ai/artifact/WSNCwbBN16BVwGcvVTsAWn
- La planche B « Gachapon Tokyo » est rejetée : couleurs et rendu plat jugés nuls.

## Trois directions artistiques (première proposition)

**Planches visuelles** (toile de design, 3 planches 1440×960, vrais tokens) : https://claude.ai/artifact/STGxrojHwzA5Pz7jTLgKjB

### A. « Holo Vault » — le classeur de collection, de nuit
- **Ressenti :** premium, rare, précieux ; le moment où la lumière accroche une carte holo.
- **Univers :**
  - des pages de classeur en velours noir et des pochettes plastique ;
  - **le reflet holographique** suit la souris, ou l'inclinaison du téléphone, comme une vraie carte ;
  - il n'apparaît que sur les raretés : la couleur porte le sens `[F-008]`.
- **Palette** (« mono + couleur sémantique ») :
  - encre `#0B0B10`, papier `#F4F1EA` ;
  - le spectre holo (cyan → violet → or) réservé aux Epic et Legendary ;
  - le gris argenté pour les Common.
- **Typo :**
  - un display condensé et lourd pour les noms de tokens, comme sur les cartes ;
  - une sans-serif lisible pour le texte ;
  - une mono pour les CA et les cotes.
- **Visuel signature :** le pack fermé, scellé et brillant ; la bande se déchire au scroll, les cartes sortent en éventail, et la Legendary s'allume en dernier.
- **Nom qui colle le mieux :** Foil.

### B. « Gachapon Tokyo » — la machine à capsules de nuit
- **Ressenti :** joyeux, addictif, culture japonaise ; on tourne la manivelle.
- **Univers :**
  - une vraie machine à capsules (gashapon) au coin d'une rue de Tokyo ;
  - des capsules en plastique de couleur, une manivelle, des néons ;
  - des étiquettes d'emballage japonaises (avec du katakana en accent, jamais pour le sens).
- **Palette :**
  - crème `#F6EEDC`, rouge tomate `#E5483B`, bleu nuit `#1B2440` ;
  - capsules pastel selon la rareté.
- **Typo :**
  - un display arrondi et gras, façon jouet ;
  - une sans-serif lisible ;
  - une mono pour les CA.
- **Visuel signature :** on tourne la manivelle au scroll, la capsule tombe, s'ouvre et révèle 5 cartes.
- **Nom qui colle le mieux :** Shiny.

### C. « Print Shop » — l'emballage du booster
- **Ressenti :** brut, graphique, unique ; le site **est** un emballage de booster.
- **Univers :**
  - des bords sertis en aluminium et une bande d'ouverture qui sert d'élément d'interface ;
  - des trames de demi-teinte, un léger décalage de couleurs (CMJN), des textures de risographie ;
  - des marques de coupe et de calage.
- **Palette :**
  - les encres d'imprimerie : cyan, magenta, jaune et noir sur papier kraft `#D9C9A8` ;
  - une seule encre forte par écran ; le noir porte le texte.
- **Typo :**
  - une grotesque suisse très grasse pour les titres ;
  - une sans-serif pour le texte ;
  - une mono pour les cotes, comme les mentions légales d'un emballage.
- **Visuel signature :** la page se déchire en suivant la bande d'ouverture au scroll ; les cartes sortent imprimées, avec un léger décalage de couleur.
- **Nom qui colle le mieux :** Tear.

## Règles qui s'appliquent quelle que soit la DA
- Logo, mascotte et maquettes : je fais les **prompts ChatGPT**, tu génères `[F-024]`.
- Composants via 21st.dev, restylés `[F-006]`.
- 9/10 minimum sur les 12 critères du [playbook](../../DESIGN_PLAYBOOK.md) `[F-013]`.
- **De vrais tokens** dans toutes les démos : vrais noms, vrais logos, vrais multiplicateurs `[F-084]`.
- **Rien d'« IA »** : ni puces décoratives, ni étiquettes en capitales espacées, ni mot en dégradé dans chaque titre `[F-083]`.
- **Sobre ≠ statique :** des animations riches, pilotées par le scroll `[F-085]`.
- Le clic réagit tout de suite : l'ouverture du pack **est** l'écran de chargement, avec les vraies étapes (paiement confirmé → tirage → achat des 5 tokens) `[F-059]`.

## Décisions
- DA retenue : _(en attente)_
