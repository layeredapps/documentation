# Documentation

This is the documentation generator for the [layeredapps.github.io repo](https://github.com/layeredapps/layeredapps.github.io).  

The documentation is generated from a combination of assets generated by Dashboard and its modules:

  1) screenshots from running unit tests with `GENERATE_SCREENSHOTS=true` and `SCREENSHOT_PATH=...`

  2) API responses from running unit tests with `GENERATE_RESPONSE=true` and `RESPONSE_PATH=...`

  3) generated `env.json` from starting server with `GENERATE_ENV_TXT=true`

  4) generated `api.json` from starting server with `GENERATE_API_TXT=true`

  5) generated `sitemap.json` from starting server with `GENERATE_SITEMAP_TXT=true`

The example app documentation is generated by the same methods, but running against the combination of Dashboard and relevant modules.

You can browse the generated documentation at [https://layeredapps.github.io](https://layeredapps.github.io) or at its [repository](https://github.com/layeredapps/layeredapps.github.io).

# Usage

First the documentation site repository must be cloned:

    $ git clone https://github.com/layeredapps/layeredapps.github.io documentation-site

Then the dashboard server is set up with the modules being documented.  The docuemntation will use their screenshots, API response files, `tests.txt` and `sitemap.txt` files for information to build the documentation.  The test suites must be run with specific environment variables to generate the screenshots and API responses.

The node testing suite `mocha` is required:

    $ npm install -g mocha

A copy of Dashboard with the modules to document must be created:

    $ mkdir dashboard-server
    $ cd dashboard-server
    $ npm init -y
    $ npm install @layeredapps/dashboard @layeredapps/maxmind-geoip @layeredapps/organizations @layeredapps/stripe-connect @layeredapps/stripe-subscriptions
    $ npm install puppeteer sqlite3
    $ NODE_ENV=testing \
      STORAGE=sqlite \
      SQLITE_DATABASE=dashboard \
      GENERATE_SCREENSHOTS=true \
      SCREENSHOT_PATH=/path/to/documentation-output-folder/screenshots \
      GENERATE_RESPONSE=true \
      RESPONSE_PATH=/path/to/documentation-output-folder \
      STRIPE_KEY=... \
      STRIPE_PUBLISHABLE_KEY=... \
      CONNECT_WEBHOOK_ENDPOINT_SECRET="needs a value but webhook will create automatically for test" \
      SUBSCRIPTIONS_WEBHOOK_ENDPOINT_SECRET="needs a value but webhook will create automatically for test" \
      PAYOUT_CURRENCY=stripe_account_currency \
      DISABLE_PAYOUT_TESTS=optionally_true \
      mocha --timeout 480000 --recursive --extension .test.js .

Then any example projects can be added if applicable:

    $ git clone https://github.com/layeredapps/example-web-app
    $ cd example-web-app/dashboard-server
    $ npm install
    $ npm install puppeteer sqlite3
    $ NODE_ENV=testing \
      STORAGE=sqlite \
      SQLITE_DATABASE=dashboard \
      GENERATE_SCREENSHOTS=true \
      SCREENSHOT_PATH=/path/to/documentation-output-folder/screenshots \
      GENERATE_RESPONSE=true \
      RESPONSE_PATH=/path/to/documentation-output-folder
      mocha --timeout 480000 --recursive --extension .test.js .

    $ git clone https://github.com/layeredapps/example-subscription-web-app
    $ cd example-subscription-web-app/dashboard-server
    $ npm install
    $ npm install puppeteer sqlite3
    $ NODE_ENV=testing \
      STORAGE=sqlite \
      SQLITE_DATABASE=dashboard \
      STRIPE_KEY=... \
      STRIPE_PUBLISHABLE_KEY=... \
      SUBSCRIPTIONS_WEBHOOK_ENDPOINT_SECRET="needs a value but webhook will create automatically for test" \
      GENERATE_SCREENSHOTS=true \
      SCREENSHOT_PATH=/path/to/documentation-output-folder/screenshots \
      GENERATE_RESPONSE=true \
      RESPONSE_PATH=/path/to/documentation-output-folder
      mocha --timeout 480000 --recursive --extension .test.js .

Then the documentation generator is run and it writes new HTML to the documentation site's folder.  You can pass as many examples as required.

    $ git clone https://github.com/layeredapps/documentation
    $ cd documentation
    $ DOCUMENTATION_PATH=/path/to/documentation-site \
      DASHBOARD_SERVER_PATH=/path/to/dashboard-server \
      EXAMPLE_DASHBOARD_SERVER_PATH1=/path/to/example-web-app/dashboard-server \
      EXAMPLE_DASHBOARD_SERVER_PATH2=/path/to/example-suscription-web-app/dashboard-server \
      node main.js

# Support and contributions

If you have encountered a problem post an issue on the appropriate [Github repository](https://github.com/layeredapps).  

If you would like to contribute check [Github Issues](https://github.com/layeredapps/dashboard) for ways you can help. 

For help using or contributing to this software join the freenode IRC `#layeredapps` chatroom - [Web IRC client](https://kiwiirc.com/nextclient/).

## License

This software is licensed under the MIT license, a copy is enclosed in the `LICENSE` file.  Included icon assets are licensed separately, refer to the `icons/licenses` folder for their licensing information.

Copyright (c) 2017 - 2020 Ben Lowry

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.