#!/bin/bash
# Syncs the local /dist folder -> R2 bucket
# Usage: ./sync.sh <account tag>

ENDPOINT=https://$1.r2.cloudflarestorage.com
DIST=/home/dist/

aws s3 sync $DIST s3://node-poc-dev/ --endpoint-url=$ENDPOINT --profile staging
aws s3 sync $DIST s3://node-poc-prod/ --endpoint-url=$ENDPOINT --profile prod

if [[ -v DIST_WORKER_API_KEY ]]; 
    curl -X "DELETE" -H "x-api-key: $DIST_WORKER_API_KEY" https://nodejs.org/_cf/cache-purge
fi
