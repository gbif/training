#!/bin/bash

set -e

env=dev

# Only generating English
for lang in en; do
  echo "------- Generating $lang --------"
  rm -Rf output/$lang
  docker run -u $(id -u) -e CI=true -v $PWD:/antora:Z --rm -t antora/antora:3.1.2 development-$lang-playbook.yml
done
echo
