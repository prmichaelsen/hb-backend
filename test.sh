#!/bin/sh
# Description
# Deploys code to target server

# create the .env file
./.env.default.sh

# build and test code locally
npm install || exit 1
npm run build || exit 1
npm test | exit 1