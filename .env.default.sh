#!/bin/sh
# Description
# Builds a .env for the node process to read.
# This takes real environment variables defined in the
# build environment and saves them to a local .env file.

# create the .env
cat << EOF > .env
# firebase configuration
firebase_type="$firebase_type"
firebase_project_id="$firebase_project_id"
firebase_private_key_id="$firebase_private_key_id"
firebase_private_key="$firebase_private_key"
firebase_client_email="$firebase_client_email"
firebase_client_id="$firebase_client_id"
firebase_auth_uri="$firebase_auth_uri"
firebase_token_uri="$firebase_token_uri"
firebase_auth_provider_x509_cert_url="$firebase_auth_provider_x509_cert_url"
firebase_client_x509_cert_url="$firebase_client_x509_cert_url"

# tradier
tradier_access_token="$tradier_access_token"
EOF