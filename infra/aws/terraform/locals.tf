locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # Container secrets pulled from SSM Parameter Store (SecureString). Create these in AWS before the service stabilises.
  ssm_secret_names = [
    "JWT_SECRET",
    "DATA_ENCRYPTION_KEY",
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "ANTHROPIC_API_KEY",
    "FRONTEND_ORIGIN",
  ]

  container_secrets = [
    for k in local.ssm_secret_names : {
      name      = k
      valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.ssm_parameter_prefix}/${k}"
    }
  ]
}
