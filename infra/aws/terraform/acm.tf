# TLS certificate for the public API hostname (ACM DNS validation via Route 53 records in dns.tf).
resource "aws_acm_certificate" "api" {
  domain_name       = var.api_certificate_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn = aws_acm_certificate.api.arn

  validation_record_fqdns = [for r in values(aws_route53_record.api_acm_validation) : r.fqdn]

  timeouts {
    create = "45m"
  }
}
