Set this up for the very first time working on the project
The setup will be broken down into 3 sections React Native Flask and PG DB

Expo Go:
	1. Download the expo go application on App/Google Play store.

	2. Navigate to the PhysioBuddy/Physiobuddy/ dir and run
		2.1 run the command  "npm install"
		2.2 create an env file and include (Check your ip addr and fill in accordingly)
		"EXPO_PUBLIC_API_URL=http://192.168.x.x:5001"

	3. Run either commands depending on what you require (in the same directory).
		Emulators:
			- npm run android
			- npm run ios
			- npm run web

		or 

		For Expo go mobile application
			- npx expo start

Flask:
	No action required (will update if required)

PG DB:
	1. Set up .env file in the root directory in this following format
		POSTGRES_USER= (your own user)
		POSTGRES_PASSWORD= (your own password)
		POSTGRES_DB= (your own db name)

	2. docker compose build, followed by docker compose up. 	

