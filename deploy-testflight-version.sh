npm run build && npx cap sync && npx cap update ios && npx cap copy ios
cd ./ios/App
set -a
# pick up env var from .env file: FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD
source .env
set +a
fastlane beta

