#!/bin/bash

set -e

env=dev

docker run -u $(id -u) -v $PWD:/antora:Z --rm -t -e HOME=/antora antora/antora:3.1.10 npm i

# Only generating English
for lang in en; do
  echo "------- Generating $lang --------"
  rm -Rf output/$lang
  docker run -u $(id -u) -e CI=true -e env=local -v $PWD:/antora:Z --rm -t antora/antora:3.1.10 development-$lang-playbook.yml --attribute env=local
done
echo
