#!/bin/sh
# Description
# Deploys code to target server

# create the .env file
./.env.default.sh

# build and test code locally
npm install || exit 1
npm run build || exit 1
npm test || exit 1

# start agent
eval `ssh-agent -s`
chmod 700 ~/.ssh
chmod 600 ~/.ssh/*
ssh-add ~/.ssh/hb-backend-dev

# clean up previous remote build
ssh $user@$server_ip << EOF
pm2 stop server
rm -rf ~/*
exit
EOF

# put the code on the server
sftp $user@$server_ip << EOF
put -r src
put .env
put package.json
put package-lock.json
put tsconfig.json
put $HOME/.npmrc .npmrc
exit
EOF

# build and run the code
ssh $user@$server_ip << EOF
npm install
npm run build
pm2 start ~/dist/index.js --name server
pm2 restart all
pm2 startup
exit
EOF

exit 0