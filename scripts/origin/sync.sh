#!/bin/bash
# Syncs the local /dist folder -> R2 bucket
# Usage: CF_ACCOUNT_TAG=<account tag> ./sync.sh

ENDPOINT=https://$CF_ACCOUNT_TAG.r2.cloudflarestorage.com
DIST=/home/dist/

CACHE_PURGE_PATH=$(dirname "$0")/cache-purge.js

echo ---------------------------------
echo Syncing staging bucket
aws s3 sync $DIST s3://dist-staging/ --endpoint-url=$ENDPOINT --profile staging | $CACHE_PURGE_PATH dist-staging
echo ---------------------------------
echo Syncing prod bucket
aws s3 sync $DIST s3://dist-prod/ --endpoint-url=$ENDPOINT --profile prod | $CACHE_PURGE_PATH dist-prod
echo ---------------------------------
