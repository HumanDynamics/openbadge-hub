# RoundTable App

##
* Install vnm. See - https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-16-04
* Install Node 5
* Install Cordova - npm install -g cordova@5.4.1 (https://cordova.apache.org/docs/en/latest/guide/cli/)
* Install Oracle Java 8 (9 doesn't seem to work well with this version of cordova/android platform)
* Install SDK tools. Looks like you'll need an old version - https://dl.google.com/android/repository/tools_r25.2.3-linux.zip
   * Runt he android command, and install platform tools, and SDK 19, 22, 23
   * Add the location of tools and platform-tools to the path
* Set JAVA_HOME and ANDROID_HOME

## Installation Instructions

To install, run the command

    $ ./init.sh

Then to run the app, run the command

    $ ./run_cordova

## Docker
To use docker for building, install Docker and Docker-compose on your machine. The build the container:

	$ docker-compose build

And login into a shell within the docker:

	$ docker-compose run --entrypoint /bin/bash openbadge-hub

Then run the init and run_cordova commands from the previous section