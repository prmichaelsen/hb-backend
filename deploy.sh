#!/bin/sh
# Description
# Deploys code to target server

# create the .env file
rm .env && ./.env.default.sh

# build and test code locally
rm -rf node_modules
npm install
npm build
npm test
rm -rf node_modules

# clean up previous remote build
ssh $user@$server_ip << EOF
rm -rf ~/deploy
mkdir -p ~/deploy
exit
EOF

# put the code on the server
sftp $user@$server_ip << EOF
cd ~/deploy
put -r src
put .env
put package.json
put package-lock.json
put tsconfig.json
exit
EOF

# build and run the code
ssh $user@$server_ip << EOF
npm install
npm build
pm2 restart all
exit
EOF