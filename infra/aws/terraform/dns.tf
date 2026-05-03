data "aws_route53_zone" "main" {
  name         = var.route53_zone_name
  private_zone = false
}

# ACM certificate DNS validation (one record per domain validation option).
resource "aws_route53_record" "api_acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  allow_overwrite = true
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
}

# Public API hostname → ALB
resource "aws_route53_record" "api_alias" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.api_certificate_domain
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
