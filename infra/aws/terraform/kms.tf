# Default key used by SSM SecureString in most accounts.
data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}
