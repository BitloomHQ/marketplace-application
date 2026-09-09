#!/usr/bin/env bash
set -e

pip install -r requirements.txt

# Neon (serverless Postgres) suspends its compute after a few minutes of
# inactivity. The first query after a deploy can wake a suspended compute,
# and the connection is sometimes reset mid-transition ("SSL connection has
# been closed unexpectedly") before the compute is fully up. Retry with a
# short backoff so a cold start doesn't fail the whole deploy.
attempt=1
max_attempts=3
until python manage.py migrate --noinput; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "migrate failed after $max_attempts attempts"
    exit 1
  fi
  echo "migrate attempt $attempt failed (likely Neon cold start), retrying in 5s..."
  attempt=$((attempt + 1))
  sleep 5
done
