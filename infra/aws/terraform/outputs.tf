output "aws_region" {
  value = var.aws_region
}

output "alb_dns_name" {
  description = "HTTP URL host (use http:// prefix for API and SPA until you add ACM + HTTPS)."
  value       = aws_lb.app.dns_name
}

output "ecr_repository_url" {
  description = "ECR base URI for docker push (no tag)."
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.app.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "ecs_task_definition_family" {
  value = aws_ecs_task_definition.app.family
}

output "github_actions_role_arn" {
  description = "Set as GitHub secret AWS_ROLE_TO_ASSUME for OIDC deploy workflow."
  value       = aws_iam_role.github_actions.arn
}

output "github_oidc_provider_arn" {
  description = "OIDC provider ARN used by the GitHub Actions role (created or existing)."
  value       = local.github_oidc_provider_arn
}

output "ssm_parameter_names" {
  description = "Create each as SecureString before the service can run (see README)."
  value       = [for k in local.ssm_secret_names : "/${var.ssm_parameter_prefix}/${k}"]
}
