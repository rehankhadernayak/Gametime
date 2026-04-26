# AWS: ECS Fargate + ALB + GitHub Actions (OIDC)

This stack runs the **same production image as Railway** (`Dockerfile.railway`: Vite static frontend, Express API, Nginx on port **8080**).

## What you get

- **ECR** — container registry  
- **ECS Fargate** — one service, public task IPs, pulls secrets from **SSM Parameter Store** (SecureString)  
- **Application Load Balancer** — HTTP on port 80 → tasks  
- **GitHub Actions** — on every push to `main`, build → push image (tag = git SHA + `latest`) → new task definition revision → service update  
- **No long-lived AWS keys in GitHub** — uses OIDC (`AWS_ROLE_TO_ASSUME`)

HTTPS (ACM certificate) and a custom domain are optional follow-ups; the live URL after apply is `http://<alb_dns_name>`.

## One-time: AWS CLI + Terraform

1. Install [Terraform](https://www.terraform.io/) and configure [AWS CLI](https://aws.amazon.com/cli/) with an admin or power-user profile.

2. Copy variables and edit:

   ```bash
   cd infra/aws/terraform
   cp terraform.tfvars.example terraform.tfvars
   # Set github_org, github_repo, aws_region as needed
   ```

3. **First image in ECR** — tasks need at least one image. After `terraform apply` (or once the ECR repo exists), from **repo root**:

   ```bash
   cd infra/aws/terraform
   REPO_URI="$(terraform output -raw ecr_repository_url)"
   REGION="$(terraform output -raw aws_region)"
   cd ../../..
   aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${REPO_URI%%/*}"
   docker build -f Dockerfile.railway -t "${REPO_URI}:latest" .
   docker push "${REPO_URI}:latest"
   ```

   If the service was already created without an image, run `terraform apply` again or `aws ecs update-service --force-new-deployment` after the push.

4. **SSM secrets** — create **SecureString** parameters (replace prefix if you changed `ssm_parameter_prefix`):

   ```bash
   PREFIX="/gametime/prod"   # must match var.ssm_parameter_prefix with leading /
   aws ssm put-parameter --name "${PREFIX}/JWT_SECRET" --type SecureString --value "$(openssl rand -hex 32)" --overwrite
   aws ssm put-parameter --name "${PREFIX}/DATA_ENCRYPTION_KEY" --type SecureString --value "$(openssl rand -hex 32)" --overwrite
   aws ssm put-parameter --name "${PREFIX}/DATABASE_URL" --type SecureString --value "postgresql://..." --overwrite
   aws ssm put-parameter --name "${PREFIX}/SUPABASE_URL" --type SecureString --value "https://xxx.supabase.co" --overwrite
   aws ssm put-parameter --name "${PREFIX}/SUPABASE_SERVICE_ROLE_KEY" --type SecureString --value "eyJ..." --overwrite
   aws ssm put-parameter --name "${PREFIX}/STRIPE_SECRET_KEY" --type SecureString --value "sk_..." --overwrite
   aws ssm put-parameter --name "${PREFIX}/STRIPE_WEBHOOK_SECRET" --type SecureString --value "whsec_..." --overwrite
   aws ssm put-parameter --name "${PREFIX}/ANTHROPIC_API_KEY" --type SecureString --value "sk-ant-..." --overwrite
   aws ssm put-parameter --name "${PREFIX}/FRONTEND_ORIGIN" --type SecureString --value "https://your-alb-or-domain.example" --overwrite
   ```

   For the bundled SPA, set `FRONTEND_ORIGIN` to the **browser origin** users hit (e.g. `http://your-alb-xxx.elb.amazonaws.com` until you add HTTPS + domain).

5. Apply:

   ```bash
   terraform init
   terraform apply
   ```

6. **GitHub** — repo **Settings → Secrets and variables → Actions**:
   - `AWS_ROLE_TO_ASSUME` = value of `terraform output -raw github_actions_role_arn`

7. **OIDC on GitHub** — **Settings → Actions → General → Workflow permissions**: enable **Read and write** (or minimum needed) and ensure OIDC is allowed (default for public repos).

8. Align `.github/workflows/aws-deploy.yml` env vars `AWS_REGION`, `PROJECT_NAME`, `ENVIRONMENT` with your Terraform `aws_region`, `project_name`, `environment`.

## Stripe webhooks

Point the webhook URL at your public host, for example:

- `https://<your-domain>/api/billing/webhook` (after ACM + DNS), or  
- `http://<alb_dns>/api/billing/webhook` for early testing (Stripe may require HTTPS for live mode).

## Terraform and CI ownership

- Terraform creates the **first** task definition and service.  
- **GitHub Actions** registers **new** task definition revisions (new image digest). Terraform ignores `container_definitions` and the service’s `task_definition` so applies do not roll back releases.

## Optional: HTTPS

Add an ACM certificate (us-east-1 if using CloudFront; same region as ALB for ALB-only), `aws_lb_listener` on 443, and DNS `A`/`AAAA` alias to the ALB.
