#!/usr/bin/env sh

# INFO: Copies README.md to the library directory

main() {
  printf "Copying README.md to ./projects/fluig-dataset ...\n"

  rm -f ./projects/fluig-dataset/README.md
  cp -v ./README.md ./projects/fluig-dataset/README.md

  printf "Copying README.md to ./projects/fluig-dataset ... DONE\n"
}

main "${@}"
