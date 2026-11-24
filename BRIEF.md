# BRIEF — Packs (nom de travail)

## En une phrase
> On ouvre un pack de 0,1, 0,5 ou 1 SOL et on reçoit 5 vrais memecoins Solana, tirés au sort par rareté et achetés à l'instant. On garde pour viser le moonshot, ou on revend tout en un clic.

## Idée d'origine
ID-006 dans [idees/IDEES.md](../../idees/IDEES.md), note **8,5/10**, choisie le 24 nov. 2026 `[F-101]`.
- C'est le schéma du gacha `[F-099]` `[F-100]` transposé aux memecoins :
  - une raison d'acheter immédiate (le tirage) ;
  - une valeur réelle récupérable (de vrais tokens) ;
  - des cotes tirées du marché ;
  - un token qui reçoit la marge.
- Veille : [2026-11-24](../../veille/2026-11-24-meta-collectibles.md).
  - Le gacha de cartes fait ~35 M$ de revenu par mois, pump.fun l'a intégré le 19 oct.
  - Aucun « pack de memecoins » n'existe.

## Le problème
- Trouver le prochain runner demande des heures sur les terminaux, et 98 % des lancements meurent ou rug.
- Les petits joueurs veulent le frisson du « coup de chance » sans passer leur nuit sur Axiom.
- Le gacha de cartes a montré qu'on paie volontiers pour **le tirage**, si la valeur reçue est réelle et publiée.

## La cible
- Les degens occasionnels qui veulent jouer petit (0,1 SOL).
- Les gros ouvreurs : 20 wallets font 92 % des ouvertures de packs de cartes chez Collector Crypt.
- Les communautés : packs à thème, crews, saisons.

## La mécanique (cœur du produit)

| Pack | Prix | Contenu |
|---|---|---|
| Starter | 0,1 SOL | 5 tokens |
| Booster | 0,5 SOL | 5 tokens, meilleures chances de rare |
| Elite | 1 SOL | 5 tokens, au moins 1 Epic garanti |

**Raretés**, composées en direct :

| Rareté | Ce qu'on tire | Filtre |
|---|---|---|
| Common | Lancements pump.fun de moins de 24 h | Verdict Vigil **Clean (traçage complet)**, liquidité minimale |
| Rare | Coins migrés dans les 7 derniers jours | Clean, volume 24 h minimal |
| Epic | Top tendance du jour | Liquidité ≥ 250 k$ |
| Legendary | Gros memes établis (BONK, WIF…) ou jackpot en SOL | — |

**Valeur :**
- 95 % du prix du pack part en tokens. La valeur attendue est **publiée et vérifiable**, pack par pack.
- 5 % de frais : la moitié rachète et brûle le token du projet toutes les heures (registre public), l'autre moitié paie les coûts.
- Les frais sont affichés en clair `[F-041]`.

**Tirage prouvable (provably fair) :**
1. Avant l'achat, le serveur publie l'empreinte de sa graine secrète.
2. Le tirage = graine du serveur + signature de la transaction d'achat de l'utilisateur. La composition ne peut donc pas être choisie après coup, ni par nous, ni par l'acheteur.
3. Après l'ouverture, la graine est révélée et chacun peut refaire le tirage.

**Après l'ouverture :**
- Les 5 tokens arrivent dans le wallet de l'utilisateur.
- Chaque carte affiche son multiplicateur en direct.
- Bouton « tout revendre » (Jupiter, depuis le wallet de l'utilisateur).

## Fonctionnalités clés (MVP)
1. **Ouvrir un pack :** paiement en une signature, tirage prouvable, achat des 5 tokens, ouverture animée.
2. **Le classeur :** les tokens tirés, leur multiplicateur depuis l'ouverture, le bouton « tout revendre ».
3. **Le classement :** meilleur tirage du jour en multiplicateur, plus gros gain, séries.
4. **Les cartes de tirage partageables** (image OG) : « J'ai tiré $XYZ, x34 depuis ».
5. **La page transparence :** valeur attendue de chaque pack, cotes, registre des rachats et burns, graines du tirage.

## Ce qui le rend différent
- **Ça n'existe pas.** Le gacha est réservé aux cartes physiques ; ici, la valeur est liquide à la seconde et peut faire x50.
- **Le filtre anti-rug de Vigil :** les Common sont des lancements propres, pas des bundles.
- **Une DA très poussée** `[F-099]` : l'ouverture du pack est le moment wow, et le marché du gacha n'a aucune DA forte.

## Pages
- **Landing :** la mécanique montrée au scroll (le pack se déchire → 5 cartes → cotes → valeur attendue).
- **App :** la boutique de packs, l'ouverture, le classeur, le classement.
- **Page transparence**, et une page par tirage (lien partageable).

## Tech Solana utilisée
- **Paiement :** une transaction signée par l'utilisateur (SOL vers le coffre du projet).
- **Achat des tokens :** API Jupiter, via des bundles Jito pour ne pas se faire devancer. Les tokens partent ensuite vers l'utilisateur (garde de quelques secondes, registre public).
- **Plus tard :** un programme Anchor avec aléa Switchboard VRF, pour supprimer cette garde.
- **Composition des raretés :** pump.fun, DexScreener et le moteur anti-rug de Vigil (déjà en ligne).
- **Plafonds de liquidité :** un achat ne dépasse jamais un petit pourcentage du pool du token, pour limiter le glissement de prix.
- **Pas de devnet possible** (les memecoins n'y existent pas) : tests sur mainnet avec des packs de 0,01 SOL, sur liste blanche.

## Risques
| Risque | Réponse |
|---|---|
| Un Common s'effondre après le tirage | Filtre Vigil (Clean confirmé), cotes et valeur attendue publiées, la Legendary amortit |
| Lecture « jeu d'argent » | On reçoit des actifs à pleine valeur (95 %), cotes publiques, aucun pack « vide ». Restrictions géographiques à décider |
| Glissement de prix, MEV | Plafond par pool, bundles Jito, prix au moment de l'achat affiché sur la carte |
| Garde des fonds pendant l'achat | Quelques secondes, registre public ; programme on-chain ensuite |

## Noms proposés
> En anglais `[F-020]` · le nom appelle un logo évident `[F-021]` · .fun pour un jeu ou un launchpad `[F-022]` · domaines vérifiés le 24 nov. (RDAP) · homonymes vérifiés sur DexScreener

| Nom | Sens | Logo | Ambiance | Domaine |
|---|---|---|---|---|
| **Foil** | La carte holographique, celle qu'on rêve de tirer | Une carte dont le coin se décolle et révèle le reflet holo | Premium, collection | getfoil.fun ✅ · foilpack.fun ✅ · foil.fun ❌ pris |
| **Tear** | L'action : déchirer le pack | Une ligne en zigzag qui coupe un carré, comme la bande d'ouverture d'un booster | Brut, packaging | **tear.fun ✅** (court, rare) |
| **Shiny** | La variante rare, le « shiny » que tout joueur connaît | Une étoile à 4 branches qui scintille | Pop, arcade | shinypull.fun ✅ · shiny.fun ❌ pris |

Écarté : **Pulls** (pulls.fun libre), parce que « pull » évoque le « rug pull » ; un token $PULL s'appelle d'ailleurs « Rug Pull, For Sure ».

## Directions artistiques proposées
Voir [DESIGN.md](DESIGN.md).

## Lancement
Programme X de 12 h : `X_PLAN_12H.md`, sur le modèle de [Vigil](../Vigil/X_PLAN_12H.md) `[F-026]`.
- Le post interactif du matin : « répondez avec votre wallet, on ouvre un pack pour les 10 premiers en live ».

## Décisions
- Nom retenu : _(en attente)_
- DA retenue : _(en attente)_
