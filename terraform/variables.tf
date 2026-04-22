# ============================================
# VARIABLES — Paramètres de l'infrastructure
# ============================================

variable "aws_region" {
  description = "Région AWS"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "Taille du serveur EC2"
  type        = string
  default     = "t2.micro"
}

variable "instance_name" {
  description = "Nom du serveur"
  type        = string
  default     = "tp-api-nodejs"
}

variable "key_pair_name" {
  description = "Nom de la clé SSH dans AWS"
  type        = string
  default     = "tp-api-keypair"
}

variable "public_key_path" {
  description = "Chemin vers la clé publique SSH"
  type        = string
  default     = "~/.ssh/tp-api-keypair.pub"
}

variable "private_key_path" {
  description = "Chemin vers la clé privée SSH"
  type        = string
  default     = "~/.ssh/tp-api-keypair"
}

variable "app_port" {
  description = "Port de l'API Node.js"
  type        = number
  default     = 3000
}

variable "my_ip" {
  description = "Votre IP publique (format : x.x.x.x/32)"
  type        = string
  # Pas de défaut — à fournir via terraform.tfvars
}

# ── Variables pour le bootstrap automatique ──

variable "app_repo" {
  description = "URL du repo Git à déployer (HTTPS, public)"
  type        = string
  # Exemple : https://github.com/VOTRE_USERNAME/tp-api-nodejs.git
}

variable "app_branch" {
  description = "Branche Git à déployer"
  type        = string
  default     = "main"
}

variable "mongodb_uri" {
  description = "URI de connexion MongoDB Atlas (mongodb+srv://...)"
  type        = string
  sensitive   = true
}
