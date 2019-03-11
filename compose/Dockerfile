FROM ubuntu:16.04

MAINTAINER Oren Lederman <orenled@mit.edu>

###########################
## general environment
RUN apt-get update && apt-get install -y \
  vim \
  wget

RUN mkdir -p /opt/downloads

WORKDIR /opt

####################
# Java
RUN \
  echo "oracle-java8-installer shared/accepted-oracle-license-v1-1 select true" | debconf-set-selections && \
  apt-get install -y software-properties-common && \
  add-apt-repository -y ppa:webupd8team/java && \
  apt-get update && \
  apt-get install -y oracle-java8-installer && \
  rm -rf /var/lib/apt/lists/* && \
  rm -rf /var/cache/oracle-jdk8-installer

  # Define commonly used JAVA_HOME variable
ENV JAVA_HOME /usr/lib/jvm/java-8-oracle

####################
# Node



####################
# download and extract android sdk
RUN wget http://dl.google.com/android/android-sdk_r24.2-linux.tgz -O downloads/android-sdk_r24.2-linux.tgz
RUN mkdir /opt/android-sdk-linux
RUN tar -C /opt -xf downloads/android-sdk_r24.2-linux.tgz

ENV ANDROID_HOME /opt/android-sdk-linux
ENV PATH $PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

RUN ( sleep 5 && while [ 1 ]; do sleep 1; echo y; done ) | /opt/android-sdk-linux/tools/android update sdk --no-ui -a --filter platform-tool,build-tools-23.0.1,android-19,android-22,android-23
RUN find /opt/android-sdk-linux -perm 0744 | xargs chmod 755

#ENV GRADLE_USER_HOME /src/gradle
#VOLUME /src
#WORKDIR /src

####################
# install Node
RUN wget https://deb.nodesource.com/setup_5.x -O downloads/setup_5.x
RUN \
  chmod 755 downloads/setup_5.x && \
  downloads/setup_5.x && \
  apt-get install -y nodejs

####################
# install cordova
RUN npm i -g cordova@5

###################
# Misc 
RUN \
  apt-get install -y git && \
  apt-get install -y lib32ncurses5 lib32z1 lib32stdc++6
