#!/bin/bash
set -e
if ! type "curl" > /dev/null; then
  echo "ERROR: Script needs curl to download latest IG Publisher. Please install curl."
  exit 1
fi
echo "Downloading most recent publisher - it's ~100 MB, so this may take a bit"
curl https://fhir.github.io/latest-ig-publisher/org.hl7.fhir.publisher.jar -o input-cache/org.hl7.fhir.publisher.jar --create-dirs
echo "Done"