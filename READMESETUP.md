Set this up for the very first time working on the project
The setup will be broken down into 3 sections React Native Flask and PG DB

React Native:
	
	1. Install on homebrew for Mac users on terminal

	2. Install node and Homebrew
		- brew install node
		- brew install watchman

	3.0 Read through section 3.0 for Android targetted development, if not skip down to the 4.0 for iOS development

	3.1. Java Development Kit
		- brew install --cask zulu@17

		# Get path to where cask was installed to find the JDK installer
		# After the command above you should see something like this: 
		/opt/homebrew/Caskroom/zulu@17/<version number>

		# Navigate to the folder and double click on the file
		open /opt/homebrew/Caskroom/zulu@17/<version number>

		export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home

		# Verify with 
		echo $JAVA_HOME
		java -version 

		# You should see something like this 

		openjdk version "17.0.15" 2025-04-15
		OpenJDK Runtime Environment Homebrew (build 17.0.15+0)
		OpenJDK 64-Bit Server VM Homebrew (build 17.0.15+0, mixed mode, sharing)

	3.2. Install Android Studio and make sure to check these following options
		- Android SDK
		- Android SDK Platform
		- Android Virtual Device

		# and then click "Next" to all of these components.

	3.3. Install the Android SDK (IF YOU ARE NOT SEEING SOME OF THESE OPTIONS MAKE SURE TO CLICK "Show Package Details")
		# make sure to have specifically the "Android 15 (VanillaIceCream) SDK" 
		# and these following packages installed
		 - Android SDK Platform 35
		 - Choose one and check it depending on what you are using:
		 		a. Intel x86 Atom_64 System Image 
				b. Google APIs Intel x86 Atom System Image 
				c. (for Apple Silicon) Google API ARM 64 v8a System Image
		 - Under SDK Tools tab
		 		a. 35.0.0
		# Click Apply and install all the selected packages

	3.4. Configure the ANDROID_HOME environment variable in "~/.zprofile or ~/.zshrc"
		# === Java SDK Configuration ===
		export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
		export PATH=$JAVA_HOME/bin:$PATH

		# === Android SDK Configuration ===
		export ANDROID_HOME=$HOME/Library/Android/sdk
		export PATH=$PATH:$ANDROID_HOME/emulator
		export PATH=$PATH:$ANDROID_HOME/platform-tools

	3.5 Now run this command
		# source ~/.zprofile or source ~/.bash_profile for bash

	3.6 Create a new virtual device (from Virtual Device Manager) pick any device you want to use but make sure the image are the following
		# API 35 "VanillaIceCream"; Android 15.0

	3.7 You can verify if the emulator is working when using the command adb devices

	4.0 This section is for iOS targetted development, if you are interest in android targetted development please take a look at section 3.0

	4.1 Download Xcode from the app store
	
	5.0 Final part: Linking front and back
		# Run these following commands in the frontend dir
		npm install react-native-dotenv
		npm install metro-react-native-babel-preset
		npm install axios
	
	5.1 Create your Podfile, Gemfile and .env
		# Gemfile template
		curl -O https://raw.githubusercontent.com/react-native-community/template/refs/heads/0.78-stable/template/Gemfile

		# Podfile template
		curl -O https://raw.githubusercontent.com/react-native-community/template/refs/heads/0.78-stable/template/ios/Podfile

		# .env
		API_URL=http://(your local ip):5001
		# use this if you are unsure about the ip: ipconfig getifaddr en0



Flask:
	No action required (will update if required)

PG DB:
	1. Set up .env file in the root directory in this following format
		POSTGRES_USER= (your own user)
		POSTGRES_PASSWORD= (your own password)
		POSTGRES_DB= (your own db name)

	2. docker compose build, followed by docker compose up. 	

