# RoundTable
### The Hub

The `RoundTable Hub` provides a way to connect a set of `RTBadge`s to the internet,
where they may interface with other `RoundTable Hub` platforms.

### Running locally

There are a variety of options available for local testing.

Testing on-computer:
- `ionic serve` creates a live reload app and opens in in your default browser.
 This will not have access to cordova plugins, but will have access to simulated test badges.
 Primarily useful for layout and styling.

 - `ionic run android --device` will attempt to run the app on a connected android device `-l` or `-r` can
 be used to create a live reload server for testing.


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
