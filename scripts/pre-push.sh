#!/bin/sh

# Run the following command in the root of your project to install this pre-push hook:
# cp scripts/pre-push.sh .git/hooks/pre-push; chmod 700 .git/hooks/pre-push

yarn push

exit 0
