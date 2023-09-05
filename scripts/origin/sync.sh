#!/bin/bash
# Syncs the local /dist folder -> R2 bucket
# Usage: CF_ACCOUNT_ID=<account tag> ./sync.sh

ENDPOINT=https://$CF_ACCOUNT_TAG.r2.cloudflarestorage.com
DIST=/home/dist/

CACHE_PURGE_PATH=$(dirname "$0")/cache-purge.js

echo ---------------------------------
echo Syncing staging bucket
aws s3 sync $DIST s3://node-poc-staging/ --endpoint-url=$ENDPOINT --profile staging | $CACHE_PURGE_PATH node-poc-staging
echo ---------------------------------
echo Syncing prod bucket
aws s3 sync $DIST s3://node-poc-prod/ --endpoint-url=$ENDPOINT --profile prod | $CACHE_PURGE_PATH node-poc-prod
echo ---------------------------------
