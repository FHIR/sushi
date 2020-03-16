#!/bin/bash
publisher_jar=org.hl7.fhir.publisher.jar
input_cache_path=./input-cache/
set -e
echo Checking internet connection...
curl -sSf tx.fhir.org > /dev/null

if [ $? -eq 0 ]; then
	echo "Online"
	txoption=""
else
	echo "Offline"
	txoption="-tx n/a"
fi

echo "$txoption"

publisher=$input_cache_path/$publisher_jar
if test -f "$publisher"; then
	JAVA -jar $publisher -ig ig.ini $txoption $*

else
	publisher=../$publisher_jar
	if test -f "$publisher"; then
		JAVA -jar $publisher -ig ig.ini $txoption $*
	else
		echo IG Publisher NOT FOUND in input-cache or parent folder.  Please run _updatePublisher.  Aborting...
	fi
fi