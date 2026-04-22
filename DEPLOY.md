# 🚀 Guide de Déploiement — Académie Fullstack

## Architecture finale

```
                        ┌──────────────────────┐
   Browser ───────────► │  EC2 t2.micro        │
   (HTTP :3000)         │  ├─ Node.js 20       │
                        │  ├─ Express + static │
                        │  └─ PM2 (auto-restart)│
                        └──────┬───────────────┘
                               │
                               ▼
                        ┌──────────────────────┐
                        │  MongoDB Atlas       │
                        │  (cluster gratuit M0)│
                        └──────────────────────┘
```

**Pourquoi Atlas et pas MongoDB sur l'EC2 ?**
Une t2.micro a 1 Go de RAM. MongoDB en consomme 500 Mo+ au repos. Tu vas droit dans
le mur de l'OOM-killer dès la première requête lourde. Atlas Free Tier (M0) te donne
512 Mo de stockage, hébergement managé, snapshots auto — gratuit, à vie.

---

## 📋 Pré-requis

- [ ] Compte AWS (Academy ou perso)
- [ ] AWS CLI configuré (`aws configure`)
- [ ] Terraform installé (`terraform -v`)
- [ ] Une paire de clés SSH (`~/.ssh/tp-api-keypair` et `.pub`)
- [ ] Compte MongoDB Atlas

---

## 1️⃣ Configurer MongoDB Atlas (5 min, à faire une fois)

1. Aller sur [cloud.mongodb.com](https://cloud.mongodb.com), créer un compte
2. **Build a Database** → **M0 FREE** → région `us-east-1`
3. **Database Access** → créer un user (ex: `academie-app`) avec mot de passe
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
   - ⚠️ Pour de la vraie prod, restreindre à l'IP de l'EC2. Pour un TP, OK.
5. **Connect** → **Drivers** → copier l'URI
   - Ressemble à : `mongodb+srv://academie-app:XXXX@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority`
   - Ajouter `/academie` avant le `?` pour pointer sur la base "academie"

---

## 2️⃣ Pousser le code sur GitHub

```bash
# Depuis votre projet local
git add .
git commit -m "feat: ajout frontend + bootstrap automatique"
git push origin main
```

Le repo doit être **public** pour que `git clone` sans authent fonctionne dans le user_data.
(Sinon, voir la section "Repo privé" plus bas.)

---

## 3️⃣ Configurer Terraform

```bash
cd terraform/
cp terraform.tfvars.example terraform.tfvars
```

Éditer `terraform.tfvars` :

```hcl
my_ip       = "$(curl -s ifconfig.me)/32"   # remplacer par votre IP
app_repo    = "https://github.com/VOTRE_USERNAME/tp-api-nodejs.git"
app_branch  = "main"
mongodb_uri = "mongodb+srv://academie-app:XXXX@cluster0.../academie?retryWrites=true&w=majority"
```

---

## 4️⃣ Déployer

```bash
terraform init
terraform plan      # vérifier ce qui va être créé
terraform apply     # taper "yes"
```

À la fin (~30 secondes) tu verras :

```
frontend_url        = "http://44.123.45.67:3000"
api_url             = "http://44.123.45.67:3000/api"
ssh_command         = "ssh -i ~/.ssh/tp-api-keypair ec2-user@44.123.45.67"
view_bootstrap_logs = "ssh ... 'sudo tail -f /var/log/cloud-init-output.log'"
view_app_logs       = "ssh ... 'pm2 logs academie'"
```

---

## 5️⃣ Attendre le bootstrap (1–3 minutes)

L'instance démarre IMMÉDIATEMENT, mais le `user_data.sh` met ~2 min pour
installer Node + cloner + npm ci + démarrer PM2.

**Suivre en live** :
```bash
$(terraform output -raw view_bootstrap_logs)
```

Quand tu vois `✅ Bootstrap terminé`, ouvre l'URL :

```bash
open $(terraform output -raw frontend_url)   # macOS
xdg-open $(terraform output -raw frontend_url) # Linux
```

---

## 🔧 Commandes utiles post-déploiement

```bash
# Voir les logs de l'app
$(terraform output -raw view_app_logs)

# SSH dans l'instance
$(terraform output -raw ssh_command)

# Une fois SSH :
pm2 status                  # état du process
pm2 restart academie        # redémarrer
pm2 logs academie --lines 50

# Health check
curl $(terraform output -raw health_url)
```

---

## 🔄 Mettre à jour l'app

**Option A — Pull manuel** (rapide) :
```bash
ssh -i ~/.ssh/tp-api-keypair ec2-user@$(terraform output -raw instance_public_ip)
cd /opt/app && git pull && npm ci --omit=dev && pm2 restart academie
```

**Option B — Recréer l'instance** (clean) :
```bash
terraform taint aws_instance.tp_api
terraform apply
```

**Option C — GitHub Actions CD** : ton workflow `deploy.yml` simule déjà le déploiement.
Pour le rendre réel, ajoute un step qui SSH + pull (plus avancé, hors scope ici).

---

## 🧹 Tout détruire

```bash
terraform destroy
```

Et n'oublie pas d'archiver/supprimer ton cluster Atlas si tu n'en as plus besoin.

---

## 🧪 Tester en local (avant déploiement)

```bash
npm install
npm run dev          # MongoDB en mémoire par défaut
# Ouvre http://localhost:3000
```

---

## 🐛 Troubleshooting

| Symptôme | Cause probable | Solution |
|---|---|---|
| `terraform apply` ok mais URL inaccessible | Bootstrap pas fini | Attendre 2 min, vérifier `view_bootstrap_logs` |
| Page blanche / `Cannot GET /` | `app.js` pas à jour sur le repo | Push, puis `terraform taint` + apply |
| `MongooseServerSelectionError` | URI Atlas incorrect ou IP whitelist manquante | Vérifier `.env` sur l'instance, vérifier Network Access Atlas |
| `EADDRINUSE: 3000` | PM2 lancé deux fois | `pm2 delete all` puis redémarrer |
| Connexion SSH refusée | Votre IP a changé | Mettre à jour `my_ip` dans tfvars + `terraform apply` |

---

## 🔒 Repo privé

Si ton repo est privé, deux options :

**A. Deploy key SSH** : créer une paire SSH dédiée, ajouter la pub comme deploy key
GitHub, et l'injecter via user_data.

**B. Token GitHub** : utiliser `https://oauth2:TOKEN@github.com/user/repo.git`
comme `app_repo`. Marque la variable `sensitive = true`.

---

## 📊 Bonus : surveiller les coûts

```bash
# Vérifier que tu es bien sur t2.micro (free tier)
aws ec2 describe-instances --instance-ids $(terraform output -raw instance_id) \
  --query 'Reservations[0].Instances[0].InstanceType'
```

t2.micro = **750h/mois gratuites** la première année. Ton instance tourne 24/7 = 720h.
**Tu restes dans le free tier** tant que tu n'as qu'une seule instance.
