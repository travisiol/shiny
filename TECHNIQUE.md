# TECHNIQUE — ce qu'il y a derrière le site `[F-115]`

> Statut (24 nov.) : **codé et testé en local** dans `projets/Packs/app` (mode simulation, faux paiements). Pas encore en ligne. Voir `app/README.md` pour la mise en ligne.
> - Décision 1 : **wallet de gains séparé** `3FD4hsBHS7z4D2nmSmi7nMH1wdGQ2RbrT9EdK5dUCFUx` (clé uniquement dans `.env.local` / Vercel).
>   - Flux réglé sur **A** (`PAY_TO=treasury`) : les paiements arrivent sur `AQKq…`.
>   - Pour passer en **B** (`PAY_TO=payout`) : le wallet de gains encaisse et reverse le surplus chaque heure.
> - Décision 2 : `ATA_RENT=deduct` par défaut (l'ouverture des comptes est prise sur la valeur achetée, et ce SOL reste au joueur).
> - Décision 3 (légal) : toujours ouverte.

## 1. Le parcours d'un tirage

1. Le joueur connecte son wallet (Phantom, Solflare, Backpack) et choisit sa boule.
2. **Le serveur verrouille la graine.** Il tire une graine secrète et en donne l'empreinte (hash) au joueur *avant* le paiement, avec un numéro de tirage.
3. **Paiement.** Le serveur prépare une transaction : *joueur → trésorerie, prix exact de la boule*, avec un mémo contenant le numéro du tirage. Le joueur signe dans son wallet.
4. **Vérification.** Le serveur lit la transaction sur la chaîne et vérifie :
   - qu'elle est confirmée ;
   - qu'elle part bien de ce joueur ;
   - qu'elle va à la trésorerie, pour le bon montant ;
   - que le mémo est le bon ;
   - que cette signature n'a jamais servi.
5. **Tirage.** Rareté = HMAC-SHA256(graine secrète, signature du paiement), appliqué à la table de la boule (ECONOMIE.md v3). La graine est révélée ensuite : tout le monde peut refaire le calcul (c'est ce que promet le site).
6. **Envoi.** Valeur à acheter = prix × multiplicateur.
   - Le serveur choisit 5 tokens dans une liste fermée (liquides, routables par Jupiter) et partage la valeur entre eux.
   - Il les achète via l'API Jupiter et les fait arriver directement dans le wallet du joueur.
7. **L'animation** de la machine tourne pendant les étapes 4 à 6 et s'ouvre sur le vrai résultat.

## 2. Les deux wallets

| Wallet | Rôle | Qui a la clé |
|---|---|---|
| **Trésorerie** `AQKq…UCwp` | Reçoit tous les paiements | Toi seul. Le serveur ne l'a jamais. |
| **Wallet de gains** (à créer) | Achète les tokens et les envoie aux joueurs | Le serveur (variable secrète sur Vercel) |

Pourquoi deux : pour acheter et envoyer des tokens, le serveur doit pouvoir signer. On ne met **jamais** la clé de ton wallet principal sur un serveur : en cas de fuite, tout part. Le wallet de gains ne contient que la réserve (~80 SOL au lancement, ECONOMIE.md). Tu le recharges depuis la trésorerie.

## 3. L'adresse de la trésorerie

- Elle n'est **affichée nulle part sur le site** (ni texte, ni code visible de la page). Le serveur l'ajoute dans la transaction au moment du paiement.
- **Ce qu'on ne peut pas cacher :** le wallet du joueur affiche le destinataire au moment de signer, et la chaîne Solana est publique. Le cacher davantage (adresses intermédiaires, transactions maquillées) ferait passer le site pour un drainer. Phantom et Blowfish le bloqueraient avec un écran rouge.

## 4. Pile technique (la même que Vigil)

- **Site et serveur :** Next.js sur Vercel. La page actuelle devient la page d'accueil, plus un bouton « Connect wallet ».
- **Chaîne :** RPC Helius ; lecture et vérification des transactions avec `@solana/web3.js`.
- **Achats :** API Jupiter (quote + swap), avec `destinationTokenAccount` = compte du joueur.
- **Base de données :** une table des tirages (Postgres Neon ou Upstash Redis). La signature est unique, ce qui empêche de rejouer un paiement.
- **Sécurité :**
  - clé du wallet de gains uniquement dans les variables Vercel ;
  - plafond d'envoi par tirage et par heure ;
  - arrêt automatique si la réserve passe sous un seuil ;
  - registre public des tirages (graine, signature, résultat).

## 5. Les décisions à prendre

1. **Wallet de gains.** Le serveur a besoin d'un wallet qu'il peut faire signer, séparé de `AQKq…`. Je le génère, tu le finances. Alternative : les paiements arrivent sur ce wallet et le serveur reverse la marge à `AQKq…` chaque heure.
2. **Le coût caché de la Mini.** Chaque token qu'un joueur n'a jamais eu demande d'ouvrir un compte : 0,00204 SOL. Avec 5 tokens, ça fait jusqu'à **0,0102 SOL par boule**, soit **10 % du prix d'une Mini, autant que toute la marge**. Ce SOL reste au joueur : il le récupère s'il ferme le compte. Options :
   - le compter dans la valeur rendue ;
   - passer la Mini à 0,2 SOL ;
   - mettre 3 tokens dans la Mini.
3. **Le cadre légal.** Payer pour un tirage au hasard qui rapporte de la valeur, c'est juridiquement un **jeu d'argent** dans la plupart des pays. En France, il faut un agrément de l'ANJ, et sans agrément c'est interdit. Au minimum : blocage par pays, 18 ans et plus, CGU. Un avis d'avocat avant le lancement est fortement conseillé. C'est ta décision, mais je la note ici pour qu'elle soit prise en connaissance de cause.

## 6. Ordre de construction (une fois les décisions prises)

1. Monter le projet Next.js, y mettre la page, connecter le wallet.
2. Créer le tirage (graine verrouillée) et préparer la transaction de paiement.
3. Vérifier le paiement et faire le tirage prouvable.
4. Faire les achats Jupiter et l'envoi. D'abord en **mode simulation** (aucun achat réel, résultats écrits en base), puis en réel avec de petits montants. C'est toi qui lances les premiers essais réels.
5. Ajouter le registre public, les plafonds et l'arrêt d'urgence.
6. Déployer sur Vercel.
