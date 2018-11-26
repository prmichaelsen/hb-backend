#!/bin/sh
# Description
# Deploys code to target server

# create the .env file
./.env.default.sh

# build and test code locally
npm install
npm build
npm test