@MKDIR input-cache
@ECHO "Downloading most recent publisher - it's ~100 MB, so this may take a bit
@POWERSHELL -command (new-object System.Net.WebClient).DownloadFile(\"https://fhir.github.io/latest-ig-publisher/org.hl7.fhir.publisher.jar\",\"input-cache\org.hl7.fhir.publisher.jar\")
@ECHO "Done"
@PAUSE