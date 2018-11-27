## hb-backend
Backend for the hb-project.

## What is it for?
This server enables programmatic trading via Robinhood's public API.

## How does it work?
This project connects to a firebase real-time database. The database tracks jobs. Any time a job is added, this server picks it up and runs it, if possible. Finally, this server updates the database with the result of the job.