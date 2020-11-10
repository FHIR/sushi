#!/bin/bash

template="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )/template.html"
localApp="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )/../src/app.ts"
allRepos="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )/all-repos.txt"
input="${1:-$allRepos}"
version1="${2:-github:fhir/sushi}"
version2="${3:-local}"
output="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )/output"

echo "Running SUSHI regression with"
echo "  - input:    $input"
echo "  - version1: $version1"
echo "  - version2: $version2"
echo "  - output:   $output"

if [[ -d "$output" ]]
then
  echo ""
  read -p "The $output folder exists. Do you wish to delete it? (y/N) " -n 1 -r
  if [[ $REPLY =~ ^[Yy]$ ]]
  then
    rm -rf $output
    echo ""
  else
    echo ""
    echo "Cannot run regression using an existing output folder.  Exiting."
    exit 1
  fi
fi

mkdir -p "$output"
echo "<html><body><table><thead><tr><th>Repo</th><th>Diff</th><th>Log 1</th><th>Log 2</th><th>Time (sec)</th></tr></thead><tbody>" > "$output/index.html"

# read the repo text file one line at a time
while read repo; do
cd "$output"
if [[ $repo =~ ^(git@github\.com:|git://github\.com/|https://github\.com/)(.*)/([^/]+)\.git$ ]]; then
  echo ""
  name="${BASH_REMATCH[2]}-${BASH_REMATCH[3]}"
  version1output="$(tr [/:\#] '-' <<<sushi-$version1)"
  version2output="$(tr [/:\#] '-' <<<sushi-$version2)"
  starttime=$(date +%s)

  echo "Process $repo"

  mkdir "$name"
  # copy the html2diff template, replacing NAME w/ the repo name
  while read line; do
      echo ${line//NAME/${BASH_REMATCH[2]}\/${BASH_REMATCH[3]}}
  done < "$template" > "$name/template.html"
  cd "$name"

  echo "  - Create $name/$version1output"
  git clone "$repo" -q "$version1output"

  echo "  - Create $name/$version2output"
  cp -r "$version1output" "$version2output"

  echo "  - Run SUSHI $version1"
  cd "$version1output"
  if [[ $version1 =~ ^local$ ]]
  then
    ts-node "$localApp" . >> "../$version1output.log" 2>&1
  else
    npx -q "fsh-sushi@$version1" . >> "../$version1output.log" 2>&1
  fi

  if [ $? -eq 0 ]
  then
    log1="<span style=\"color: green\">$version1output.log</span>"
  else
    log1="<span style=\"color: red\">$version1output.log</span>"
  fi
  cd ..

  echo "  - Run SUSHI $version2"
  cd "$version2output"
  if [[ $version2 =~ ^local$ ]]
  then
    ts-node "$localApp" . >> "../$version2output.log" 2>&1
  else
    npx -q "fsh-sushi@$version2" . >> "../$version2output.log" 2>&1
  fi
  if [ $? -eq 0 ]
  then
    log2="<span style=\"color: green\">$version2output.log</span>"
  else
    log2="<span style=\"color: red\">$version2output.log</span>"
  fi
  cd ..

  printf "  - Compare output"
  diff -urN "$version1output" "$version2output" > "$name.diff"
  if [ -s "$name.diff" ]
  then
    printf ": CHANGED"
    npx -q diff2html -i file -s side --hwt template.html -F "$name-diff-report.html" -- "$name.diff"
    result="<a href=\"$name/$name-diff-report.html\">$name-diff-report.html</a>"
  else
    printf ": SAME"
    result="n/a"
  fi
  rm template.html

  endtime=$(date +%s)
  elapsed=$(($endtime - $starttime))
  echo " ($elapsed seconds)"

  cd ..

  echo "<tr><td style=\"padding: 10px;\">$repo</td><td style=\"padding: 10px;\">$result</td><td style=\"padding: 10px;\"><a href=\"$name/$version1output.log\">$log1</a></td><td style=\"padding: 10px;\"><a href=\"$name/$version2output.log\">$log2</a></td><td style=\"padding: 10px;\">$elapsed</td></tr>" >> index.html
fi
cd ..
done < "$input"

echo "</tbody></table></body></html>" >> "$output/index.html"
npx -q opener "$output/index.html"

echo ""
echo "DONE"
