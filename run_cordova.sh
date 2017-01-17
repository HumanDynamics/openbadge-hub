#!/bin/sh
set -e # stop on errors
cd www/js

# add a variable to our index containing the git hash
cp index.js noGitIndex.js
echo window.gitRevision = \"$(git rev-parse --short HEAD)\"\; | cat - index.js > temp && mv temp index.js

coffee --compile mm.coffee
browserify index.js -o bundle.js
cd ../..

echo "Starting Cordova"
cordova run --device --stacktrace

cd www/js

rm bundle.js
rm mm.js

# forget our temporary index
mv noGitIndex.js index.js
