npm run build && npx cap sync && npx cap update ios && npx cap copy ios
cd ./ios/App
set -a
source .env
set +a
fastlane beta

