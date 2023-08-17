#!/bin/bash
# Script for setting up the AWS cli for R2

if ! [ -x "$(command -v aws)" ]; then
    echo "AWS shell (https://github.com/awslabs/aws-shell) not installed, please run 'pip install aws'"
    exit 1
fi

echo Note: only the AWS Access Key ID and AWS Secret Access Key fields are needed
echo ---------------------------------
echo Configure staging
aws configure --profile staging
echo ---------------------------------
echo Configure prod
aws configure --profile prod
echo ---------------------------------
