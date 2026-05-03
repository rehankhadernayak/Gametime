output "aws_region" {
  value = var.aws_region
}

output "alb_dns_name" {
  description = "ALB hostname (use http:// until HTTPS + custom domain are live)."
  value       = aws_lb.app.dns_name
}

output "alb_http_url" {
  description = "Full HTTP base URL for the load balancer (Vercel env / integration tests until DNS is ready)."
  value       = "http://${aws_lb.app.dns_name}"
}

output "api_https_url" {
  description = "HTTPS origin for the API once DNS + certificate validation have completed."
  value       = "https://${var.api_certificate_domain}"
}

output "api_acm_certificate_arn" {
  description = "ARN of the validated ACM certificate attached to the HTTPS listener."
  value       = aws_acm_certificate_validation.api.certificate_arn
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
