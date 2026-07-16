#!/bin/bash
# Provision a seeded DHIS2 broker instance and wait until /api answers.
# Usage: e2e/provision.sh <version:40|41|42|43> <name>
# Prints the devnet URL on success.
set -euo pipefail
VERSION="$1"
NAME="$2"
B="$DHIS2_BROKER_URL"
H="Authorization: Bearer $DHIS2_BROKER_TOKEN"

case "$VERSION" in
  40) SEED="dhis2-db-sierra-leone_V40.sql.gz" ;;
  41) SEED="dhis2-db-sierra-leone_v41.sql.gz" ;;
  42) SEED="dhis2-db-sierra-leone_v42.sql.gz" ;;
  43) SEED="dhis2-db-sierra-leone_v43.sql.gz" ;;
  *) echo "unknown version $VERSION" >&2; exit 1 ;;
esac

JOB=$(curl -s -X POST -H "$H" -d "{\"name\":\"$NAME\",\"version\":\"$VERSION\",\"seed\":\"$SEED\"}" "$B/instances" | python3 -c "import sys,json; print(json.load(sys.stdin)['job']['id'])")
echo "job: $JOB" >&2

# poll job to terminal state
for i in $(seq 1 120); do
  STATUS=$(curl -s -H "$H" "$B/jobs/$JOB" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  [ "$STATUS" = "succeeded" ] && break
  if [ "$STATUS" = "failed" ]; then
    curl -s -H "$H" "$B/jobs/$JOB" | python3 -c "import sys,json; j=json.load(sys.stdin); print(j.get('log_tail',''))" >&2
    exit 1
  fi
  sleep 10
done
[ "$STATUS" = "succeeded" ] || { echo "job did not finish: $STATUS" >&2; exit 1; }

URL="http://dhis2-$NAME:8080"
# wait for DHIS2 to answer
for i in $(seq 1 180); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -u local_admin:district "$URL/api/system/info.json" || true)
  [ "$CODE" = "200" ] && { echo "$URL"; exit 0; }
  sleep 10
done
echo "instance never answered on /api (last code $CODE)" >&2
exit 1
