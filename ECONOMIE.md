# ÉCONOMIE — les taux de drop (la maison gagne toujours) `[F-103]` `[F-105]`

> Principe : le tirage est aléatoire, mais **chaque type de boule a sa table calculée**. La valeur rendue en moyenne reste sous 100 % du prix : c'est la marge de la maison.
> **Version 2 (24 nov.)** : les multiplicateurs ont été rendus plus attirants `[F-105]`. Rare = remboursé, Legendary x5, Jackpot x10.
> La marge est tenue par **les probabilités** des gros paliers.
> Les taux sont **publics** sur le site : c'est l'argument de confiance.

## Ce qu'on tire
- Le **multiplicateur** = la valeur des 5 tokens achetés à l'ouverture ÷ le prix de la boule, au moment de l'ouverture.
- Ensuite, les tokens bougent : ils sont au joueur, ce n'est plus notre risque.

## Les multiplicateurs (les mêmes pour toutes les boules)

| Rareté | Multiplicateur | Ce que ça veut dire |
|---|---|---|
| Common | **x0,5** | La moitié du prix en vrais tokens (jamais de boule vide) |
| Rare | **x1** | Remboursé |
| Epic | **x1,8** | Presque le double |
| Legendary | **x5** | Cinq fois le prix |
| Jackpot | **x10** | Dix fois le prix |

## Les probabilités (v3 : chaque boule a sa personnalité) `[F-111]`

| Rareté | **MINI 0,1 SOL** | **MEGA 0,5 SOL** | **GOLD 1 SOL** |
|---|---|---|---|
| Common | 55 % | 66,4 % | 76,2 % |
| Rare | 33 % | 21,1 % | 11,8 % |
| Epic | 10 % | 9 % | 7 % |
| Legendary | 1,7 % | 2,7 % | 3,8 % |
| Jackpot | 0,3 % | 0,8 % | 1,2 % |
| **x5 ou mieux** | **1 sur 50** | **1 sur 29** | **1 sur 20** |
| Au moins remboursé (Rare et +) | 45 % | 33,6 % | 23,8 % |
| **Rendu moyen (joueur)** | **90 %** | **92 %** | **93,5 %** |
| **Marge maison** | **10 %** | **8 %** | **6,5 %** |

- **La Mini** est la boule « tranquille » : près d'une fois sur deux, tu récupères au moins ta mise.
- **La Gold** est la boule « gros coups » : 2,5 fois plus de chances que la Mini de faire x5 ou mieux, et 4 fois plus de Jackpot. En échange, il y a plus de Common.
- Le chiffre mis en avant sur le site, c'est **« x5 or better: 1 in N »**, parce que c'est ce qui fait acheter.

Pourquoi ce changement : en v2, les trois tables étaient presque identiques (Legendary 1,8 / 1,9 / 2 %), donc rien ne justifiait de payer plus cher. Avec des multiplicateurs fixes, on ne peut monter les gros paliers qu'en échange de plus de Common : c'est ce que fait la Gold.

## Pourquoi la maison gagne
1. **La marge est prise en moyenne à chaque boule.** Sur 300 000 boules simulées par type :
   - +10,0 SOL par tranche de 1 000 Mini ;
   - +38,7 SOL par tranche de 1 000 Mega ;
   - +66,8 SOL par tranche de 1 000 Gold.
2. **Les paliers sont fixes, au plus x10** : une boule ne peut jamais coûter plus de 10 fois son prix.
3. **Il faut une réserve au lancement**, pour absorber une série de Legendary ou de Jackpot. Simulation sur 2 000 boules d'un même type (2 000 essais) :

   | Boule | Creux à 95 % | Pire cas observé |
   |---|---|---|
   | Mini | 1,5 SOL | 3,5 SOL |
   | Mega | 14 SOL | 57 SOL |
   | Gold | 45 SOL | 108 SOL |

   → On lance avec une réserve d'au moins **~80 SOL**, ou on n'ouvre les Gold qu'une fois la réserve constituée par les Mini et les Mega. La Gold est plus volatile qu'en v2 : c'est le prix de ses gros coups.
4. **Plafond par boule :** une boule n'achète jamais plus que la liquidité disponible. Si les tokens tirés ne suffisent pas, le reste est rendu en SOL.

## Où va la marge
- Sur ~10 % de marge d'une Mini : la moitié rachète et brûle le token du projet toutes les heures (registre public), l'autre moitié paie les coûts (RPC, achats, serveurs) et alimente la réserve.

## Honnêteté (règles du projet)
- Les tables sont publiées sur le site, et le tirage est prouvable : graine publiée avant l'achat.
- Pas de « boule vide » : même une Common rend la moitié du prix en vrais tokens.
- L'animation de la page d'accueil montre un exemple de tirage (Epic). Ce n'est pas un tirage réel, et la page ne le présente pas comme un gain réel de quelqu'un.

## Historique
- **v2** (24 nov.) : Legendary 1,8 / 1,9 / 2 %, Jackpot 0,3 / 0,4 / 0,5 %, rendu 89,95 / 91,35 / 92,75 %. Les trois boules se ressemblaient trop `[F-111]`.
- **v1** (24 nov.) : Common x0,5, Rare x0,9, Epic x1,8, Legendary x4, Jackpot = la cagnotte (progressif). Jugée « pas folle » par toi `[F-105]`.
