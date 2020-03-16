@ECHO OFF
SET dlurl=https://fhir.github.io/latest-ig-publisher/org.hl7.fhir.publisher.jar
SET publisher_jar=org.hl7.fhir.publisher.jar
SET input_cache_path=%CD%\input-cache\

FOR %%x IN ("%CD%") DO SET upper_path=%%~dpx

IF NOT EXIST "%input_cache_path%%publisher_jar%" (
	IF NOT EXIST "%upper_path%%publisher_jar%" (
		SET jarlocation="%input_cache_path%%publisher_jar%"
		SET jarlocationname=Input Cache
		ECHO IG Publisher is not yet in input-cache or parent folder.
		REM we don't use jarlocation below because it will be empty because we're in a bracketed if statement
		GOTO create
	) ELSE (
		ECHO IG Publisher FOUND in parent folder
		SET jarlocation="%upper_path%%publisher_jar%"
		SET jarlocationname=Parent folder
		GOTO:upgrade
	)
) ELSE (
	ECHO IG Publisher FOUND in input-cache
	SET jarlocation="%input_cache_path%%publisher_jar%"
	SET jarlocationname=Input Cache
	GOTO:upgrade
)

:create
ECHO Will place publisher jar here: %input_cache_path%%publisher_jar%
SET /p create="Ok? (Y/N)"
IF /I "%create%"=="Y" (
	MKDIR "%input_cache_path%" 2> NUL
	GOTO:download
)
GOTO:done

:upgrade
SET /p overwrite="Overwrite %jarlocation%? (Y/N)"
IF /I "%overwrite%"=="Y" (
	GOTO:download
)
GOTO:done

:download
ECHO Downloading most recent publisher to %jarlocationname% - it's ~100 MB, so this may take a bit

FOR /f "tokens=4-5 delims=. " %%i IN ('ver') DO SET VERSION=%%i.%%j
IF "%version%" == "10.0" GOTO win10
IF "%version%" == "6.3" GOTO win8.1
IF "%version%" == "6.2" GOTO win8
IF "%version%" == "6.1" GOTO win7
IF "%version%" == "6.0" GOTO vista

ECHO Unrecognized version: %version%
GOTO done

:win10
CALL POWERSHELL -command if ('System.Net.WebClient' -as [type]) {(new-object System.Net.WebClient).DownloadFile(\"%dlurl%\",\"%jarlocation%\") } else { Invoke-WebRequest -Uri "%dlurl%" -Outfile "%jarlocation%" }

GOTO done

:win7
CALL bitsadmin /transfer GetPublisher /download /priority normal "%dlurl%" "%jarlocation%"
GOTO done

:win8.1
:win8
:vista
ECHO This script does not yet support Windows %winver%.  Please ask for help on http://chat.fhir.org
GOTO done

:done
PAUSE