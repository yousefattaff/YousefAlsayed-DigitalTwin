# Terraform Remote State Bootstrap
# Run this ONCE to create the S3 bucket and DynamoDB table for remote state

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  # Uses AWS CLI configuration
}

variable "state_bucket_name" {
  description = "S3 bucket name for Terraform state"
  type        = string
  default     = "yousef-twin-terraform-state"
}

variable "lock_table_name" {
  description = "DynamoDB table name for state locking"
  type        = string
  default     = "terraform-lock"
}

# S3 bucket for Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "Terraform State"
    ManagedBy   = "terraform-bootstrap"
    Project     = "yousef-digital-twin"
  }
}

# Enable versioning so we can see the full revision history
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption by default
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access to the state bucket
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_lock" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "Terraform Lock Table"
    ManagedBy   = "terraform-bootstrap"
    Project     = "yousef-digital-twin"
  }
}

output "state_bucket_arn" {
  value = aws_s3_bucket.terraform_state.arn
}

output "lock_table_arn" {
  value = aws_dynamodb_table.terraform_lock.arn
}

output "backend_config" {
  value = <<-EOT

    # Add this to your main terraform/versions.tf:
    terraform {
      backend "s3" {
        bucket         = "${var.state_bucket_name}"
        key            = "twin/terraform.tfstate"
        region         = "eu-north-1"
        encrypt        = true
        dynamodb_table = "${var.lock_table_name}"
      }
    }
  EOT
}
