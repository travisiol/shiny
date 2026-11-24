# Shiny — le site et son serveur

La page vient de `../site/candy.template.html` (la maquette), construite dans `public/index.html` à chaque `npm run dev` ou `build`. `public/play.js` y branche le vrai tirage. Le fonctionnement est expliqué dans `../TECHNIQUE.md`.

## En local
```
npm install
npm run wallet:new     # une seule fois : crée le wallet de gains (clé secrète dans .env.local, jamais affichée)
npm run dev            # http://localhost:3200
```
En local, `DEV_FAKE_PAYMENTS=true` permet de tester sans payer : une signature qui commence par `SIM-` est acceptée. C'est ignoré en production.

## Les routes
| Route | Rôle |
|---|---|
| `POST /api/round` `{ball, player}` | Ouvre un tirage : empreinte de la graine + transaction de paiement à signer |
| `POST /api/round/:id/paid` `{signature}` | Vérifie le paiement, fait le tirage, achète et envoie les tokens |
| `GET /api/round/:id` | Le tirage public (graine révélée après coup : chacun peut refaire le calcul) |
| `GET /api/log` | Les 50 derniers tirages |
| `GET /api/status` | La machine est-elle ouverte, boule par boule |
| `GET /api/cron/sweep` | Option B : le surplus part vers la trésorerie, toutes les heures |

## Déjà fait (24 nov.)
- Dépôt git local `projets/Packs` (branche `main`), sans aucun secret.
- Projet Vercel **shiny** (compte travios-projects), relié au dossier `app`. Variables déjà posées en production :
  - `TREASURY_WALLET`, `PAY_TO=treasury`, `PAYOUT_MODE=simulate` ;
  - `RESERVE_SOL`, `HOURLY_PAYOUT_CAP_SOL`, `ATA_RENT` ;
  - `CRON_SECRET` (généré, jamais affiché) et `PAYOUT_SECRET`.

## Mise en ligne (à faire par toi)
1. **Base de données :** crée une base Redis gratuite sur upstash.com et note `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`.
2. **GitHub :** crée un dépôt **privé** vide nommé `Shiny` sur github.com/new (sans README). Je pousse le code dessus, puis je le relie à Vercel.
3. **Vercel > shiny > Settings :**
   - **Build > Root Directory** = `app` ;
   - **Environment Variables :** ajoute `SOLANA_RPC_URL` et `JUPITER_API_KEY` (les mêmes que Vigil), ainsi que `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`.
4. **Financer le wallet de gains** `3FD4hsBHS7z4D2nmSmi7nMH1wdGQ2RbrT9EdK5dUCFUx` depuis Phantom. La machine refuse une boule tant que ce wallet ne peut pas payer son pire cas (x10) :
   - plus de 1,05 SOL pour ouvrir la Mini ;
   - plus de 5,05 SOL pour la Mega ;
   - plus de 10,05 SOL pour la Gold.
5. Laisse `PAYOUT_MODE=simulate`, fais un vrai paiement d'une Mini pour vérifier le parcours, puis passe à `PAYOUT_MODE=live` et refais un essai.
