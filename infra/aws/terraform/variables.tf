variable "aws_region" {
  type        = string
  description = "AWS region for all resources (e.g. ap-southeast-1)."
  default     = "ap-southeast-1"
}

variable "environment" {
  type        = string
  description = "Short environment name used in resource names and SSM prefix."
  default     = "prod"
}

variable "project_name" {
  type        = string
  description = "Prefix for named AWS resources."
  default     = "gametime"
}

variable "github_org" {
  type        = string
  description = "GitHub organisation or user that owns the repository (for OIDC trust)."
}

variable "github_repo" {
  type        = string
  description = "Repository name only, without org (for OIDC trust)."
}

variable "existing_github_oidc_provider_arn" {
  type        = string
  description = "If set (non-empty), reuse this IAM OIDC provider ARN for GitHub Actions instead of creating aws_iam_openid_connect_provider.github. Required when the account already has token.actions.githubusercontent.com."
  default     = ""
}

variable "container_port" {
  type        = number
  description = "Container listen port (Railway-style image uses 8080 for Nginx)."
  default     = 8080
}

variable "desired_count" {
  type        = number
  description = "Number of Fargate tasks to run."
  default     = 1
}

variable "task_cpu" {
  type        = number
  default     = 512
}

variable "task_memory" {
  type        = number
  default     = 1024
}

variable "ssm_parameter_prefix" {
  type        = string
  description = "Prefix for SSM SecureString paths (no leading slash). ECS reads /prefix/KEY."
  default     = "gametime/prod"
}
