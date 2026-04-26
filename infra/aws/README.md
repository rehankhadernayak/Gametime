# AWS: ECS Fargate + ALB + GitHub Actions (OIDC)

This stack runs the **same production image as Railway** (`Dockerfile.railway`: Vite static frontend, Express API, Nginx on port **8080**).

## What you get

- **ECR** — container registry  
- **ECS Fargate** — one service, public task IPs, pulls secrets from **SSM Parameter Store** (SecureString)  
- **Application Load Balancer** — HTTP on port 80 → tasks  
- **GitHub Actions** — on every push to `main`, build → push image (tag = git SHA + `latest`) → new task definition revision → service update  
- **No long-lived AWS keys in GitHub** — uses OIDC (`AWS_ROLE_TO_ASSUME`)

HTTPS (ACM certificate) and a custom domain are optional follow-ups; the live URL after apply is `http://<alb_dns_name>`.

### GitHub OIDC provider already exists?

AWS allows **one** IAM OIDC provider per account for `https://token.actions.githubusercontent.com`. If another stack already created it, set in `terraform.tfvars`:

```hcl
existing_github_oidc_provider_arn = "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
```

Find the ARN in **IAM → Identity providers** (or `aws iam list-open-id-connect-providers`). When this variable is non-empty, Terraform **does not** create `aws_iam_openid_connect_provider.github` and the GitHub Actions role still trusts that provider.

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

   Set `FRONTEND_ORIGIN` to the **browser origin** users hit. After you add HTTPS + a hostname, use `https://api.yourdomain.com` (or your Vercel URL if the browser never talks to the ALB origin directly).

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

Stripe **live** endpoints require **HTTPS**. Use `https://<your-hostname>/api/billing/webhook` after ACM + DNS (below). For local or dashboard testing, use **Stripe CLI** forwarding.

## HTTPS: ACM, DNS, and `FRONTEND_ORIGIN`

You need **a hostname you control** (any registrar or DNS: Route 53, Cloudflare, Namecheap, Google Domains, etc.). The repo does not know whether you already own a domain; if you do, request a public ACM certificate in the **same region as the ALB** (e.g. `ap-southeast-1`) for `api.example.com`, validate via **DNS** (CNAME records ACM gives you), then add an **ALB listener on 443** with that certificate and point your DNS **A/AAAA alias** (Route 53) or **CNAME** (other DNS) to the ALB. Finally:

1. Stripe webhook URL → `https://api.example.com/api/billing/webhook`  
2. Update SSM `FRONTEND_ORIGIN` if the browser origin changed (e.g. your Vercel app URL or the HTTPS API host, depending on how you front the app).

Terraform does not yet create the ACM listener or Route 53 records; add those in a follow-up module or by hand once the certificate is issued.

## Terraform and CI ownership

- Terraform creates the **first** task definition and service.  
- **GitHub Actions** registers **new** task definition revisions (new image digest). Terraform ignores `container_definitions` and the service’s `task_definition` so applies do not roll back releases.

## Optional: CloudFront in front of the ALB

If you put **CloudFront** in front of the ALB, request the ACM certificate in **us-east-1** (CloudFront requirement). For **ALB-only** TLS, keep the certificate in the **ALB region**.
