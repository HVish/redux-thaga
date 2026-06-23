VERSION=$(npm run version --silent);
FILE=hvish-redux-thaga-$VERSION.tgz;

rm -f hvish-redux-thaga-*.tgz;

echo "Creating build for $FILE";
npm run build;
npm pack;

cd integration-test;

echo "removing previous version";
npm remove @hvish/redux-thaga;

echo "installing $VERSION(latest) version";
npm install -f file:../$FILE;
