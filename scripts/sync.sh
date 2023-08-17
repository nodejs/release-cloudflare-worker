#!/bin/bash
# Syncs the local /dist folder -> R2 bucket
# Usage: ./sync.sh <account tag>

ENDPOINT=https://$1.r2.cloudflarestorage.com
DIST=../dist

aws s3 sync $DIST s3://node-poc-dev/ --endpoint-url=$ENDPOINT --profile staging
aws s3 sync $DIST s3://node-poc-prod/ --endpoint-url=$ENDPOINT --profile prod
