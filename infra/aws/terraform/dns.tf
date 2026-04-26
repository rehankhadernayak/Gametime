data "aws_route53_zone" "gametime_app_org" {
  name         = "gametime-app.org."
  private_zone = false
}

resource "aws_route53_record" "api_acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.gametime_app_org.zone_id
}

resource "aws_route53_record" "api_alias" {
  zone_id = data.aws_route53_zone.gametime_app_org.zone_id
  name    = "api.gametime-app.org"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
