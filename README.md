## hb-backend
Backend for the hb-project.

## What is it for?
This server enables programmatic trading via Robinhood's public API.

## How does it work?
This project connects to a firebase real-time database. The database tracks jobs. Any time a job is added, this server picks it up and runs it, if possible. Finally, this server updates the database with the result of the job.

## How do I run it locally?
Message me and I can provide you with the `.env` config required to run this application for local development. After you have the config, simply run `npm run start`.

## How do I deploy it?
Updates to the server are automatically deployed when a pull request is merged to `master`. CI/CD is set up with Jenkins. Ask me if you're interested in how this works. Currently, collaborators cannot see detailed build information. Ask me if you want to see this.
