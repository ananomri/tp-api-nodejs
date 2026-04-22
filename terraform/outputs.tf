# ============================================
# OUTPUTS — Affichés après terraform apply
# ============================================

output "instance_public_ip" {
  description = "Adresse IP publique du serveur"
  value       = aws_instance.tp_api.public_ip
}

output "frontend_url" {
  description = "🎓 URL de l'application (frontend + API)"
  value       = "http://${aws_instance.tp_api.public_ip}:${var.app_port}"
}

output "api_url" {
  description = "URL de l'API"
  value       = "http://${aws_instance.tp_api.public_ip}:${var.app_port}/api"
}

output "health_url" {
  description = "Endpoint de health check"
  value       = "http://${aws_instance.tp_api.public_ip}:${var.app_port}/health"
}

output "ssh_command" {
  description = "Commande pour se connecter en SSH"
  value       = "ssh -i ${var.private_key_path} ec2-user@${aws_instance.tp_api.public_ip}"
}

output "view_bootstrap_logs" {
  description = "Commande pour voir les logs du bootstrap"
  value       = "ssh -i ${var.private_key_path} ec2-user@${aws_instance.tp_api.public_ip} 'sudo tail -f /var/log/cloud-init-output.log'"
}

output "view_app_logs" {
  description = "Commande pour voir les logs de l'app (PM2)"
  value       = "ssh -i ${var.private_key_path} ec2-user@${aws_instance.tp_api.public_ip} 'pm2 logs academie'"
}

output "instance_id" {
  description = "Identifiant du serveur EC2"
  value       = aws_instance.tp_api.id
}
