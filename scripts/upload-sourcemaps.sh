#!/usr/bin/env bash

# Uploads a build's sourcemaps to Sentry so we can get a usable stacktrace when
# errors happen.

if [ -x "X$SENTRY_ORG" = "X" ]; then
    echo "SENTRY_ORG missing"
    exit 1
fi

if [ -x "X$SENTRY_PROJECT" = "X" ]; then
    echo "SENTRY_PROJECT missing"
    exit 1
fi

SENTRY_RELEASE=$(npx sentry-cli releases propose-version)

echo Creating release $SENTRY_RELEASE

npx sentry-cli releases new $SENTRY_RELEASE
    --org=$SENTRY_ORG
    --project=$SENTRY_PROJECT

npx sentry-cli sourcemaps upload \
    --org=$SENTRY_ORG \
    --project=$SENTRY_PROJECT \
    --release=$SENTRY_RELEASE \
    --strip-prefix 'dist/..' dist
