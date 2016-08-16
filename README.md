# RoundTable
### The Hub

The `RoundTable Hub` provides a way to connect a set of `RTBadge`s to the internet,
where they may interface with other `RoundTable Hub` platforms and the `RoundTable.io`
video chat service.

#### Layout

All controllers are kept in `www/js/controllers.js`. These are to be used exclusively
for direct manipulation of the Model. Things like hardware and HTTP calls are to be accessed
through their respective services, in `www/js/services.js`.

We use the `SCSS` preprocess or for styling.  

#### Style

We use predominantly `camelCase`, however callback functions, particualrily those for
promises, are to be firstly **non-anonymous**, and secondly `snake_case`.

