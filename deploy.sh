#!/bin/sh
# Description
# Deploys code to target server

# create the .env file
./.env.default.sh

# build and test code locally
npm install
npm build
npm test

# start agent
eval `ssh-agent -s`
chmod 700 ~/.ssh
chmod 600 ~/.ssh/*
ssh-add ~/.ssh/hb-backend-dev

# clean up previous remote build
ssh $user@$server_ip << EOF
echo rm -rf ~/deploy
echo mkdir -p ~/deploy
echo exit
EOF

# put the code on the server
sftp $user@$server_ip << EOF
echo lcd ~/deploy
echo put -r src
echo put .env
echo put package.json
echo put package-lock.json
echo put tsconfig.json
echo exit
EOF

# build and run the code
ssh $user@$server_ip << EOF
echo cd ~/deploy
echo npm install
echo npm build
echo pm2 restart all
echo exit
EOF