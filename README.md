# RoundTable
### The Hub

The `RoundTable Hub` provides a way to connect a set of `RTBadge`s to the internet,
where they may interface with other `RoundTable Hub` platforms.

### Running locally

#### Installation
The following steps wokred in getting as working dev copy from a factory-fresh macOS Sierra.
- Install the "should come built in" stuff. (git, brew, node+npm)
- Download and Install Oracle's [JDK](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)
- Download [Andriod Studio](https://developer.android.com/studio/index.html), and install it using the defualt settings.
- Clone this repository, and cd into it
- Run `npm install -g ionic@2.2.1`
- Run `npm install -g cordova@^6.0.0`
- Run `npm install`
- Run `ionic platform add android`
- Run `cp www/js/private.js.template www/js/private.js`
- Insert APP_KEY into appropriate field. 
- On Ubuntu, you'll might need to install gradle: `sudo apt install gradle`
- Run `ionic run android --device`



#### Use
There are a variety of options available for local testing.

Testing on-computer:
- `ionic serve` creates a live reload app and opens in in your default browser.
 This will not have access to cordova plugins, but will have access to simulated test badges.
 Primarily useful for layout and styling.

 - `ionic run android --device` will attempt to run the app on a connected android device `-l` or `-r` can
 be used to create a live reload server for testing (this requires proper handling of CORS stuff, which may or may not be implemented depending on the backend).


#### Layout

Things like hardware and HTTP calls are to be accessed
through their respective services, in `www/js/services.js`.

Each `page`/`view`/whatever should have its own directory at `www/views/XXX`. This
directory should have an `XXX.controller.js` and an `XXX.template.html`. In the future
we probably ought to also have an `XXX.style.scss` too, but for now styles are in `/scss`.

We use the `SCSS` preprocess for styling.  

#### Style

We use predominantly `camelCase`, however callback functions, particularly those for
promises, are to be `snake_case`.

Committed files should pass jshint and be `atom-beautify`'d.
