# ============================================
# CONFIGURATION TERRAFORM
# ============================================
# Cette infrastructure crée :
#   - Une clé SSH
#   - Un Security Group (pare-feu)
#   - Une instance EC2 qui s'auto-déploie via user_data
#
# Commandes :
#   terraform init    → Préparer le projet
#   terraform plan    → Voir ce qui va être créé
#   terraform apply   → Créer les ressources
#   terraform destroy → Tout supprimer
# ============================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Trouver automatiquement la dernière AMI Amazon Linux 2023 ──
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# ════════════════════════════════════════
# RESSOURCE 1 : Clé SSH
# ════════════════════════════════════════
resource "aws_key_pair" "tp_api_keypair" {
  key_name   = var.key_pair_name
  public_key = file(var.public_key_path)

  tags = {
    Name    = var.key_pair_name
    Project = "tp-api-nodejs"
  }
}

# ════════════════════════════════════════
# RESSOURCE 2 : Security Group (pare-feu)
# ════════════════════════════════════════
resource "aws_security_group" "tp_api_sg" {
  name        = "tp-api-sg"
  description = "Pare-feu pour le TP API Node.js"

  # SSH — uniquement depuis votre IP
  ingress {
    description = "SSH depuis mon IP uniquement"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  # API Node.js — public
  ingress {
    description = "API + Frontend Node.js"
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP standard (au cas où on ajoute un reverse proxy plus tard)
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Sortie : tout autorisé
  egress {
    description = "Tout le trafic sortant"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "tp-api-sg"
    Project = "tp-api-nodejs"
  }
}

# ════════════════════════════════════════
# RESSOURCE 3 : Instance EC2 (auto-deploy via user_data)
# ════════════════════════════════════════
resource "aws_instance" "tp_api" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.tp_api_keypair.key_name
  vpc_security_group_ids = [aws_security_group.tp_api_sg.id]

  # Profil IAM pour AWS Academy (laisser commenté si vous n'êtes pas en Academy)
  iam_instance_profile = "LabInstanceProfile"

  # 🪄 Magie : on injecte le script de bootstrap
  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    app_repo    = var.app_repo
    app_branch  = var.app_branch
    app_port    = var.app_port
    mongodb_uri = var.mongodb_uri
  })

  # Forcer le remplacement de l'instance si user_data change
  user_data_replace_on_change = true

  tags = {
    Name        = var.instance_name
    Project     = "tp-api-nodejs"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  depends_on = [aws_security_group.tp_api_sg]
}
