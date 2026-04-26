resource "aws_acm_certificate" "api" {
  domain_name       = "api.gametime-app.org"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn = aws_acm_certificate.api.arn

  validation_record_fqdns = [for r in aws_route53_record.api_acm_validation : r.fqdn]
}
