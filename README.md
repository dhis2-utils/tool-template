# DHIS2 App Template for Dummies
Basic DHIS2 app for simple tools.

> **WARNING**
> This tool is intended to be used by system administrators to perform specific tasks, it is not intended for end users. It is available as a DHIS2 app, but has not been through the same rigorous testing as normal core apps. It should be used with care, and always tested in a development environment.


## License
© Copyright University of Oslo 2026


## Getting started

### Install dependencies
To install app dependencies:

```
yarn install
```

### Compile to zip
To compile the app to a .zip file that can be installed in DHIS2:

```
yarn run zip
```

### Start dev server
To start the webpack development server:

```
yarn start
```

By default, webpack will start on port 8081, and assumes DHIS2 is running on
http://localhost:8080/dhis with `admin:district` as the user and password.

A different DHIS2 instance can be used to develop against by copying `.env.template` to `.env` and filling in the values:

```
DHIS2_BASE_URL=http://localhost:9000/dev

# Option 1: Personal Access Token (recommended for DHIS2 2.38+)
# Create one in DHIS2 under: Profile → Edit profile → Personal access tokens
DHIS2_API_TOKEN=your_token_here

# Option 2: Username and password
DHIS2_USERNAME=john_doe
DHIS2_PASSWORD=District1!
```

Token takes priority over username/password if both are set. `.env` is gitignored — never commit credentials.
