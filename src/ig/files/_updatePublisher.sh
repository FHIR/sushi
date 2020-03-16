#!/bin/bash
dlurl=https://fhir.github.io/latest-ig-publisher/org.hl7.fhir.publisher.jar
publisher_jar=org.hl7.fhir.publisher.jar
input_cache_path=./input-cache/

set -e
if ! type "curl" > /dev/null; then
	echo "ERROR: Script needs curl to download latest IG Publisher. Please install curl."
	exit 1
fi

publisher="$input_cache_path$publisher_jar"
if test -f "$publisher"; then
	echo "IG Publisher FOUND in input-cache"
	jarlocation="$publisher"
	jarlocationname="Input Cache"
	upgrade=true
else
	publisher="../$publisher_jar"
	upgrade=true
	if test -f "$publisher"; then
		echo "IG Publisher FOUND in parent folder"
		jarlocation="$publisher"
		jarlocationname="Parent Folder"
		upgrade=true
	else
		echo IG Publisher NOT FOUND in input-cache or parent folder...
		jarlocation=$input_cache_path$publisher_jar
		jarlocationname="Input Cache"
		upgrade=false
	fi
fi

if "$upgrade"; then
	message="Overwrite $jarlocation? (Y/N) "
else
	echo Will place publisher jar here: "$jarlocation"
	message="Ok? (Y/N) "
fi

read -r -p "$message" response
if [[ "$response" =~ ^([yY])$ ]]; then
	echo "Downloading most recent publisher to $jarlocationname - it's ~100 MB, so this may take a bit"
#	wget "https://fhir.github.io/latest-ig-publisher/org.hl7.fhir.publisher.jar" -O "$jarlocation" 
	curl $dlurl -o "$jarlocation" --create-dirs
else
	echo cancel...
fi